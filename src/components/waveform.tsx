import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface WaveformProps {
  seed: string;
  progress?: number; // 0..1
  bars?: number;
  className?: string;
  onSeek?: (fraction: number) => void;
}

export function Waveform({ seed, progress = 0, bars = 64, className, onSeek }: WaveformProps) {
  const heights = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      const base = 0.25 + (h % 1000) / 1000 * 0.75;
      const wave = 0.5 + 0.5 * Math.sin((i / bars) * Math.PI * 3);
      out.push(Math.max(0.12, base * wave));
    }
    return out;
  }, [seed, bars]);

  return (
    <div
      className={cn("flex h-full w-full items-center gap-[2px]", onSeek && "cursor-pointer", className)}
      onClick={(e) => {
        if (!onSeek) return;
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek((e.clientX - rect.left) / rect.width);
      }}
    >
      {heights.map((ht, i) => {
        const active = i / bars <= progress;
        return (
          <div
            key={i}
            className={cn("flex-1 rounded-full transition-colors", active ? "bg-primary" : "bg-current opacity-25")}
            style={{ height: `${ht * 100}%` }}
          />
        );
      })}
    </div>
  );
}
