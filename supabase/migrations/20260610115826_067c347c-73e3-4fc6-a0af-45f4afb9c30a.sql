
-- Grants for Data API (anon + authenticated). Students play as anon.
GRANT SELECT ON public.sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;

GRANT SELECT ON public.questions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;

GRANT SELECT ON public.quizzes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT ALL ON public.quizzes TO service_role;

GRANT SELECT ON public.participants TO anon, authenticated;
GRANT INSERT, UPDATE ON public.participants TO authenticated;
GRANT ALL ON public.participants TO service_role;

GRANT SELECT ON public.responses TO anon, authenticated;
GRANT INSERT, UPDATE ON public.responses TO authenticated;
GRANT ALL ON public.responses TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Allow guest students to read quiz + questions while a session exists for that quiz
CREATE POLICY "questions viewable during session"
  ON public.questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.quiz_id = questions.quiz_id));

CREATE POLICY "quizzes viewable during session"
  ON public.quizzes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.quiz_id = quizzes.id));

-- Add questions to realtime so host UI reflects question changes too
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
