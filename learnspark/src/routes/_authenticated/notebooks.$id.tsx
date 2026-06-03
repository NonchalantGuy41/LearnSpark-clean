import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotebook, addSource, deleteSource } from "@/lib/notebooks.functions";
import { generateArtifact, generateLearningPath } from "@/lib/ai.functions";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, FileText, Link2, Type, BookOpen, ListChecks, Layers, Mic, Plus, Trash2, Route as RouteIcon, ArrowRight, Play, Pause, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/notebooks/$id")({
  head: () => ({ meta: [{ title: "Notebook — LearnSpark" }] }),
  component: NotebookPage,
});

function NotebookPage() {
  const { id } = Route.useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getFn = useServerFn(getNotebook);
  const addFn = useServerFn(addSource);
  const delFn = useServerFn(deleteSource);
  const genFn = useServerFn(generateArtifact);
  const pathFn = useServerFn(generateLearningPath);

  const { data, isLoading } = useQuery({
    queryKey: ["notebook", id],
    queryFn: () => getFn({ data: { id } }),
  });

  if (location.pathname.endsWith("/path")) return <Outlet />;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notebook", id] });

  const generate = useMutation({
    mutationFn: (kind: "notes" | "quiz" | "flashcards" | "podcast" | "summary") =>
      genFn({ data: { notebook_id: id, kind } }),
    onSuccess: () => { invalidate(); toast.success("Generated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const buildPath = useMutation({
    mutationFn: () => pathFn({ data: { notebook_id: id } }),
    onSuccess: async (r) => { await invalidate(); toast.success(`Learning path built — ${r.count} lessons`); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <WorkspaceShell><div className="p-12 text-muted-foreground">Loading…</div></WorkspaceShell>;
  }

  const { notebook, sources, artifacts, lessons } = data;

  const openLearningPath = async () => {
    if (sources.length === 0) {
      toast.error("Add at least one source before building a learning path.");
      return;
    }
    try {
      if (lessons.length === 0) await buildPath.mutateAsync();
      navigate({ to: "/notebooks/$id/path", params: { id } });
    } catch {
      // The mutation already shows the error toast.
    }
  };

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl px-8 py-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-gradient text-3xl shadow-glow">{notebook.emoji}</div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Notebook</p>
              <h1 className="mt-1 font-serif text-5xl leading-tight">{notebook.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {sources.length} {sources.length === 1 ? "source" : "sources"} · {artifacts.length} generated · {lessons.length} lessons
              </p>
            </div>
          </div>
          <Button onClick={openLearningPath} disabled={buildPath.isPending} className="bg-indigo-gradient text-primary-foreground shadow-glow">
            {buildPath.isPending ? "Building path…" : lessons.length > 0 ? "Open learning path" : "Build learning path"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          {/* SOURCES */}
          <div className="rounded-3xl border border-border/60 bg-surface/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl">Sources</h2>
              <AddSourceDialog onAdd={async (s) => { await addFn({ data: { ...s, notebook_id: id } }); invalidate(); toast.success("Source added"); }} />
            </div>
            {sources.length === 0 && (
              <p className="rounded-xl bg-surface-2/50 p-4 text-sm text-muted-foreground">
                Add files, notes, websites or videos — your sources fuel everything LearnSpark generates.
              </p>
            )}
            <ul className="space-y-2">
              {sources.map((s: any) => (
                <li key={s.id} className="group flex items-center gap-3 rounded-xl bg-surface-2/40 p-3">
                  <KindIcon kind={s.kind} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.kind}</div>
                  </div>
                  <button onClick={async () => { await delFn({ data: { id: s.id } }); invalidate(); }} className="hidden rounded p-1 text-muted-foreground hover:text-destructive group-hover:block">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* STUDIO */}
          <div>
            <div className="rounded-3xl border border-border/60 bg-surface/60 p-6">
              <h2 className="font-serif text-2xl">AI Studio</h2>
              <p className="text-sm text-muted-foreground">Generate study material from your sources.</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                <StudioBtn icon={BookOpen} label="Notes" onClick={() => generate.mutate("notes")} busy={generate.isPending && generate.variables === "notes"} />
                <StudioBtn icon={Sparkles} label="Summary" onClick={() => generate.mutate("summary")} busy={generate.isPending && generate.variables === "summary"} />
                <StudioBtn icon={ListChecks} label="Quiz" onClick={() => generate.mutate("quiz")} busy={generate.isPending && generate.variables === "quiz"} />
                <StudioBtn icon={Layers} label="Flashcards" onClick={() => generate.mutate("flashcards")} busy={generate.isPending && generate.variables === "flashcards"} />
                <StudioBtn icon={Mic} label="Podcast" onClick={() => generate.mutate("podcast")} busy={generate.isPending && generate.variables === "podcast"} />
                <StudioBtn icon={RouteIcon} label="Learning Path" onClick={openLearningPath} busy={buildPath.isPending} accent />
              </div>
            </div>

            <div className="mt-6">
              <Tabs defaultValue="all">
                <TabsList className="bg-surface">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="quiz">Quizzes</TabsTrigger>
                  <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                  <TabsTrigger value="podcast">Podcasts</TabsTrigger>
                </TabsList>
                {(["all", "notes", "quiz", "flashcards", "podcast"] as const).map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
                    {artifacts
                      .filter((a: any) => tab === "all" || a.kind === tab || (tab === "notes" && a.kind === "summary"))
                      .map((a: any) => <ArtifactCard key={a.id} a={a} />)}
                    {artifacts.filter((a: any) => tab === "all" || a.kind === tab).length === 0 && (
                      <p className="rounded-xl bg-surface/40 p-5 text-sm text-muted-foreground">Nothing here yet — generate something from the studio above.</p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function StudioBtn({ icon: Icon, label, onClick, busy, accent }: any) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`group flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition disabled:opacity-60 ${
        accent
          ? "border-indigo/40 bg-indigo-gradient text-primary-foreground shadow-glow hover:brightness-110"
          : "border-border/60 bg-surface-2/40 hover:border-indigo/40 hover:bg-surface-2"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-medium">{busy ? "Generating…" : label}</span>
    </button>
  );
}

function KindIcon({ kind }: { kind: string }) {
  const Icon = kind === "file" ? FileText : kind === "url" ? Link2 : kind === "video" ? Mic : Type;
  return <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface text-indigo-glow"><Icon className="h-4 w-4" /></div>;
}

function ArtifactCard({ a }: { a: any }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/40 p-5">
      <div className="flex items-center justify-between">
        <h4 className="font-serif text-xl">{a.title}</h4>
        <span className="rounded-full bg-indigo/20 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-indigo-glow">{a.kind}</span>
      </div>
      <div className="mt-3">
        {(a.kind === "notes" || a.kind === "summary") && (
          <div className="prose prose-invert max-w-none text-sm prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground">
            <ReactMarkdown>{a.data.markdown}</ReactMarkdown>
          </div>
        )}
        {a.kind === "podcast" && (
          <PodcastPlayer script={a.data.script} />
        )}
        {a.kind === "flashcards" && <FlashDeck cards={a.data.cards} />}
        {a.kind === "quiz" && <QuizView quiz={a.data} />}
      </div>
    </div>
  );
}

function FlashDeck({ cards }: { cards: { front: string; back: string }[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[i];
  return (
    <div>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="grid min-h-[180px] w-full place-items-center rounded-2xl bg-indigo-gradient p-8 text-center text-primary-foreground shadow-glow transition hover:brightness-110"
      >
        <p className="font-serif text-2xl">{flipped ? card.back : card.front}</p>
      </button>
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <Button size="sm" variant="outline" onClick={() => { setI((n) => (n - 1 + cards.length) % cards.length); setFlipped(false); }}>Prev</Button>
        <span>{i + 1} / {cards.length} · tap to flip</span>
        <Button size="sm" variant="outline" onClick={() => { setI((n) => (n + 1) % cards.length); setFlipped(false); }}>Next</Button>
      </div>
    </div>
  );
}

function PodcastPlayer({ script }: { script: string }) {
  const lines = script
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(HOST\s*[AB]|HOST_[AB]|A|B)\s*[:\-–]\s*(.*)$/i);
      if (m) {
        const tag = m[1].toUpperCase().replace(/\s|_/g, "");
        const host = tag.endsWith("B") ? "B" : "A";
        return { host, text: m[2] };
      }
      return { host: "A" as const, text: l };
    });

  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const voicesRef = useRef<{ A?: SpeechSynthesisVoice; B?: SpeechSynthesisVoice }>({});
  const idxRef = useRef(0);
  idxRef.current = idx;

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      if (!all.length) return;
      const en = all.filter((v) => v.lang.toLowerCase().startsWith("en"));
      const pool = en.length ? en : all;
      const female = pool.find((v) => /female|samantha|victoria|zira|google us english|jenny/i.test(v.name));
      const male = pool.find((v) => v !== female && /male|daniel|david|alex|google uk english male/i.test(v.name));
      voicesRef.current = { A: female ?? pool[0], B: male ?? pool[1] ?? pool[0] };
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakFrom = (start: number) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setPlaying(true);
    const playOne = (i: number) => {
      if (i >= lines.length) {
        setPlaying(false);
        setIdx(0);
        return;
      }
      setIdx(i);
      const line = lines[i];
      const u = new SpeechSynthesisUtterance(line.text);
      const v = voicesRef.current[line.host as "A" | "B"];
      if (v) u.voice = v;
      u.rate = 1.02;
      u.pitch = line.host === "B" ? 0.9 : 1.1;
      u.onend = () => {
        // Only auto-advance if still playing the same index (not paused/stopped)
        if (idxRef.current === i) playOne(i + 1);
      };
      u.onerror = () => setPlaying(false);
      window.speechSynthesis.speak(u);
    };
    playOne(start);
  };

  const onPlay = () => speakFrom(idx);
  const onPause = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
  };
  const onStop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
    setIdx(0);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      {!supported && (
        <p className="mb-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          Audio playback isn't supported in this browser. Try Chrome, Edge or Safari.
        </p>
      )}
      <div className="flex items-center gap-2">
        {!playing ? (
          <Button onClick={onPlay} disabled={!supported} size="sm" className="bg-indigo-gradient text-primary-foreground shadow-glow">
            <Play className="h-3.5 w-3.5" /> Play
          </Button>
        ) : (
          <Button onClick={onPause} size="sm" variant="outline">
            <Pause className="h-3.5 w-3.5" /> Pause
          </Button>
        )}
        <Button onClick={onStop} size="sm" variant="outline" disabled={!supported}>
          <Square className="h-3.5 w-3.5" /> Stop
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Line {Math.min(idx + 1, lines.length)} / {lines.length}
        </span>
      </div>
      <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
        {lines.map((l, i) => (
          <button
            key={i}
            onClick={() => speakFrom(i)}
            className={`flex w-full gap-3 rounded-lg p-2 text-left text-sm transition ${
              i === idx && playing
                ? "bg-indigo/15 text-foreground"
                : "text-muted-foreground hover:bg-surface/60"
            }`}
          >
            <span
              className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-medium ${
                l.host === "A" ? "bg-indigo-gradient text-primary-foreground" : "bg-emerald-500/80 text-primary-foreground"
              }`}
            >
              {l.host}
            </span>
            <span className="leading-relaxed">{l.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizView({ quiz }: { quiz: { questions: { question: string; options: string[]; correct_index: number; explanation: string }[] } }) {
  const total = quiz.questions.length;
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);

  const q = quiz.questions[i];
  const pick = picks[i];
  const show = !!revealed[i];
  const answered = pick !== undefined;
  const score = Object.entries(picks).filter(([k, p]) => quiz.questions[Number(k)].correct_index === p).length;

  if (done) {
    const pct = Math.round((score / total) * 100);
    return (
      <div className="rounded-2xl bg-indigo-gradient/20 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Quiz complete</p>
        <p className="mt-2 font-serif text-5xl text-indigo-glow">{score}/{total}</p>
        <p className="mt-1 text-sm text-muted-foreground">{pct}% correct</p>
        <Button
          onClick={() => { setI(0); setPicks({}); setRevealed({}); setDone(false); }}
          className="mt-5 bg-indigo-gradient text-primary-foreground shadow-glow"
        >
          Retake quiz
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span className="uppercase tracking-[0.2em]">Question {i + 1} of {total}</span>
        <span>Score {score}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="h-full bg-indigo-gradient transition-all" style={{ width: `${((i + (show ? 1 : 0)) / total) * 100}%` }} />
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-surface-2/40 p-6">
        <p className="font-serif text-2xl leading-snug">{q.question}</p>
        <div className="mt-5 grid gap-2">
          {q.options.map((opt, oi) => {
            const picked = pick === oi;
            const correct = show && oi === q.correct_index;
            const wrong = show && picked && oi !== q.correct_index;
            return (
              <button
                key={oi}
                disabled={show}
                onClick={() => setPicks({ ...picks, [i]: oi })}
                className={`rounded-xl border-2 px-4 py-3 text-left text-sm transition ${
                  correct ? "border-emerald-500 bg-emerald-500/10"
                  : wrong ? "border-destructive bg-destructive/10"
                  : picked ? "border-indigo bg-indigo/10"
                  : "border-border/60 bg-surface/40 hover:border-indigo/50"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {show && q.explanation && (
          <div className="mt-4 rounded-xl bg-surface/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Why: </span>{q.explanation}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}>Back</Button>
        {!show ? (
          <Button disabled={!answered} onClick={() => setRevealed({ ...revealed, [i]: true })} className="bg-indigo-gradient text-primary-foreground shadow-glow">
            Check answer
          </Button>
        ) : i === total - 1 ? (
          <Button onClick={() => setDone(true)} className="bg-indigo-gradient text-primary-foreground shadow-glow">Finish</Button>
        ) : (
          <Button onClick={() => setI(i + 1)} className="bg-indigo-gradient text-primary-foreground shadow-glow">Next question</Button>
        )}
      </div>
    </div>
  );
}

function AddSourceDialog({ onAdd }: { onAdd: (s: { kind: "text" | "url" | "file" | "video"; title: string; content?: string; url?: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"text" | "url" | "file">("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (kind === "url") {
        // Fetch URL content client-side via a CORS-safe approach: just store the URL + title
        await onAdd({ kind: "url", title: title || url, url, content: `Web source: ${url}` });
      } else if (kind === "file") {
        await onAdd({ kind: "file", title, content });
      } else {
        await onAdd({ kind: "text", title: title || "Note", content });
      }
      setOpen(false); setTitle(""); setContent(""); setUrl("");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const onFile = async (f: File) => {
    setTitle(f.name);
    const text = await f.text();
    setContent(text.slice(0, 150000));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5" /> Add source</Button>
      </DialogTrigger>
      <DialogContent className="bg-card sm:max-w-lg">
        <DialogHeader><DialogTitle className="font-serif text-2xl">Add a source</DialogTitle></DialogHeader>
        <div className="flex gap-1 rounded-lg bg-surface p-1 text-xs">
          {(["text", "file", "url"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 rounded-md py-1.5 capitalize ${kind === k ? "bg-indigo-gradient text-primary-foreground" : "text-muted-foreground"}`}>{k}</button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {kind === "url" ? (
            <>
              <Input placeholder="https://example.com/article" value={url} onChange={(e) => setUrl(e.target.value)} required className="bg-surface" />
              <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-surface" />
            </>
          ) : kind === "file" ? (
            <>
              <Input type="file" accept=".txt,.md,.csv,.json,.html" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="bg-surface" />
              <p className="text-xs text-muted-foreground">Text files work best (.txt, .md). For PDFs, paste the contents using the “text” tab.</p>
              {title && <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-surface" />}
            </>
          ) : (
            <>
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="bg-surface" />
              <Textarea placeholder="Paste notes, article text, transcript…" rows={9} value={content} onChange={(e) => setContent(e.target.value)} required className="bg-surface" />
            </>
          )}
          <Button disabled={busy} className="w-full bg-indigo-gradient text-primary-foreground">{busy ? "Adding…" : "Add source"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}