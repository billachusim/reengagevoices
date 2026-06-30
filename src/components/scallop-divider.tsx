import { cn } from "@/lib/utils";

export function ScallopDivider({ className, flip }: { className?: string; flip?: boolean }) {
  return (
    <div className={cn("w-full overflow-hidden leading-[0] text-card", className)} style={{ transform: flip ? "rotate(180deg)" : undefined }} aria-hidden>
      <svg viewBox="0 0 1200 24" preserveAspectRatio="none" className="h-3 w-full">
        <path
          d="M0,24 Q30,0 60,24 T120,24 T180,24 T240,24 T300,24 T360,24 T420,24 T480,24 T540,24 T600,24 T660,24 T720,24 T780,24 T840,24 T900,24 T960,24 T1020,24 T1080,24 T1140,24 T1200,24 L1200,24 L0,24 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}
