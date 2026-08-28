// Turn an uploaded manuscript (.txt, .md, .docx, .html, .rtf) into clean text
// that can live in a story transcript field.

export const STORY_DOC_ACCEPT =
  ".txt,.md,.markdown,.docx,.doc,.pdf,.html,.htm,.rtf,text/plain,text/markdown,application/pdf";

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: string[] = [];
  doc.body.querySelectorAll("p, h1, h2, h3, h4, li, blockquote, pre").forEach((el) => {
    const t = (el.textContent ?? "").trim();
    if (t) blocks.push(t);
  });
  if (blocks.length) return blocks.join("\n\n");
  return (doc.body.textContent ?? "").trim();
}

function stripRtf(rtf: string): string {
  return rtf
    .replace(/\\par[d]?/g, "\n")
    .replace(/\{\\\*?[^{}]*\}/g, "")
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "");
}

// Light markdown cleanup: keep the words, drop the syntax noise.
function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|\W)[*_](\S[^*_]*?)[*_](\W|$)/g, "$1$2$3")
    .replace(/`{1,3}([^`]*)`{1,3}/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

// Legacy Word (.doc) binary: pull out readable runs of text as a best effort.
function extractLegacyDoc(bytes: Uint8Array): string {
  let out = "";
  let run = "";
  const flush = () => {
    if (run.trim().length >= 4) out += run.trim() + "\n";
    run = "";
  };
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i]!;
    if (c === 13 || c === 10) { flush(); continue; }
    if (c === 9) { run += " "; continue; }
    if (c >= 32 && c < 127) run += String.fromCharCode(c);
    else flush();
  }
  flush();
  return out
    .split("\n")
    .filter((line) => /[a-z]{3}/i.test(line) && !/^[A-Za-z0-9+/=]{60,}$/.test(line))
    .join("\n\n");
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let text = "";
    let lastY: number | null = null;
    for (const item of content.items as any[]) {
      if (typeof item.str !== "string") continue;
      const y = item.transform?.[5];
      if (lastY !== null && typeof y === "number" && Math.abs(y - lastY) > 2) text += "\n";
      text += item.str;
      if (item.hasEOL) text += "\n";
      if (typeof y === "number") lastY = y;
    }
    pages.push(text.replace(/[ \t]{2,}/g, " ").trim());
  }
  return pages.filter(Boolean).join("\n\n");
}

export async function parseStoryDocument(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const mammoth = await import(/* @vite-ignore */ "mammoth/mammoth.browser" as string);
    const buffer = await file.arrayBuffer();
    const { value } = await (mammoth as any).convertToHtml({ arrayBuffer: buffer });
    return tidy(stripHtml(value));
  }

  if (name.endsWith(".pdf")) {
    return tidy(await parsePdf(file));
  }

  if (name.endsWith(".doc")) {
    const text = extractLegacyDoc(new Uint8Array(await file.arrayBuffer()));
    if (!text.trim()) {
      throw new Error("Could not read that .doc file — please save it as .docx or PDF and try again.");
    }
    return tidy(text);
  }

  const raw = await file.text();

  if (name.endsWith(".html") || name.endsWith(".htm")) return tidy(stripHtml(raw));
  if (name.endsWith(".rtf")) return tidy(stripRtf(raw));
  if (name.endsWith(".md") || name.endsWith(".markdown")) return tidy(stripMarkdown(raw));
  return tidy(raw);
}
