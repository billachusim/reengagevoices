import { Mic, Headphones, Share2 } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: Mic,
    title: "We listen",
    body: "Our local teams sit with elders in their homes and villages, recording the stories they want to leave behind. Elders can also self-record anytime through our WhatsApp chatbot.",
  },
  {
    n: "02",
    icon: Headphones,
    title: "We preserve",
    body: "Every recording is carefully archived in its original language, with translations and context for the future.",
  },
  {
    n: "03",
    icon: Share2,
    title: "We pass it on",
    body: "Stories travel back to families, schools, and communities, keeping wisdom alive across generations.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-secondary/40 px-5 py-14 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
          How ReEngage Voices works
        </p>
        <h2 className="mt-4 font-serif text-3xl font-bold leading-tight sm:text-4xl">
          Three quiet acts
          <br className="hidden sm:block" /> of remembrance
        </h2>

        <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="relative rounded-2xl bg-card p-7 shadow-warm">
              <span className="pointer-events-none absolute right-6 top-5 font-serif text-5xl font-bold text-primary/15">{s.n}</span>
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-warm text-primary-foreground shadow-warm">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 font-serif text-xl font-semibold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
