import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listNotebooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notebooks")
      .select("id, title, emoji, description, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createNotebook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ title: z.string().min(1).max(120), emoji: z.string().optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: nb, error } = await context.supabase
      .from("notebooks")
      .insert({ user_id: context.userId, title: data.title, emoji: data.emoji ?? "📘" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return nb;
  });

export const deleteNotebook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("notebooks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getNotebook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const [nb, sources, artifacts, lessons] = await Promise.all([
      context.supabase.from("notebooks").select("*").eq("id", data.id).single(),
      context.supabase
        .from("sources")
        .select("*")
        .eq("notebook_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("artifacts")
        .select("*")
        .eq("notebook_id", data.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("lessons")
        .select("*")
        .eq("notebook_id", data.id)
        .order("position", { ascending: true }),
    ]);
    if (nb.error) throw new Error(nb.error.message);
    return {
      notebook: nb.data,
      sources: sources.data ?? [],
      artifacts: artifacts.data ?? [],
      lessons: lessons.data ?? [],
    };
  });

export const addSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        notebook_id: z.string().uuid(),
        kind: z.enum(["text", "file", "url", "video"]),
        title: z.string().min(1).max(240),
        content: z.string().max(200000).optional(),
        url: z.string().url().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: src, error } = await context.supabase
      .from("sources")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase
      .from("notebooks")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.notebook_id);
    return src;
  });

export const deleteSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const completeLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), score: z.number().min(0).max(100) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: lesson, error } = await context.supabase
      .from("lessons")
      .update({ status: "completed", score: data.score })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    // Unlock next
    if (lesson) {
      await context.supabase
        .from("lessons")
        .update({ status: "available" })
        .eq("notebook_id", lesson.notebook_id)
        .eq("position", lesson.position + 1)
        .eq("status", "locked");
    }
    // Add XP
    const xpGain = Math.max(10, Math.round(data.score / 2));
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("xp, streak")
      .eq("id", context.userId)
      .single();
    if (profile) {
      await context.supabase
        .from("profiles")
        .update({ xp: (profile.xp ?? 0) + xpGain, streak: (profile.streak ?? 0) + 1 })
        .eq("id", context.userId);
    }
    return { ok: true, xpGain };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("id", context.userId)
      .single();
    return data;
  });