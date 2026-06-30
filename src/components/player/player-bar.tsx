import { Link } from "@tanstack/react-router";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, ListMusic, X } from "lucide-react";
import { usePlayer } from "./audio-provider";
import { Waveform } from "@/components/waveform";
import { coverGradient, elderPortrait, formatDuration } from "@/lib/constants";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function PlayerBar() {
  const p = usePlayer();
  if (!p.current) return null;
  const s = p.current;
  const portrait = elderPortrait(s.elder?.slug);

  return (
    <div className="border-t border-white/10 bg-night text-night-foreground">
      <div className="flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3">
        {/* track meta */}
        <Link to="/stories/$slug" params={{ slug: s.slug }} className="flex min-w-0 items-center gap-3 sm:w-64">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md" style={{ backgroundImage: coverGradient(s.slug) }}>
            {portrait && <img src={portrait} alt="" className="h-full w-full object-cover opacity-60 mix-blend-luminosity" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{s.title}</p>
            <p className="truncate text-xs text-night-muted">{s.elder?.name}</p>
          </div>
        </Link>

        {/* center controls */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={p.toggleShuffle} className={cn("hidden text-night-muted hover:text-night-foreground sm:block", p.shuffle && "text-primary")} aria-label="Shuffle"><Shuffle className="h-4 w-4" /></button>
            <button onClick={p.prev} className="text-night-muted hover:text-night-foreground" aria-label="Previous"><SkipBack className="h-5 w-5" /></button>
            <button onClick={p.toggle} className="grid h-9 w-9 place-items-center rounded-full bg-night-foreground text-night" aria-label={p.isPlaying ? "Pause" : "Play"}>
              {p.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
            </button>
            <button onClick={p.next} className="text-night-muted hover:text-night-foreground" aria-label="Next"><SkipForward className="h-5 w-5" /></button>
            <button onClick={p.cycleRepeat} className={cn("hidden text-night-muted hover:text-night-foreground sm:block", p.repeat === "one" && "text-primary")} aria-label="Repeat"><Repeat className="h-4 w-4" /></button>
          </div>
          <div className="hidden w-full max-w-xl items-center gap-2 sm:flex">
            <span className="w-9 text-right text-[10px] tabular-nums text-night-muted">{formatDuration(p.currentTime)}</span>
            <div className="h-6 flex-1 text-night-foreground/80"><Waveform seed={s.slug} progress={p.progress} bars={80} onSeek={p.seek} /></div>
            <span className="w-9 text-[10px] tabular-nums text-night-muted">{formatDuration(p.duration || s.duration_seconds)}</span>
          </div>
        </div>

        {/* right controls */}
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 lg:flex">
            <Volume2 className="h-4 w-4 text-night-muted" />
            <Slider value={[p.volume * 100]} max={100} step={1} onValueChange={(v) => p.setVolume(v[0] / 100)} className="w-24" />
          </div>
          <Sheet>
            <SheetTrigger aria-label="Queue" className="text-night-muted hover:text-night-foreground"><ListMusic className="h-5 w-5" /></SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader className="flex-row items-center justify-between">
                <SheetTitle>Up next</SheetTitle>
                <button onClick={p.clearQueue} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </SheetHeader>
              <div className="-mx-2 flex-1 overflow-y-auto px-2">
                {p.queue.map((q, i) => (
                  <div key={q.id + i} className={cn("group flex items-center gap-3 rounded-lg p-2", i === p.index && "bg-muted")}>
                    <div className="h-9 w-9 shrink-0 rounded-md" style={{ backgroundImage: coverGradient(q.slug) }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{q.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{q.elder?.name}</p>
                    </div>
                    {i !== p.index && (
                      <button onClick={() => p.removeFromQueue(i)} className="text-muted-foreground opacity-0 group-hover:opacity-100" aria-label="Remove"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      {/* mobile progress */}
      <div className="px-3 pb-1 sm:hidden">
        <div className="h-4 text-night-foreground/80"><Waveform seed={s.slug} progress={p.progress} bars={48} onSeek={p.seek} /></div>
      </div>
    </div>
  );
}
