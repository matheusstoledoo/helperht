-- Ensure user_roles can't have duplicate entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

-- Bootstrap public user + roles + patient row (without touching auth schema triggers)
CREATE OR REPLACE FUNCTION public.bootstrap_user_profile(
  _name text,
  _cpf text,
  _role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid;
  _email text;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _role NOT IN ('patient'::public.app_role, 'professional'::public.app_role) THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  _email := NULLIF(COALESCE(auth.jwt() ->> 'email', ''), '');

  -- Upsert into public.users (UI/support data; authorization must rely on user_roles)
  INSERT INTO public.users (id, email, name, role, cpf)
  VALUES (
    _uid,
    _email,
    COALESCE(NULLIF(btrim(_name), ''), _email, 'Usuário'),
    (_role::text)::public.user_role,
    NULLIF(regexp_replace(COALESCE(_cpf, ''), '[^0-9]', '', 'g'), '')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.users.email),
        name = COALESCE(EXCLUDED.name, public.users.name),
        cpf = COALESCE(EXCLUDED.cpf, public.users.cpf),
        role = EXCLUDED.role,
        updated_at = now();

  -- Ensure the chosen role exists and remove conflicting patient/professional role
  DELETE FROM public.user_roles
   WHERE user_id = _uid
     AND role IN ('patient'::public.app_role, 'professional'::public.app_role)
     AND role <> _role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- If patient, ensure a patients row exists
  IF _role = 'patient'::public.app_role THEN
    INSERT INTO public.patients (user_id, birthdate)
    VALUES (_uid, CURRENT_DATE)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;