import { receiveSubmission } from "@/lib/server/sheet-submissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return receiveSubmission(request, "Sheet1!A:F", ({ text }) => {
    const firstName = text("firstName", "First name", 100);
    const lastName = text("lastName", "Last name", 100);
    const phone = text("phone", "Phone number", 30, { optional: true, type: "phone" });
    const email = text("email", "Email", 254, { type: "email" });
    const subject = text("subject", "Subject", 200, { optional: true });
    const message = text("message", "Message", 5000);

    return [firstName, lastName, phone, email, subject ? `Subject: ${subject}\n\n${message}` : message];
  });
}
