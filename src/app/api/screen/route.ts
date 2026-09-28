import { NextResponse } from "next/server";
import { ScreeningError, screenResume, type ResumeInput } from "@/lib/gemini";
import { detectKind, extractResumeText, MAX_FILE_BYTES } from "@/lib/parse-resume";
import type { Role } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Screens a single resume. The client fans out one request per file so results stream in as they finish. */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("Expected multipart form data.", 400);
  }

  const file = form.get("file");
  const role = form.get("role");

  if (role !== "PM" && role !== "Senior PM") return error("Role must be PM or Senior PM.", 400);
  if (!(file instanceof File)) return error("No resume file provided.", 400);
  if (file.size === 0) return error("The file is empty.", 400);
  if (file.size > MAX_FILE_BYTES) return error("Files must be 10 MB or smaller.", 413);

  const kind = detectKind(file.name, file.type);
  if (!kind) return error("Only PDF and DOCX resumes are supported.", 415);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    let text = "";
    try {
      text = await extractResumeText(buffer, kind);
    } catch {
      if (kind === "docx") return error("Couldn't read this Word document. Is it a valid .docx?", 422);
      // Damaged or unusual PDFs: let Gemini read the file itself.
    }

    let input: ResumeInput;
    if (text.length >= 200) {
      input = { type: "text", text };
    } else if (kind === "pdf") {
      input = { type: "pdf", data: buffer }; // likely a scanned PDF with no text layer
    } else {
      return error("This document doesn't contain enough text to screen.", 422);
    }

    const result = await screenResume(input, role as Role, file.name);
    return NextResponse.json({ result });
  } catch (err) {
    if (err instanceof ScreeningError) return error(err.message, err.status);
    console.error("[screen] unexpected error", err);
    return error("Something went wrong while screening this resume.", 500);
  }
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
