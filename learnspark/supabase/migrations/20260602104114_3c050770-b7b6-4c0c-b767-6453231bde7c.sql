
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile upsert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Notebooks (workspaces)
CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  emoji TEXT DEFAULT '📘',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notebooks TO authenticated;
GRANT ALL ON public.notebooks TO service_role;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notebooks" ON public.notebooks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sources (file/text/url/video)
CREATE TABLE public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text','file','url','video')),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sources TO authenticated;
GRANT ALL ON public.sources TO service_role;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sources" ON public.sources FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Generated artifacts (notes, quiz, flashcards, podcast)
CREATE TABLE public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('notes','quiz','flashcards','podcast','summary')),
  title TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artifacts TO authenticated;
GRANT ALL ON public.artifacts TO service_role;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own artifacts" ON public.artifacts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Learning path: lessons in order with progress
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES public.notebooks ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  objective TEXT,
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked','available','completed')),
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lessons" ON public.lessons FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notebooks_user ON public.notebooks(user_id, updated_at DESC);
CREATE INDEX idx_sources_notebook ON public.sources(notebook_id);
CREATE INDEX idx_artifacts_notebook ON public.artifacts(notebook_id, kind);
CREATE INDEX idx_lessons_notebook ON public.lessons(notebook_id, position);
