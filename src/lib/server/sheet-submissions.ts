import { auth, sheets } from "googleapis/build/src/apis/sheets";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return /^\+?[\d().\s-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

export async function receiveSubmission(request: Request, range: string, getValues: (fields: {
  text: (name: string, label: string, maxLength: number, options?: {
    optional?: boolean;
    type?: "email" | "phone";
  }) => string;
  choices: (name: string, allowed: string[]) => string;
}) => string[]) {
  if (Number(request.headers.get("content-length")) > 32_768) {
    return Response.json({ error: "This submission is too large." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "The form could not be read. Please try again." }, { status: 400 });
  }

  const details: string[] = [];
  const values = getValues({
    text(name, label, maxLength, { optional = false, type } = {}) {
      const entry = form.get(name);
      const value = typeof entry === "string" ? entry.trim() : "";

      if (entry !== null && typeof entry !== "string") details.push(`${label} must be text.`);
      else if (!value && !optional) details.push(`${label} is required.`);
      else if (value.length > maxLength) details.push(`${label} must be ${maxLength} characters or fewer.`);
      else if (value && type === "email" && !emailPattern.test(value)) details.push("Enter a valid email address.");
      else if (value && type === "phone" && !isPhone(value)) details.push("Enter a valid phone number with 7 to 15 digits.");

      return value;
    },
    choices(name, allowed) {
      const selected = form.getAll(name);
      if (!selected.length || selected.some((entry) => typeof entry !== "string" || !allowed.includes(entry))) {
        details.push("Select at least one volunteer interest from the list.");
      }
      return allowed.filter((option) => selected.includes(option)).join(", ");
    },
  });

  if (details.length) {
    return Response.json({ error: "Please check the following fields.", details }, { status: 400 });
  }

  const { GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } = process.env;
  if (!GOOGLE_SHEETS_SPREADSHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    console.error("Google Sheets submission configuration is missing.");
    return Response.json({ error: "We couldn't send your submission. Please try again later." }, { status: 503 });
  }

  try {
    const client = new auth.JWT({
      email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    await sheets({ version: "v4", auth: client }).spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [[new Date().toISOString(), ...values]] },
    }, { timeout: 10_000, retry: false });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Google Sheets append failed.", {
      status: (error as { response?: { status?: number } })?.response?.status,
    });
    return Response.json({ error: "We couldn't send your submission. Please try again later." }, { status: 502 });
  }
}
