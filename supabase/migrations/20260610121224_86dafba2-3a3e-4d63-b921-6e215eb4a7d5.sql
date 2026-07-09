DROP POLICY IF EXISTS "public quizzes viewable" ON public.quizzes;
DROP POLICY IF EXISTS "creators manage quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "questions viewable with quiz" ON public.questions;
DROP POLICY IF EXISTS "creators manage questions" ON public.questions;
DROP POLICY IF EXISTS "sessions readable by all" ON public.sessions;
DROP POLICY IF EXISTS "hosts manage sessions" ON public.sessions;
DROP POLICY IF EXISTS "participants readable by all" ON public.participants;
DROP POLICY IF EXISTS "responses readable by all" ON public.responses;
DROP POLICY IF EXISTS "profiles viewable by all" ON public.profiles;
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;

CREATE POLICY "public quizzes viewable"
ON public.quizzes
FOR SELECT
TO authenticated
USING (visibility = 'public' OR creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "creators manage quizzes"
ON public.quizzes
FOR ALL
TO authenticated
USING (creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "questions viewable with quiz"
ON public.questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_id
      AND (q.visibility = 'public' OR q.creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
);

CREATE POLICY "creators manage questions"
ON public.questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_id
      AND (q.creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_id
      AND (q.creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  )
);

CREATE POLICY "sessions readable by all"
ON public.sessions
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "hosts manage sessions"
ON public.sessions
FOR ALL
TO authenticated
USING (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (host_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "participants readable by all"
ON public.participants
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "responses readable by all"
ON public.responses
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "profiles viewable by all"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "users update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "users view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);