import { volunteerOptions } from "@/lib/data/volunteer-options";
import { receiveSubmission } from "@/lib/server/sheet-submissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return receiveSubmission(request, "Volunteer!A:H", ({ text, choices }) => [
    text("name", "Name", 200),
    text("phone", "Phone number", 30, { type: "phone" }),
    text("email", "Email", 254, { type: "email" }),
    text("company", "Company", 200, { optional: true }),
    text("subject", "Subject", 200),
    choices("volunteer_interest", volunteerOptions),
    text("question", "Question", 5000),
  ]);
}
