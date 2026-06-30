import { Link } from "@tanstack/react-router";
import { Play, Pause } from "lucide-react";
import type { StoryDTO } from "@/lib/types";
import { coverGradient, coverImage, elderPortrait, formatDuration } from "@/lib/constants";
import { usePlayer } from "@/components/player/audio-provider";
import { cn } from "@/lib/utils";

export function StoryCard({ story, queue }: { story: StoryDTO; queue?: StoryDTO[] }) {
  const { playStory, current, isPlaying, toggle } = usePlayer();
  const isCurrent = current?.id === story.id;
  const portrait = elderPortrait(story.elder?.slug);

  return (
    <div className="group flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl shadow-warm" style={{ backgroundImage: coverGradient(story.slug) }}>
        {portrait && (
          <img src={portrait} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity transition group-hover:scale-105 group-hover:opacity-70" />
        )}
        <Link to="/stories/$slug" params={{ slug: story.slug }} className="absolute inset-0" aria-label={story.title} />
        <button
          onClick={(e) => { e.preventDefault(); if (isCurrent) toggle(); else playStory(story, queue); }}
          className="absolute bottom-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition group-hover:opacity-100 focus:opacity-100"
          aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
        >
          {isCurrent && isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
        </button>
      </div>
      <Link to="/stories/$slug" params={{ slug: story.slug }} className="mt-2">
        <h3 className={cn("truncate font-serif text-sm font-semibold", isCurrent && "text-primary")}>{story.title}</h3>
      </Link>
      <p className="truncate text-xs text-muted-foreground">
        {story.elder?.name ?? "Unknown elder"} · {formatDuration(story.duration_seconds)}
      </p>
    </div>
  );
}

export function StoryRow({ story, queue, index }: { story: StoryDTO; queue?: StoryDTO[]; index?: number }) {
  const { playStory, current, isPlaying, toggle } = usePlayer();
  const isCurrent = current?.id === story.id;
  const portrait = elderPortrait(story.elder?.slug);
  return (
    <div className={cn("group flex items-center gap-3 rounded-lg p-2 hover:bg-muted/60", isCurrent && "bg-muted/60")}>
      <button
        onClick={() => { if (isCurrent) toggle(); else playStory(story, queue); }}
        className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md text-primary-foreground"
        style={{ backgroundImage: coverGradient(story.slug) }}
        aria-label="Play"
      >
        {portrait && <img src={portrait} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-luminosity" />}
        <span className="relative">
          {isCurrent && isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
        </span>
      </button>
      <Link to="/stories/$slug" params={{ slug: story.slug }} className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", isCurrent && "text-primary")}>{story.title}</p>
        <p className="truncate text-xs text-muted-foreground">{story.elder?.name} · {story.tribe?.name}</p>
      </Link>
      {typeof index === "number" && <span className="hidden text-xs text-muted-foreground sm:block">{index + 1}</span>}
      <span className="text-xs tabular-nums text-muted-foreground">{formatDuration(story.duration_seconds)}</span>
    </div>
  );
}
