import { createFileRoute, Link } from "@tanstack/react-router";
import { Mic, MessageCircle } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/contribute/")({
  head: () => ({ meta: [{ title: "Contribute — ReEngage Voices" }, { name: "description", content: "Help preserve an elder's voice. Record a story or share one over WhatsApp." }] }),
  component: Contribute,
});

function Contribute() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8">
      <h1 className="font-serif text-3xl font-bold sm:text-4xl">Carry a voice forward</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Every recording you add helps keep a language, a story, a way of remembering alive. Submissions are reviewed before they appear in the archive.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to={user ? "/contribute/record" : "/auth"} className="grain flex flex-col gap-2 rounded-2xl bg-gradient-warm p-6 text-white shadow-warm">
          <Mic className="h-7 w-7" />
          <h2 className="font-serif text-xl font-semibold">Record in the app</h2>
          <p className="text-sm text-white/85">Capture an elder's story right here and add the details.</p>
        </Link>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-2 rounded-2xl border bg-card p-6 shadow-warm">
          <MessageCircle className="h-7 w-7 text-[#25D366]" />
          <h2 className="font-serif text-xl font-semibold">Send on WhatsApp</h2>
          <p className="text-sm text-muted-foreground">Talk to Agadi, our story assistant, and submit a voice note.</p>
        </a>
      </div>
    </div>
  );
}
