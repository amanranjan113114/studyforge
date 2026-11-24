import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel rejects request bodies over about 4.5 MB, so keep uploads under 4 MB
const MAX_BYTES = 4 * 1024 * 1024;

/** Turns an uploaded PDF or text file into plain text for the syllabus box. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 4 MB. Paste the syllabus text instead." }, { status: 413 });
  }

  const name = file.name.toLowerCase();
  try {
    let text = "";
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      const result = await extractText(pdf, { mergePages: true });
      text = result.text;
    } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
      text = await file.text();
    } else {
      return NextResponse.json({ error: "Upload a PDF or a text file" }, { status: 415 });
    }

    text = text.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 30) {
      return NextResponse.json(
        { error: "No readable text found. Scanned PDFs need OCR; paste the text instead." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text: text.slice(0, 60000) });
  } catch {
    return NextResponse.json({ error: "Could not read that file" }, { status: 422 });
  }
}
