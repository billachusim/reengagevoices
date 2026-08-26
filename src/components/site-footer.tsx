import { Link } from "@tanstack/react-router";
import { LOGO_SRC } from "@/lib/constants";

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
          A digital archive of African heritage stories and lived experiences — a project of ReEngage Africa.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:max-w-md">
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
          <br />
          africanvoices.app
        </p>
      </div>
    </footer>
  );
}
