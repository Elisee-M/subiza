
-- Tighten profiles access
DROP POLICY IF EXISTS "profiles viewable by all" ON public.profiles;
CREATE POLICY "users view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "admins view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Remove public visibility of questions; students will fetch via a server function
DROP POLICY IF EXISTS "questions viewable during session" ON public.questions;

-- Remove public visibility of quizzes mid-session; server function will return safe quiz info
DROP POLICY IF EXISTS "quizzes viewable during session" ON public.quizzes;

-- Restrict response visibility to session host / admins (students don't read this table client-side)
DROP POLICY IF EXISTS "responses readable by all" ON public.responses;
CREATE POLICY "hosts view session responses"
  ON public.responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = responses.session_id
        AND (s.host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- Hide pin_code from anonymous users (students don't need it; they joined via the PIN already)
REVOKE SELECT (pin_code) ON public.sessions FROM anon;
