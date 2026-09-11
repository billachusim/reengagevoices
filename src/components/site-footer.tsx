import { Link } from "@tanstack/react-router";
import { Youtube, Instagram, Facebook } from "lucide-react";
import { LOGO_SRC } from "@/lib/constants";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.893 2.893 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-1.853.27 6.447 6.447 0 0 0-4.068 4.066A6.57 6.57 0 0 0 8.702 24a6.545 6.545 0 0 0 6.489-5.82l.01-.127V9.238a7.124 7.124 0 0 0 4.118 1.313V7.079a4.815 4.815 0 0 1-2.76-.393h.009z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { href: "https://youtube.com/@reengagevoices?si=_WImyzWzZJa7u-i9", label: "YouTube", Icon: Youtube },
  { href: "https://www.instagram.com/reengage_voices?stkn=MXBqbmJuNHQzY3U5dA%3D%3D&utm_source=qr", label: "Instagram", Icon: Instagram },
  { href: "https://www.tiktok.com/@reengage_voices?_r=1&_t=ZS-99aR1l8Rzpy", label: "TikTok", Icon: TikTokIcon },
  { href: "https://www.facebook.com/share/1Lrak6XX27/?mibextid=wwXIfr", label: "Facebook", Icon: Facebook },
  { href: "https://x.com/reengage_voices?s=11&t=43iszBeRnY-l_qnUyInDOg", label: "X", Icon: XIcon },
];

export function SiteFooter() {
  return (
    <footer className="bg-night px-5 py-12 text-night-foreground sm:px-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-3">
          <img src={LOGO_SRC} alt="ReEngage African Voices" width={44} height={44} className="h-11 w-11" />
          <p className="font-serif text-2xl font-semibold">
            ReEngage <span className="text-primary">Voices</span>
          </p>
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-night-muted">
          A digital archive of African heritage stories and lived experiences. A project of ReEngage Africa.
        </p>

        <ul className="mt-5 flex flex-wrap items-center gap-3">
          {SOCIAL_LINKS.map(({ href, label, Icon }) => (
            <li key={label}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`ReEngage Voices on ${label}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-night-foreground/10 text-night-muted transition-colors hover:bg-night-foreground/20 hover:text-night-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Icon className="h-[18px] w-[18px]" />
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-9 grid gap-8 sm:grid-cols-2 sm:max-w-md">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Archive</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link to="/browse" className="hover:text-primary">All stories</Link></li>
              <li><Link to="/elders" className="hover:text-primary">Contributors</Link></li>
              <li><Link to="/collections" className="hover:text-primary">Audio, video &amp; written</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Project</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li><Link to="/contribute" className="hover:text-primary">Submit a story</Link></li>
              <li><Link to="/creator" className="hover:text-primary">Creator program</Link></li>
              <li>
                <a href="https://reengageafrica.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                  ReEngage Africa
                </a>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 font-mono text-xs text-night-muted">
          © {new Date().getFullYear()} ReEngage Africa
        </p>
      </div>
    </footer>
  );
}
