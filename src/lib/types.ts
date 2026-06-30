export interface Ref {
  slug: string;
  name: string;
}

export interface ThemeRef extends Ref {
  kind: "type" | "mood";
}

export interface StoryDTO {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  cover_url: string | null;
  duration_seconds: number;
  play_count: number;
  transcript_original: string | null;
  transcript_english: string | null;
  youtube_url: string | null;
  is_featured: boolean;
  elder: Ref | null;
  region: Ref | null;
  tribe: Ref | null;
  language: Ref | null;
  themes: ThemeRef[];
}

export interface ElderDTO {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  region: Ref | null;
  tribe: Ref | null;
  language: Ref | null;
  story_count?: number;
}

export interface CollectionDTO {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  story_count: number;
}

export interface FacetsDTO {
  regions: { slug: string; name: string; country: string | null; region: string | null; village: string | null; parent_id: string | null; id: string }[];
  tribes: Ref[];
  languages: Ref[];
  themes: ThemeRef[];
}
