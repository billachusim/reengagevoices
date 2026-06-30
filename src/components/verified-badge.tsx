import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ className, label = "Verified creator" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-primary", className)} title={label}>
      <BadgeCheck className="h-4 w-4" />
      {label}
    </span>
  );
}
