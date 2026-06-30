import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-serif text-xl font-semibold sm:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Rail({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}

export function SeeAll({ to, params }: { to: string; params?: Record<string, string> }) {
  return (
    <Link to={to as any} params={params as any} className="text-xs font-medium text-muted-foreground hover:text-foreground">
      See all
    </Link>
  );
}
