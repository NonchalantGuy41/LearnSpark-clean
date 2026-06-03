import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LearnSpark" },
      { name: "description", content: "Sign in to your LearnSpark workspace to save progress." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const onEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "sign_up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Account created. Welcome!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-aurora p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-gradient shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-serif text-2xl">LearnSpark</span>
        </Link>
        <div className="relative z-10">
          <h2 className="max-w-md font-serif text-5xl leading-tight">
            “Reading is consuming. <span className="italic text-indigo-glow">LearnSpark</span> turns it into knowing.”
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Sign in to keep your notebooks, lessons and streaks safe across devices.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">© LearnSpark Study</div>
      </div>

      <div className="flex items-center justify-center bg-background p-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
          <h1 className="font-serif text-4xl">
            {mode === "sign_in" ? "Welcome back." : "Create your account."}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "sign_in" ? "Sign in to continue learning." : "Start your first notebook in seconds."}
          </p>

          <form onSubmit={onEmail} className="mt-8 space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 bg-surface" />
            </div>
            <div>
              <Label htmlFor="pw">Password</Label>
              <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 bg-surface" />
            </div>
            <Button disabled={busy} type="submit" className="h-11 w-full bg-indigo-gradient text-primary-foreground shadow-glow">
              {mode === "sign_in" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "sign_in" ? "New here?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "sign_in" ? "sign_up" : "sign_in")}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {mode === "sign_in" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
