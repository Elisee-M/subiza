
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_disabled(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT disabled FROM public.profiles WHERE id = _user_id), false)
$$;
REVOKE EXECUTE ON FUNCTION public.is_disabled(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Superadmin manages profiles" ON public.profiles;
CREATE POLICY "Superadmin manages profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Superadmin manages roles" ON public.user_roles;
CREATE POLICY "Superadmin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Superadmin manages quizzes" ON public.quizzes;
CREATE POLICY "Superadmin manages quizzes" ON public.quizzes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Superadmin manages sessions" ON public.sessions;
CREATE POLICY "Superadmin manages sessions" ON public.sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

DO $$
DECLARE
  sa_id uuid;
  sa_email text := 'superadmin@csabaza.app';
  sa_password text := 'SuperAdmin@CSAbaza2026!';
BEGIN
  SELECT id INTO sa_id FROM auth.users WHERE email = sa_email;
  IF sa_id IS NULL THEN
    sa_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', sa_id, 'authenticated', 'authenticated',
      sa_email, crypt(sa_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Super Admin"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), sa_id,
      jsonb_build_object('sub', sa_id::text, 'email', sa_email, 'email_verified', true),
      'email', sa_email, now(), now(), now()
    );
  END IF;

  INSERT INTO public.profiles (id, name, email)
  VALUES (sa_id, 'Super Admin', sa_email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (sa_id, 'superadmin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (sa_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
