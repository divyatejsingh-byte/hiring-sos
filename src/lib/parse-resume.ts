import "server-only";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export type ResumeKind = "pdf" | "docx";

export function detectKind(fileName: string, mimeType: string): ResumeKind | null {
  const name = fileName.toLowerCase();
  if (name.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (
    name.endsWith(".docx") ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return null;
}

/** Extracts plain text from a PDF or DOCX buffer. Returns "" when the file has no text layer. */
export async function extractResumeText(buffer: Buffer, kind: ResumeKind): Promise<string> {
  if (kind === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return normalise(text);
  }

  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return normalise(value);
}

function normalise(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
