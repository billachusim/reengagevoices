// Turn an uploaded manuscript (.txt, .md, .docx, .html, .rtf) into clean text
// that can live in a story transcript field.

export const STORY_DOC_ACCEPT = ".txt,.md,.markdown,.docx,.html,.htm,.rtf,text/plain,text/markdown";

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

export async function parseStoryDocument(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const buffer = await file.arrayBuffer();
    const { value } = await (mammoth as any).convertToHtml({ arrayBuffer: buffer });
    return tidy(stripHtml(value));
  }

  if (name.endsWith(".doc")) {
    throw new Error("Old .doc files aren't supported — save as .docx, .txt or .md first.");
  }

  const raw = await file.text();

  if (name.endsWith(".html") || name.endsWith(".htm")) return tidy(stripHtml(raw));
  if (name.endsWith(".rtf")) return tidy(stripRtf(raw));
  if (name.endsWith(".md") || name.endsWith(".markdown")) return tidy(stripMarkdown(raw));
  return tidy(raw);
}
