import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Sparkles className="h-4 w-4 animate-pulse text-indigo-glow" />
          <span className="font-serif text-lg italic">Loading your workspace…</span>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <Outlet />;
}