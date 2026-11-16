"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

type Props = {
  endpoint: string;
  className: string;
  buttonClassName: string;
  buttonRowClassName?: string;
  buttonLabel: string;
  successMessage: string;
  children: ReactNode;
};

type Feedback =
  | { status: "idle" | "sending" | "success" }
  | { status: "error"; message: string; details?: string[] };

const sendError = "We couldn't send your submission. Please try again.";

export default function SubmissionForm({
  endpoint,
  className,
  buttonClassName,
  buttonRowClassName,
  buttonLabel,
  successMessage,
  children,
}: Props) {
  const [feedback, setFeedback] = useState<Feedback>({ status: "idle" });
  const pending = useRef(false);
  const sending = feedback.status === "sending";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;

    const form = event.currentTarget;
    pending.current = true;
    setFeedback({ status: "sending" });

    try {
      const response = await fetch(endpoint, { method: "POST", body: new FormData(form) });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setFeedback({ status: "error", message: result.error ?? sendError, details: result.details });
        return;
      }

      form.reset();
      setFeedback({ status: "success" });
    } catch {
      setFeedback({ status: "error", message: sendError });
    } finally {
      pending.current = false;
    }
  }

  const button = (
    <button className={buttonClassName} type="submit" disabled={sending}>
      {sending ? "Sending…" : buttonLabel}
    </button>
  );

  return (
    <form action={endpoint} method="post" encType="multipart/form-data" className={className} onSubmit={submit}>
      {children}
      {buttonRowClassName ? <div className={buttonRowClassName}>{button}</div> : button}
      {feedback.status === "error" && (
        <div role="alert" className="text-sm text-red-800">
          <p>{feedback.message}</p>
          {feedback.details?.length ? (
            <ul className="mt-1 list-disc pl-5">
              {feedback.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          ) : null}
        </div>
      )}
      <div role="status" className={feedback.status === "idle" || feedback.status === "error" ? "sr-only" : "text-sm"}>
        {sending && "Sending your submission…"}
        {feedback.status === "success" && successMessage}
      </div>
    </form>
  );
}
