import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNotebooks, createNotebook, deleteNotebook } from "@/lib/notebooks.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Your notebooks — LearnSpark" }] }),
  component: Dashboard,
});

const EMOJIS = ["📘", "📗", "📕", "📙", "🧠", "⚡", "🔬", "🎨", "🌌", "📐", "🧬", "🎼"];

function Dashboard() {
  const qc = useQueryClient();
  const listFn = useServerFn(listNotebooks);
  const createFn = useServerFn(createNotebook);
  const delFn = useServerFn(deleteNotebook);

  const { data: notebooks = [], isLoading } = useQuery({ queryKey: ["notebooks"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState("📘");

  const create = useMutation({
    mutationFn: (d: { title: string; emoji: string }) => createFn({ data: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notebooks"] });
      setOpen(false);
      setTitle("");
      toast.success("Notebook created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notebooks"] }),
  });

  return (
    <WorkspaceShell>
      <div className="mx-auto max-w-6xl px-8 py-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Workspace</p>
            <h1 className="mt-2 font-serif text-5xl">Your notebooks.</h1>
            <p className="mt-2 text-muted-foreground">Each notebook is a topic. Add sources, generate study material, walk the learning path.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 bg-indigo-gradient text-primary-foreground shadow-glow">
                <Plus className="h-4 w-4" /> New notebook
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card">
              <DialogHeader><DialogTitle className="font-serif text-2xl">New notebook</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); if (title.trim()) create.mutate({ title: title.trim(), emoji }); }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quantum Mechanics 101" className="mt-1 bg-surface" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Cover</label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {EMOJIS.map((e) => (
                      <button type="button" key={e} onClick={() => setEmoji(e)}
                        className={`grid h-9 w-9 place-items-center rounded-lg text-lg transition ${emoji === e ? "bg-indigo-gradient shadow-glow" : "bg-surface hover:bg-surface-2"}`}>{e}</button>
                    ))}
                  </div>
                </div>
                <Button disabled={create.isPending} className="w-full bg-indigo-gradient text-primary-foreground">Create notebook</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && (
            <div className="col-span-full text-center text-muted-foreground">Loading…</div>
          )}
          {!isLoading && notebooks.length === 0 && (
            <div className="col-span-full">
              <div className="glass rounded-3xl p-12 text-center">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-indigo-gradient shadow-glow">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-serif text-3xl">Start your first notebook</h3>
                <p className="mt-2 text-sm text-muted-foreground">Upload sources, get AI-generated study material, build a learning path.</p>
                <Button onClick={() => setOpen(true)} className="mt-6 bg-indigo-gradient text-primary-foreground shadow-glow">
                  <Plus className="h-4 w-4" /> Create notebook
                </Button>
              </div>
            </div>
          )}
          {notebooks.map((n: any) => (
            <div key={n.id} className="group relative">
              <Link
                to="/notebooks/$id"
                params={{ id: n.id }}
                className="block rounded-3xl border border-border/60 bg-surface/60 p-6 transition hover:-translate-y-0.5 hover:border-indigo/40 hover:shadow-glow"
              >
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-gradient text-2xl shadow-glow">{n.emoji}</div>
                <h3 className="font-serif text-2xl leading-tight">{n.title}</h3>
                <p className="mt-3 text-xs text-muted-foreground">Updated {formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}</p>
              </Link>
              <button
                onClick={() => del.mutate(n.id)}
                className="absolute right-4 top-4 hidden rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive group-hover:block"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </WorkspaceShell>
  );
}