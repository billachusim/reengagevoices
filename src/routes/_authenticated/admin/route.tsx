import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Inbox, Users, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const TABS = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/queue", label: "Queue", icon: Inbox },
  { to: "/admin/edit", label: "Edit stories", icon: Pencil },
  { to: "/admin/creators", label: "Creators", icon: Users },
];

function AdminLayout() {
  const { isStaff, loading, user, roles } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  // roles load shortly after user; only redirect once we know roles are resolved
  const rolesResolved = !!user && roles.length >= 0;

  useEffect(() => {
    if (!loading && user && rolesResolved && !isStaff && roles.length > 0) {
      navigate({ to: "/" });
    }
  }, [loading, user, isStaff, rolesResolved, roles.length, navigate]);

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="font-serif text-2xl font-bold">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Checking access… If you are not an admin you'll be redirected.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <h1 className="font-serif text-2xl font-bold sm:text-3xl">Admin console</h1>
      <div className="mt-4 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => {
          const active = t.exact ? path === t.to : path === t.to || path.startsWith(t.to + "/");
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition",
                active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Link>
          );
        })}
      </div>
      <div className="py-6">
        <Outlet />
      </div>
    </div>
  );
}
