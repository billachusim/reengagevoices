import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/creator.functions";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  roles: string[];
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  roles: [],
  isAdmin: false,
  isModerator: false,
  isStaff: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setRoles([]);
      return;
    }
    getMyRoles()
      .then((r) => {
        if (active) setRoles(r);
      })
      .catch(() => {
        if (active) setRoles([]);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");

  return (
    <Ctx.Provider value={{ user, loading, roles, isAdmin, isModerator, isStaff: isAdmin || isModerator, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
