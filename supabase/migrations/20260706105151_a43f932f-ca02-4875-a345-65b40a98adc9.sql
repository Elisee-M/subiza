ALTER TYPE public.question_type ADD VALUE IF NOT EXISTS 'matching';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS auto_advance boolean NOT NULL DEFAULT true;