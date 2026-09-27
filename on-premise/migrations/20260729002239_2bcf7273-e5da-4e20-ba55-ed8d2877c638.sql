
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('platform_admin','institution_admin','teacher','student');
CREATE TYPE public.institution_status AS ENUM ('pending','active','suspended','expired');
CREATE TYPE public.payment_status AS ENUM ('pending','accepted','rejected','suspended');
CREATE TYPE public.question_type AS ENUM ('mcq','truefalse','short');

-- ============ INSTITUTIONS ============
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  wilaya text NOT NULL,
  commune text NOT NULL,
  address text,
  phone text NOT NULL,
  email text NOT NULL,
  logo_url text,
  primary_color text,
  status public.institution_status NOT NULL DEFAULT 'pending',
  subscription_end date,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutions TO authenticated;
GRANT ALL ON public.institutions TO service_role;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_unique ON public.profiles (lower(email));
CREATE UNIQUE INDEX profiles_phone_unique ON public.profiles (phone) WHERE phone IS NOT NULL AND phone <> '';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_institution()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT institution_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'platform_admin');
$$;

CREATE OR REPLACE FUNCTION public.is_institution_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'institution_admin');
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ POLICIES: institutions / profiles / roles ============
CREATE POLICY "members read own institution" ON public.institutions FOR SELECT TO authenticated
  USING (id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "platform admin manages institutions" ON public.institutions FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "institution admin updates own" ON public.institutions FOR UPDATE TO authenticated
  USING (id = public.current_institution() AND public.is_institution_admin())
  WITH CHECK (id = public.current_institution() AND public.is_institution_admin());

CREATE POLICY "read profiles in institution" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin()
         OR (institution_id IS NOT NULL AND institution_id = public.current_institution()));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_platform_admin()) WITH CHECK (true);
CREATE POLICY "insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "read roles in institution" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin()
         OR institution_id = public.current_institution());

-- ============ PAYMENTS / SUBSCRIPTIONS ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 7000,
  method text NOT NULL DEFAULT 'CCP',
  paid_at date NOT NULL DEFAULT current_date,
  proof_url text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  note text,
  reviewed_at timestamptz,
  expires_at date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institution reads own payments" ON public.payments FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "institution admin creates payment" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (institution_id = public.current_institution() AND public.is_institution_admin());
CREATE POLICY "platform admin manages payments" ON public.payments FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- ============ CLASSES / SUBJECTS ============
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  stage text,
  stream text,
  specialty text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read classes" ON public.classes FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "admin manages classes" ON public.classes FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND public.is_institution_admin())
  WITH CHECK (institution_id = public.current_institution() AND public.is_institution_admin());

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  teacher_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read subjects" ON public.subjects FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "admin manages subjects" ON public.subjects FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND public.is_institution_admin())
  WITH CHECK (institution_id = public.current_institution() AND public.is_institution_admin());
CREATE POLICY "teacher adds own subject" ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (institution_id = public.current_institution() AND teacher_id = auth.uid());
CREATE POLICY "teacher updates own subject" ON public.subjects FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid()) WITH CHECK (teacher_id = auth.uid());

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read enrollments" ON public.enrollments FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "admin manages enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND public.is_institution_admin())
  WITH CHECK (institution_id = public.current_institution() AND public.is_institution_admin());

-- ============ LESSONS / FILES ============
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  content text,
  video_url text,
  pdf_url text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read lessons" ON public.lessons FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR (institution_id = public.current_institution()
    AND (published = true OR teacher_id = auth.uid() OR public.is_institution_admin())));
CREATE POLICY "teacher manages lessons" ON public.lessons FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND teacher_id = auth.uid())
  WITH CHECK (institution_id = public.current_institution() AND teacher_id = auth.uid());

CREATE TABLE public.lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_completions TO authenticated;
GRANT ALL ON public.lesson_completions TO service_role;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read completions" ON public.lesson_completions FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "student marks completion" ON public.lesson_completions FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read files" ON public.files FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "owner manages files" ON public.files FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND owner_id = auth.uid())
  WITH CHECK (institution_id = public.current_institution() AND owner_id = auth.uid());

-- ============ EXAMS (MCQ) ============
CREATE TABLE public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 30,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read exams" ON public.exams FOR SELECT TO authenticated
  USING (public.is_platform_admin() OR (institution_id = public.current_institution()
    AND (published = true OR teacher_id = auth.uid() OR public.is_institution_admin())));
CREATE POLICY "teacher manages exams" ON public.exams FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND teacher_id = auth.uid())
  WITH CHECK (institution_id = public.current_institution() AND teacher_id = auth.uid());

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  text text NOT NULL,
  type public.question_type NOT NULL DEFAULT 'mcq',
  points numeric NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read questions" ON public.questions FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "teacher manages questions" ON public.questions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid()));

CREATE TABLE public.options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.options TO authenticated;
GRANT ALL ON public.options TO service_role;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read options" ON public.options FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "teacher manages options" ON public.options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.questions q JOIN public.exams e ON e.id = q.exam_id
                 WHERE q.id = question_id AND e.teacher_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.questions q JOIN public.exams e ON e.id = q.exam_id
                 WHERE q.id = question_id AND e.teacher_id = auth.uid()));

CREATE TABLE public.attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score numeric,
  max_score numeric,
  UNIQUE (exam_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempts TO authenticated;
GRANT ALL ON public.attempts TO service_role;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student reads own attempt" ON public.attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.is_platform_admin()
    OR (institution_id = public.current_institution()
        AND (public.is_institution_admin()
             OR EXISTS (SELECT 1 FROM public.exams e WHERE e.id = exam_id AND e.teacher_id = auth.uid()))));
CREATE POLICY "student writes own attempt" ON public.attempts FOR ALL TO authenticated
  USING (student_id = auth.uid() AND institution_id = public.current_institution())
  WITH CHECK (student_id = auth.uid() AND institution_id = public.current_institution());

CREATE TABLE public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_id uuid REFERENCES public.options(id) ON DELETE SET NULL,
  text_answer text,
  is_correct boolean,
  awarded numeric NOT NULL DEFAULT 0,
  UNIQUE (attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempt_answers TO authenticated;
GRANT ALL ON public.attempt_answers TO service_role;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read attempt answers" ON public.attempt_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = attempt_id
                 AND (a.student_id = auth.uid()
                      OR EXISTS (SELECT 1 FROM public.exams e WHERE e.id = a.exam_id AND e.teacher_id = auth.uid())
                      OR public.is_institution_admin() OR public.is_platform_admin())));
CREATE POLICY "student writes own answers" ON public.attempt_answers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.attempts a WHERE a.id = attempt_id AND a.student_id = auth.uid()));

-- ============ ANNOUNCEMENTS / SCHEDULE / CONTRACTS / SUPPORT ============
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read announcements" ON public.announcements FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "author manages announcements" ON public.announcements FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND author_id = auth.uid())
  WITH CHECK (institution_id = public.current_institution() AND author_id = auth.uid());

CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id uuid,
  day_of_week smallint NOT NULL,
  start_time time NOT NULL,
  end_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedules TO authenticated;
GRANT ALL ON public.schedules TO service_role;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read schedules" ON public.schedules FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "admin manages schedules" ON public.schedules FOR ALL TO authenticated
  USING (institution_id = public.current_institution() AND public.is_institution_admin())
  WITH CHECK (institution_id = public.current_institution() AND public.is_institution_admin());

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  body text NOT NULL,
  institution_signature text,
  platform_signature text,
  qr_payload text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read contracts" ON public.contracts FOR SELECT TO authenticated
  USING (institution_id = public.current_institution() OR public.is_platform_admin());
CREATE POLICY "institution admin signs" ON public.contracts FOR UPDATE TO authenticated
  USING (institution_id = public.current_institution() AND public.is_institution_admin())
  WITH CHECK (institution_id = public.current_institution() AND public.is_institution_admin());
CREATE POLICY "platform admin manages contracts" ON public.contracts FOR ALL TO authenticated
  USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  institution_name text,
  wilaya text,
  commune text,
  address text,
  phone text NOT NULL,
  email text NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform admin reads support" ON public.support_messages FOR SELECT TO authenticated
  USING (public.is_platform_admin());
