import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotebook, completeLesson } from "@/lib/notebooks.functions";
import { generateLearningPath } from "@/lib/ai.functions";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Lock, Play, Sparkles, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notebooks/$id/path")({
  head: () => ({ meta: [{ title: "Learning path — LearnSpark" }] }),
  component: PathPage,
});

function PathPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getNotebook);
  const pathFn = useServerFn(generateLearningPath);
  const { data, refetch } = useQuery({ queryKey: ["notebook", id], queryFn: () => getFn({ data: { id } }) });
  const [active, setActive] = useState<any | null>(null);

  const buildPath = useMutation({
    mutationFn: () => pathFn({ data: { notebook_id: id } }),
    onSuccess: async (r) => { await qc.invalidateQueries({ queryKey: ["notebook", id] }); await refetch(); toast.success(`Built ${r.count} lessons`); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!data) return <WorkspaceShell><div className="p-12 text-muted-foreground">Loading…</div></WorkspaceShell>;

  const lessons = data.lessons;
  const completed = lessons.filter((l: any) => l.status === "completed").length;
  const allDone = lessons.length > 0 && completed === lessons.length;
  const firstPlayableIndex = lessons.findIndex((l: any, i: number) => l.status !== "locked" || i === 0);

  if (active) {
    return <LessonRunner lesson={active} notebookId={id} onClose={(passed) => {
      setActive(null);
      if (passed) qc.invalidateQueries({ queryKey: ["notebook", id] });
    }} />;
  }

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-3xl px-8 py-10">
        <Link to="/notebooks/$id" params={{ id }} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to notebook
        </Link>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Learning path</p>
            <h1 className="mt-1 font-serif text-5xl">{data.notebook.title}</h1>
          </div>
          <div className="text-right">
            <div className="font-serif text-3xl text-indigo-glow">{completed}/{lessons.length}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">lessons</div>
          </div>
        </div>

        {lessons.length === 0 && (
          <div className="mt-12 glass rounded-3xl p-10 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-indigo-glow" />
            <p className="mt-3 font-serif text-2xl">No path yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.sources.length === 0
                ? "Add at least one source to this notebook first, then build your path."
                : "Generate a Duolingo-style sequence of lessons from your sources."}
            </p>
            <Button
              onClick={() => buildPath.mutate()}
              disabled={buildPath.isPending || data.sources.length === 0}
              className="mt-5 bg-indigo-gradient text-primary-foreground shadow-glow"
            >
              {buildPath.isPending ? "Building your path…" : "Build my learning path"}
            </Button>
          </div>
        )}

        <div className="relative mt-12">
          <div className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 rounded-full bg-border/70" />
          <ul className="relative space-y-8">
            {lessons.map((l: any, i: number) => {
              const side = i % 2 === 0 ? "left" : "right";
              const isLocked = l.status === "locked" && i !== firstPlayableIndex;
              const isDone = l.status === "completed";
              return (
                <li key={l.id} className={`relative flex ${side === "left" ? "justify-start" : "justify-end"}`}>
                  <div className={`absolute left-1/2 top-6 z-10 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-full border-4 border-background ${isDone ? "bg-emerald-500 text-primary-foreground" : isLocked ? "bg-surface text-muted-foreground" : "bg-indigo-gradient text-primary-foreground shadow-glow"}`}>
                    {isDone ? <Check className="h-5 w-5" /> : isLocked ? <Lock className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                  </div>
                  <button
                    disabled={isLocked}
                    onClick={() => setActive(l)}
                    className={`group w-[44%] min-w-0 rounded-3xl border p-5 text-left transition max-sm:w-[42%] ${
                      isLocked
                        ? "border-border/40 bg-surface/30 text-muted-foreground"
                        : isDone
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-indigo/50 bg-indigo-gradient text-primary-foreground shadow-glow hover:brightness-110"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] opacity-80">Lesson {i + 1}</span>
                      {isLocked && <Lock className="h-4 w-4" />}
                      {isDone && <Check className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <h3 className="mt-2 font-serif text-2xl leading-tight">{l.title}</h3>
                    <p className="mt-1 text-sm opacity-80">{l.objective}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {allDone && (
          <div className="mt-12 rounded-3xl bg-indigo-gradient p-8 text-center text-primary-foreground shadow-glow">
            <Trophy className="mx-auto h-8 w-8" />
            <p className="mt-2 font-serif text-3xl">You finished the path.</p>
            <p className="mt-1 text-sm opacity-90">Add more sources or generate a fresh path to keep learning.</p>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}

function LessonRunner({ lesson, notebookId, onClose }: { lesson: any; notebookId: string; onClose: (passed: boolean) => void }) {
  const completeFn = useServerFn(completeLesson);
  const baseExercises = lesson.content.exercises;
  // Queue holds indices into baseExercises; wrong answers re-queue at the end.
  const [queue, setQueue] = useState<number[]>(() => baseExercises.map((_: any, i: number) => i));
  const [step, setStep] = useState(0); // 0 = concept, then exercises from queue
  const [pos, setPos] = useState(0); // index into queue
  const [pick, setPick] = useState<number | undefined>(undefined);
  const [wrongFirstTry, setWrongFirstTry] = useState<Set<number>>(new Set());
  const [answeredOnce, setAnsweredOnce] = useState<Set<number>>(new Set());

  const totalInitial = baseExercises.length;
  const currentExIdx = queue[pos];
  const ex = currentExIdx !== undefined ? baseExercises[currentExIdx] : null;
  const isRetry = ex && answeredOnce.has(currentExIdx);

  const finish = async () => {
    const correctFirstTry = totalInitial - wrongFirstTry.size;
    const score = Math.round((correctFirstTry / totalInitial) * 100);
    const res = await completeFn({ data: { id: lesson.id, score } });
    toast.success(`+${res.xpGain} XP — ${correctFirstTry}/${totalInitial} on first try`);
    onClose(true);
  };

  const onPick = (p: number) => setPick(p);

  const onContinue = () => {
    if (pick === undefined || !ex) return;
    const correct = pick === ex.correct_index;
    const idx = currentExIdx;
    if (correct) {
      setAnsweredOnce((s) => new Set(s).add(idx));
      setPick(undefined);
      if (pos + 1 >= queue.length) {
        finish();
      } else {
        setPos(pos + 1);
      }
    } else {
      // first-time wrong: track + push back to end of queue for retry
      if (!answeredOnce.has(idx)) {
        setWrongFirstTry((s) => new Set(s).add(idx));
      }
      setAnsweredOnce((s) => new Set(s).add(idx));
      setQueue((q) => [...q, idx]);
      setPick(undefined);
      setPos(pos + 1);
    }
  };

  const [revealed, setRevealed] = useState(false);
  const answered = pick !== undefined;
  const isCorrect = answered && ex && pick === ex.correct_index;

  return (
    <WorkspaceShell>
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col px-8 py-10">
        <div className="mb-6">
          <button onClick={() => onClose(false)} className="text-xs text-muted-foreground hover:text-foreground">← Exit lesson</button>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full bg-indigo-gradient transition-all" style={{ width: `${step === 0 ? 4 : Math.min(100, ((pos + (revealed ? 1 : 0)) / queue.length) * 100)}%` }} />
          </div>
          {step > 0 && (
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Exercise {pos + 1} of {queue.length}{queue.length > totalInitial ? " (retries)" : ""}</span>
              {isRetry && <span className="text-amber-400">Retry</span>}
            </div>
          )}
        </div>

        {step === 0 && (
          <div className="flex flex-1 flex-col">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{lesson.title}</p>
            <h2 className="mt-2 font-serif text-4xl">{lesson.objective}</h2>
            <div className="mt-6 rounded-2xl bg-surface/60 p-6 text-base leading-relaxed text-foreground">
              {lesson.content.concept}
            </div>
            <div className="mt-auto">
              <Button onClick={() => setStep(1)} className="h-12 w-full bg-indigo-gradient text-base text-primary-foreground shadow-glow">
                Start practice
              </Button>
            </div>
          </div>
        )}

        {step > 0 && ex && (
          <div className="flex flex-1 flex-col" key={`${pos}-${currentExIdx}`}>
            <h2 className="mt-2 font-serif text-3xl leading-tight">{ex.prompt}</h2>
            <div className="mt-6 grid gap-2">
              {ex.options.map((opt: string, oi: number) => {
                const picked = pick === oi;
                const showCorrect = revealed && oi === ex.correct_index;
                const showWrong = revealed && picked && oi !== ex.correct_index;
                return (
                  <button
                    key={oi}
                    disabled={revealed}
                    onClick={() => onPick(oi)}
                    className={`rounded-2xl border-2 px-5 py-4 text-left text-base transition ${
                      showCorrect ? "border-emerald-500 bg-emerald-500/10"
                      : showWrong ? "border-destructive bg-destructive/10"
                      : picked ? "border-indigo bg-indigo/10"
                      : "border-border bg-surface-2/40 hover:border-indigo/50"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto pt-8">
              {revealed && (
                <div className={`mb-3 rounded-xl px-4 py-3 text-sm ${isCorrect ? "bg-emerald-500/10 text-emerald-300" : "bg-destructive/10 text-destructive"}`}>
                  <div className="font-medium">
                    {isCorrect ? "Correct!" : `Not quite — the answer was: ${ex.options[ex.correct_index]}`}
                  </div>
                  {ex.explanation && (
                    <div className="mt-1 text-xs leading-relaxed opacity-90">
                      <span className="font-medium">Why: </span>{ex.explanation}
                    </div>
                  )}
                  {!isCorrect && (
                    <div className="mt-1 text-xs opacity-80">You'll see this question again at the end.</div>
                  )}
                </div>
              )}
              {!revealed ? (
                <Button disabled={!answered} onClick={() => setRevealed(true)} className="h-12 w-full bg-indigo-gradient text-base text-primary-foreground shadow-glow">
                  Check answer
                </Button>
              ) : (
                <Button onClick={() => { setRevealed(false); onContinue(); }} className="h-12 w-full bg-indigo-gradient text-base text-primary-foreground shadow-glow">
                  {pos + 1 >= queue.length && isCorrect ? "Finish lesson" : "Continue"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
