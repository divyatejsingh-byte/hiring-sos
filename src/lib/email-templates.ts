import { ROLE_TITLES, type Candidate, type EmailKind } from "./types";

const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || "Kargo";
const SENDER = process.env.NEXT_PUBLIC_SENDER_NAME || `The ${COMPANY} Team`;
const SCHEDULING_URL = process.env.NEXT_PUBLIC_SCHEDULING_URL || "";

export function buildEmail(kind: EmailKind, candidate: Candidate): { subject: string; body: string } {
  const firstName = candidate.result.contact.name.split(/\s+/)[0] || "there";
  const roleTitle = ROLE_TITLES[candidate.role];

  if (kind === "invite") {
    const scheduling = SCHEDULING_URL
      ? `Please pick a 45-minute slot that works for you here: ${SCHEDULING_URL}`
      : "Could you reply with two or three 45-minute windows that work for you over the next week?";
    return {
      subject: `Interview invitation: ${roleTitle} at ${COMPANY}`,
      body: `Hi ${firstName},

Thank you for applying for the ${roleTitle} role at ${COMPANY}. We enjoyed reading about your experience and would love to continue the conversation.

The next step is a 45-minute conversation with our founding team. We'll dig into the operational problems you've worked on, how you made the key calls, and what you'd want to build here.

${scheduling}

Looking forward to speaking with you.

Best,
${SENDER}`,
    };
  }

  return {
    subject: `Your application for ${roleTitle} at ${COMPANY}`,
    body: `Hi ${firstName},

Thank you for your interest in the ${roleTitle} role at ${COMPANY} and for the time you put into your application.

After careful review, we've decided not to move forward with your candidacy for this position. This was a considered decision based on the specific needs of the role right now, and it isn't a judgement of your overall ability.

We'd be glad to keep your details on file and reach out if a role opens up that's a closer match.

Wishing you the very best in your search.

Warm regards,
${SENDER}`,
  };
}
