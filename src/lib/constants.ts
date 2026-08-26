import logo from "@/assets/logo.png";
import babaAdewale from "@/assets/elders/baba-adewale.jpg";
import iyaFolake from "@/assets/elders/iya-folake.jpg";
import maameAkosua from "@/assets/elders/maame-akosua.jpg";
import nanaKwame from "@/assets/elders/nana-kwame.jpg";
import amgharIbrahim from "@/assets/elders/amghar-ibrahim.jpg";
import gogoNomvula from "@/assets/elders/gogo-nomvula.jpg";

export const LOGO_SRC = logo;

// WhatsApp "Share your story" / Agadi chatbot link.
export const WHATSAPP_NUMBER = "2349168410880";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export const ELDER_PORTRAITS: Record<string, string> = {
  "baba-adewale": babaAdewale,
  "iya-folake": iyaFolake,
  "maame-akosua": maameAkosua,
  "nana-kwame": nanaKwame,
  "amghar-ibrahim": amgharIbrahim,
  "gogo-nomvula": gogoNomvula,
};

export function elderPortrait(slug?: string | null): string | undefined {
  return slug ? ELDER_PORTRAITS[slug] : undefined;
}

// An elder's picture: an uploaded/linked photo wins, else the bundled portrait.
export function elderImage(elder?: { slug?: string | null; photo_url?: string | null } | null): string | undefined {
  if (!elder) return undefined;
  if (elder.photo_url && elder.photo_url.trim()) return elder.photo_url;
  return elderPortrait(elder.slug);
}

// A story's dedicated cover photo, when one has been set.
export function coverImage(story: { cover_url?: string | null }): string | undefined {
  return story.cover_url?.trim() ? story.cover_url : undefined;
}

// Single source of truth for how a story's artwork resolves across the card,
// row, and detail header: a real cover photo wins; otherwise the elder's
// portrait fills the same slot; otherwise nothing (the warm gradient shows).
// `isCover` means the image is a full-bleed cover/background and no separate
// thumbnail is needed; `isPortrait` means the fallback portrait is in use.
export function storyImagery(story: {
  cover_url?: string | null;
  elder?: { slug?: string | null; photo_url?: string | null } | null;
}): { image?: string; isCover: boolean; isPortrait: boolean } {
  const cover = coverImage(story);
  if (cover) return { image: cover, isCover: true, isPortrait: false };
  const portrait = elderImage(story.elder);
  if (portrait) return { image: portrait, isCover: false, isPortrait: true };
  return { image: undefined, isCover: false, isPortrait: false };
}

// Deterministic warm gradient for story covers, keyed by slug.
const COVER_GRADIENTS = [
  "linear-gradient(135deg, oklch(0.7 0.14 70), oklch(0.55 0.16 35))",
  "linear-gradient(135deg, oklch(0.6 0.17 32), oklch(0.42 0.12 28))",
  "linear-gradient(135deg, oklch(0.72 0.13 85), oklch(0.58 0.15 50))",
  "linear-gradient(135deg, oklch(0.5 0.13 40), oklch(0.7 0.14 70))",
  "linear-gradient(160deg, oklch(0.66 0.15 55), oklch(0.4 0.1 30))",
];

export function coverGradient(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return COVER_GRADIENTS[h % COVER_GRADIENTS.length];
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const DURATION_BUCKETS = [
  { value: "short", label: "Under 3 min", test: (s: number) => s < 180 },
  { value: "medium", label: "3–10 min", test: (s: number) => s >= 180 && s <= 600 },
  { value: "long", label: "Over 10 min", test: (s: number) => s > 600 },
];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "most-played", label: "Most played" },
  { value: "longest", label: "Longest" },
  { value: "shortest", label: "Shortest" },
];
