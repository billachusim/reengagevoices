import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Search, Library, Mic, Users, ListMusic, LogIn, Menu, Sparkles, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LOGO_SRC, WHATSAPP_URL } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { getMyActivity } from "@/lib/library.functions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/browse", label: "Browse", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
];
const SECONDARY = [
  { to: "/elders", label: "Elders", icon: Users },
  { to: "/collections", label: "Audio, video & written", icon: ListMusic },
  { to: "/contribute", label: "Contribute", icon: Mic },
];

function useSavedCount() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["activity", user?.id],
    queryFn: () => getMyActivity(),
    enabled: !!user,
    staleTime: 30_000,
  });
  return data?.savedIds.length ?? 0;
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 px-2">
      <img src={LOGO_SRC} alt="ReEngage African Voices" width={36} height={36} className="h-9 w-9" />
      <span className="font-serif text-lg font-semibold leading-none">
        ReEngage<span className="block text-xs font-normal text-muted-foreground">African Voices</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const saved = useSavedCount();
  const { user, isStaff } = useAuth();
  const linkCls =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-foreground";
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          activeOptions={{ exact: (item as any).exact }}
          className={linkCls}
        >
          <item.icon className="h-5 w-5" />
          <span className="flex-1">{item.label}</span>
          {item.label === "Library" && saved > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{saved}</Badge>}
        </Link>
      ))}
      <div className="my-2 h-px bg-sidebar-border" />
      {SECONDARY.map((item) => (
        <Link key={item.to} to={item.to} onClick={onNavigate} className={linkCls}>
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      ))}
      {user && (
        <Link to="/creator" onClick={onNavigate} className={linkCls}>
          <Sparkles className="h-5 w-5" />
          Creator program
        </Link>
      )}
      {isStaff && (
        <Link to="/admin" onClick={onNavigate} className={linkCls}>
          <Shield className="h-5 w-5" />
          Admin
        </Link>
      )}
    </nav>
  );
}

function TopBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b bg-background/85 px-3 py-2.5 backdrop-blur sm:px-5">
      <div className="flex items-center gap-2">
        <button className="md:hidden" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
        <div className="md:hidden"><img src={LOGO_SRC} alt="ReEngage" width={32} height={32} className="h-8 w-8" /></div>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); if (q.trim()) navigate({ to: "/search", search: { q: q.trim() } }); }}
        className="flex min-w-0 items-center gap-2 rounded-full bg-muted px-4 py-2"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stories, elders, tribes…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
      <div className="flex items-center gap-2">
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hidden rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground sm:block">
          Share your story
        </a>
        {user ? (
          <button onClick={() => signOut()} aria-label="Account" title="Sign out">
            <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{(user.email ?? "U")[0].toUpperCase()}</AvatarFallback></Avatar>
          </button>
        ) : (
          <Link to="/auth" className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            <LogIn className="h-3.5 w-3.5" /> Sign in
          </Link>
        )}
      </div>
      {menuOpen && (
        <div className="col-span-3 md:hidden">
          <div className="rounded-xl border bg-card p-2"><NavList onNavigate={() => setMenuOpen(false)} /></div>
        </div>
      )}
    </header>
  );
}

function BottomTabs() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/browse", label: "Browse", icon: Compass },
    { to: "/search", label: "Search", icon: Search },
    { to: "/library", label: "Library", icon: Library },
    { to: "/contribute", label: "Record", icon: Mic },
  ];
  const isActive = (to: string, exact?: boolean) => (exact ? path === to : path === to || path.startsWith(to + "/"));
  return (
    <nav className="grid grid-cols-5 border-t bg-card pb-safe md:hidden">
      {tabs.map((t) => (
        <Link key={t.to} to={t.to} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium", isActive(t.to, t.exact) ? "text-primary" : "text-muted-foreground")}>
          <t.icon className="h-5 w-5" />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

function WhatsAppButton() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const d = drag.current;
    if (!d) return;
    const size = 48;
    const x = Math.min(Math.max(0, e.clientX - d.dx), window.innerWidth - size);
    const y = Math.min(Math.max(0, e.clientY - d.dy), window.innerHeight - size);
    if (!d.moved && (Math.abs(e.clientX - d.dx - (pos?.x ?? 16)) > 4 || Math.abs(e.clientY - d.dy - (pos?.y ?? 0)) > 4)) d.moved = true;
    setPos({ x, y });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLAnchorElement>) => {
    const moved = drag.current?.moved;
    drag.current = null;
    if (moved) e.preventDefault();
  };

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={(e) => { if (drag.current?.moved) e.preventDefault(); }}
      style={pos ? { left: pos.x, top: pos.y, bottom: "auto" } : undefined}
      className="fixed bottom-36 left-4 z-40 grid h-12 w-12 cursor-grab touch-none place-items-center rounded-full bg-[#25D366] text-white shadow-lg active:cursor-grabbing md:bottom-28"
      aria-label="Share your story on WhatsApp — drag to move"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.115zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
    </a>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r bg-sidebar py-4 md:flex">
          <Brand />
          <div className="px-2"><NavList /></div>
        </aside>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
      <PlayerBarSlot />
      <BottomTabs />
      <WhatsAppButton />
    </div>
  );
}

import { PlayerBar } from "@/components/player/player-bar";
function PlayerBarSlot() {
  return <PlayerBar />;
}
