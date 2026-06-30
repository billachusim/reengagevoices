import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16"><AvatarFallback className="bg-primary text-xl text-primary-foreground">{(user?.email ?? "U")[0].toUpperCase()}</AvatarFallback></Avatar>
        <div>
          <h1 className="font-serif text-2xl font-bold">Account</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>
      <button onClick={signOut} className="mt-8 w-full rounded-full border py-2.5 text-sm font-medium hover:bg-accent">Sign out</button>
    </div>
  );
}
