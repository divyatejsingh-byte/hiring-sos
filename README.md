# Hiring SOS

Screen a batch of PDF/DOCX resumes against `rubric.txt` with Gemini, review ranked candidates, and send interview invites or rejections through Resend in one click.

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev                  # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Resume screening |
| `GEMINI_MODEL` | Defaults to `gemini-3.8-flash` |
| `RESEND_API_KEY` | Email delivery |
| `RESEND_FROM_EMAIL` | Must be on a domain verified in Resend. `onboarding@resend.dev` only delivers to your own Resend account address. |
| `RESEND_REPLY_TO` | Optional reply-to address |
| `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_SENDER_NAME` | Used in email templates |
| `NEXT_PUBLIC_SCHEDULING_URL` | Optional booking link inserted into invites |

## How it works

1. **Screen** (`/`): pick PM or Senior PM, drop resumes. The browser sends one request per file to `/api/screen` (3 at a time) so results appear as each finishes; failed files can be retried individually.
2. **`/api/screen`**: extracts text with `unpdf` (PDF) or `mammoth` (DOCX). Scanned PDFs with no text layer are sent to Gemini as a PDF instead. The rubric is loaded from `rubric.txt`, with `{PM | Senior PM}` replaced by the chosen role, and extended with the extra keys the UI needs (contact details, summary, strengths, gaps). The response is validated with zod, and the **weighted score and decision are recomputed in code** from the rubric weights (`src/lib/scoring.ts`), so tiering never depends on the model's arithmetic.
3. **Dashboard** (`/dashboard`): cards grouped into Strong (≥ 3.8, green), Borderline (3.0–3.79, amber) and Weak (< 3.0, red). Green cards offer Invite + Review, red cards offer Reject + Review, and amber cards lead with Review plus compact Invite/Reject.
4. **Detail view** (`/candidates/[id]`): opening a candidate marks them **Review Pending**. It shows strengths, gaps, per-dimension scores with quoted evidence, interview probes, and gate/red/soft flags, with pinned Invite/Reject buttons.
5. **`/api/draft-email`**: when the email window opens, Gemini writes a personalised draft from the candidate's screening results. Invites mention what stood out. Rejections include 2–3 short, kind feedback points drawn from their gaps, with no scores or internal rubric language. The founder can edit it, click **Regenerate**, or switch to the basic template in `src/lib/email-templates.ts`, which is also the fallback if drafting fails.
6. **`/api/send-email`**: sends the final text through Resend and flips the status to **Invited** or **Rejected** everywhere.

Candidate state lives in `sessionStorage` (`src/components/HiringProvider.tsx`). It survives reloads and navigation within the tab and clears when the tab closes. No resume data is stored on the server.

## Editing the rubric

Change `rubric.txt` freely. If you change dimension **weights** or **thresholds**, update `WEIGHTS` / `decisionFor` in `src/lib/scoring.ts` to match.
