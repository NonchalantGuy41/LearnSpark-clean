import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight, Sparkles, BookOpen, Headphones, ListChecks, Zap, FileText, Link2, MessageCircle } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LearnSpark — turn any source into a learning journey" },
      {
        name: "description",
        content:
          "Upload files, videos, notes and URLs. LearnSpark generates AI notes, quizzes, flashcards, podcasts and a Duolingo-style learning path you can complete.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground bg-aurora">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-gradient shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-serif text-2xl">LearnSpark</span>
        </Link>
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#flow" className="hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://discord.gg/Ku27TYNePC"
            target="_blank"
            rel="noreferrer"
            aria-label="Join our Discord"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border/60 bg-surface/60 text-muted-foreground transition hover:text-foreground hover:border-indigo/50"
          >
            <DiscordIcon className="h-4 w-4" />
          </a>
          <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
          <Button asChild className="bg-indigo-gradient text-primary-foreground shadow-glow">
            <Link to="/login">Get started <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 text-center">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-glow" /> AI workspace + adaptive learning path
        </div>
        <h1 className="mx-auto max-w-4xl font-serif text-6xl leading-[1.05] md:text-8xl">
          Learn anything,
          <br />
          <span className="text-indigo-gradient italic">beautifully</span>.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Drop in files, videos, notes or URLs. LearnSpark turns them into structured notes,
          quizzes, flashcards and AI podcasts — then guides you through a Duolingo-style
          path until you've mastered it.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 bg-indigo-gradient px-7 text-base text-primary-foreground shadow-glow">
            <Link to="/login">Start learning free</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 px-7 text-base">
            <a href="#features">See how it works</a>
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: FileText, label: "PDFs & notes" },
            { icon: Link2, label: "Websites" },
            { icon: BookOpen, label: "Articles" },
            { icon: Headphones, label: "Lectures" },
          ].map((it) => (
            <div key={it.label} className="glass flex items-center justify-center gap-2 rounded-2xl py-4 text-sm text-muted-foreground">
              <it.icon className="h-4 w-4" /> {it.label}
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Your AI workspace",
              body: "Notes, summaries, quizzes, flashcards and a two-host podcast — generated from your sources, on demand.",
            },
            {
              icon: ListChecks,
              title: "A real learning path",
              body: "We turn your material into progressive lessons. Complete one to unlock the next. Earn XP. Build a streak.",
            },
            {
              icon: Zap,
              title: "Built to make it stick",
              body: "Active recall, spaced practice and bite-sized exercises designed for retention — not just consumption.",
            },
          ].map((f) => (
            <div key={f.title} className="glass rounded-3xl p-8 shadow-soft">
              <div className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-indigo-gradient shadow-glow">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-serif text-2xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="flow" className="mx-auto max-w-5xl px-6 pb-32 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">How it works</p>
        <h2 className="mt-3 font-serif text-5xl">Three steps from source to mastery.</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            ["01", "Upload your sources", "Files, websites, lecture notes — anything you need to learn."],
            ["02", "Get your workspace", "AI generates notes, quizzes, flashcards and a podcast."],
            ["03", "Walk the path", "Progress through lessons. Track XP. Reach mastery."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-3xl border border-border/60 bg-surface/40 p-8 text-left">
              <div className="font-serif text-5xl italic text-indigo-glow">{n}</div>
              <h3 className="mt-3 font-serif text-2xl">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <a
            href="https://discord.gg/Ku27TYNePC"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <DiscordIcon className="h-4 w-4" /> Join the Discord
          </a>
          <div>© {new Date().getFullYear()} LearnSpark. Crafted for curious minds.</div>
        </div>
      </footer>
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.075.075 0 0 0-.079.037c-.34.604-.719 1.392-.984 2.012a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.997-2.012.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 5.174 4.369a.07.07 0 0 0-.032.027C1.533 9.046.534 13.58 1.026 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.995a.076.076 0 0 0-.041-.105 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.127c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.04.106c.36.699.771 1.363 1.225 1.994a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.182 0-2.156-1.085-2.156-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.175 1.095 2.156 2.42 0 1.333-.955 2.418-2.156 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.175 1.095 2.156 2.42 0 1.333-.946 2.418-2.156 2.418z" />
    </svg>
  );
}
