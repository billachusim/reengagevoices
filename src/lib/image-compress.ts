// Browser-side image downscaling for uploads. Raw camera/design exports are
// often 10 MB+ PNGs; the site never renders anything larger than ~1600px, so
// we resize on a canvas and re-encode as WebP (JPEG fallback) before upload.

export type CompressPreset = "cover" | "portrait";

const PRESETS: Record<CompressPreset, { maxSide: number; quality: number }> = {
  cover: { maxSide: 1600, quality: 0.82 },
  portrait: { maxSide: 800, quality: 0.82 },
};

async function loadBitmap(file: File): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; close: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
      return { width: bmp.width, height: bmp.height, draw: (ctx, w, h) => ctx.drawImage(bmp, 0, 0, w, h), close: () => bmp.close() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image"));
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight, draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h), close: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns a resized, re-encoded file. If anything fails (SVG, unsupported
 * format, no canvas) the original file is returned unchanged so uploads
 * never break because of the optimiser.
 */
export async function compressImage(file: File, preset: CompressPreset): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") return file;
  const { maxSide, quality } = PRESETS[preset];
  try {
    const src = await loadBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(src.width, src.height));
    const w = Math.max(1, Math.round(src.width * scale));
    const h = Math.max(1, Math.round(src.height * scale));

    // Already small and reasonably encoded: leave it alone.
    if (scale === 1 && file.size < 400 * 1024) { src.close(); return file; }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { src.close(); return file; }
    ctx.drawImage; // keep TS happy about unused draw path
    src.draw(ctx, w, h);
    src.close();

    let blob = await canvasToBlob(canvas, "image/webp", quality);
    let ext = "webp";
    if (!blob || blob.type !== "image/webp") {
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      ext = "jpg";
    }
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
