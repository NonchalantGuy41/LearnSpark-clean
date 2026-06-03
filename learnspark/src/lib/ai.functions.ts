import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createAiProvider } from "./ai-gateway.server";

const MODEL = "gpt-4o-mini";

function getModel() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return createAiProvider(key)(MODEL);
}

async function loadSourcesText(supabase: any, notebookId: string) {
  const { data } = await supabase
    .from("sources")
    .select("title, kind, content, url")
    .eq("notebook_id", notebookId);
  const blocks = (data ?? []).map(
    (s: any) =>
      `# ${s.title} (${s.kind})${s.url ? `\nURL: ${s.url}` : ""}\n${s.content ?? ""}`.slice(0, 12000),
  );
  return blocks.join("\n\n---\n\n").slice(0, 60000);
}

export const generateArtifact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        notebook_id: z.string().uuid(),
        kind: z.enum(["notes", "quiz", "flashcards", "podcast", "summary"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const text = await loadSourcesText(context.supabase, data.notebook_id);
    if (!text.trim()) throw new Error("Add at least one source before generating.");

    const model = getModel();
    let title = "";
    let payload: unknown = null;

    if (data.kind === "notes" || data.kind === "summary") {
      const isSummary = data.kind === "summary";
      const { text: md } = await generateText({
        model,
        prompt: `You are an elite study-notes writer. Read the materials below and produce ${
          isSummary ? "a crisp 250-word executive summary" : "comprehensive, beautifully structured study notes in Markdown with headings, bullets, and key terms in **bold**"
        }.\n\nMATERIALS:\n${text}`,
      });
      title = isSummary ? "Executive Summary" : "Study Notes";
      payload = { markdown: md };
    } else if (data.kind === "quiz") {
      const quiz = await generateJsonWithRetry(
        model,
        `Create a challenging multiple-choice quiz (6-10 questions) testing deep understanding of the materials. Each question MUST have exactly 4 options and a correct_index between 0 and 3. Make distractors plausible.\n\nMATERIALS:\n${text}\n\nReturn ONLY valid JSON in this exact shape: {"title": string, "questions": [{"question": string, "options": [string, string, string, string], "correct_index": number, "explanation": string}]}`,
      );
      const parsed = z
        .object({
          title: z.string().optional(),
          questions: z
            .array(
              z.object({
                question: z.string(),
                options: z.array(z.string()).min(2).max(6),
                correct_index: z.number().int().min(0),
                explanation: z.string().optional().default(""),
              }),
            )
            .min(1),
        })
        .parse(quiz);
      title = parsed.title || "Practice Quiz";
      payload = parsed;
    } else if (data.kind === "flashcards") {
      const deck = await generateJsonWithRetry(
        model,
        `Create 10-16 high-quality flashcards (front = concept/term/question, back = concise answer) from these materials. Cover the most important ideas.\n\nMATERIALS:\n${text}\n\nReturn ONLY valid JSON in this exact shape: {"title": string, "cards": [{"front": string, "back": string}]}`,
      );
      const parsed = z
        .object({
          title: z.string().optional(),
          cards: z.array(z.object({ front: z.string(), back: z.string() })).min(1),
        })
        .parse(deck);
      title = parsed.title || "Flashcards";
      payload = parsed;
    } else if (data.kind === "podcast") {
      const { text: script } = await generateText({
        model,
        prompt: `Write a 4-minute conversational podcast script between two hosts (HOST A and HOST B) that explains the key ideas from these materials in an engaging, accessible way. Format each line as "HOST A: ..." or "HOST B: ...".\n\nMATERIALS:\n${text}`,
      });
      title = "AI Podcast Script";
      payload = { script };
    }

    const { data: art, error } = await context.supabase
      .from("artifacts")
      .insert({
        notebook_id: data.notebook_id,
        user_id: context.userId,
        kind: data.kind,
        title,
        data: payload as any,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return art;
  });

async function generateJsonWithRetry(model: any, prompt: string): Promise<any> {
  const { text } = await generateText({ model, prompt });
  return parseJsonLoose(text);
}

function parseJsonLoose(s: string): any {
  let t = s.trim();
  // strip code fences
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // extract first {...} block if extra prose
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first > 0 || last < t.length - 1) {
    if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1);
  }
  return JSON.parse(t);
}

export const generateLearningPath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ notebook_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const text = await loadSourcesText(context.supabase, data.notebook_id);
    if (!text.trim()) throw new Error("Add at least one source before generating a path.");

    const model = getModel();
      const raw = await generateJsonWithRetry(
        model,
        `Design an in-depth Duolingo-style learning path from the materials. Requirements:\n- 8 to 12 progressive lessons, easiest to hardest, no overlap.\n- Each lesson has: title, learning objective, a 3-4 sentence concept explanation, and 6 to 9 multiple-choice exercises.\n- Each exercise has exactly 4 options, a correct_index 0-3, and a short \"explanation\" (1-2 sentences) describing WHY the correct option is right and the common wrong one is wrong.\n- Vary exercise styles (definition recall, applied scenario, "which is NOT", best-fit, compare/contrast).\n\nMATERIALS:\n${text}\n\nReturn ONLY valid JSON in this exact shape: {"lessons": [{"title": string, "objective": string, "concept": string, "exercises": [{"prompt": string, "options": [string, string, string, string], "correct_index": number, "explanation": string}]}]}`,
      );
    const output = z
      .object({
        lessons: z
          .array(
            z.object({
              title: z.string(),
              objective: z.string(),
              concept: z.string(),
              exercises: z
                .array(
                  z.object({
                    prompt: z.string(),
                    options: z.array(z.string()).min(2).max(6),
                    correct_index: z.number().int().min(0),
                      explanation: z.string().optional().default(""),
                  }),
                )
                .min(1),
            }),
          )
          .min(1),
      })
      .parse(raw);

    // Wipe old lessons and insert new
    await context.supabase.from("lessons").delete().eq("notebook_id", data.notebook_id);
    const rows = output.lessons.map((l, i) => ({
      notebook_id: data.notebook_id,
      user_id: context.userId,
      position: i,
      title: l.title,
      objective: l.objective,
      content: { concept: l.concept, exercises: l.exercises },
      status: i === 0 ? "available" : "locked",
    }));
    const { error } = await context.supabase.from("lessons").insert(rows);
    if (error) throw new Error(error.message);
    return { count: rows.length };
  });