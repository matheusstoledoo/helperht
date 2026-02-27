CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'patient',
    'professional',
    'admin'
);


--
-- Name: diagnosis_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.diagnosis_status AS ENUM (
    'active',
    'resolved',
    'under_observation'
);


--
-- Name: exam_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.exam_status AS ENUM (
    'requested',
    'in_progress',
    'completed',
    'cancelled'
);


--
-- Name: treatment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.treatment_status AS ENUM (
    'active',
    'completed',
    'discontinued',
    'pending'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'patient',
    'professional',
    'admin'
);


--
-- Name: get_primary_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_primary_user_role(_user_id uuid) RETURNS public.app_role
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'professional' THEN 2
      WHEN 'patient' THEN 3
    END
  LIMIT 1
$$;


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(user_id uuid) RETURNS public.user_role
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_role_value user_role;
  primary_role app_role;
BEGIN
  -- Get from user_roles table first
  SELECT public.get_primary_user_role(user_id) INTO primary_role;
  
  -- Cast app_role to user_role
  user_role_value := primary_role::text::user_role;
  
  RETURN user_role_value;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Inserir na tabela users
  INSERT INTO public.users (id, email, name, role, cpf)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'::user_role),
    NEW.raw_user_meta_data->>'cpf'
  );
  
  -- Inserir role na tabela user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'patient'::app_role)
  );
  
  -- Se for paciente, criar registro na tabela patients
  IF COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient'::user_role) = 'patient' THEN
    INSERT INTO public.patients (user_id, birthdate)
    VALUES (
      NEW.id,
      COALESCE((NEW.raw_user_meta_data->>'birthdate')::date, CURRENT_DATE)
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_cpf(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_cpf() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
BEGIN
  -- Remove any formatting characters (dots, hyphens)
  NEW.cpf := regexp_replace(NEW.cpf, '[^0-9]', '', 'g');
  
  -- Check if CPF has exactly 11 digits
  IF NEW.cpf IS NOT NULL AND length(NEW.cpf) != 11 THEN
    RAISE EXCEPTION 'CPF deve conter exatamente 11 dígitos';
  END IF;
  
  -- Check for invalid sequences (all same digits)
  IF NEW.cpf ~ '^(\d)\1{10}$' THEN
    RAISE EXCEPTION 'CPF inválido';
  END IF;
  
  RETURN NEW;
END;
$_$;


SET default_table_access_method = heap;

--
-- Name: consultation_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consultation_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    text text NOT NULL,
    achieved boolean DEFAULT false NOT NULL,
    achieved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consultation_orientations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_orientations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consultation_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consultation_pendencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultation_pendencies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consultation_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    text text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: consultations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consultations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    professional_id uuid NOT NULL,
    consultation_date timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    chief_complaint text,
    physical_examination text,
    assessment text,
    plan text,
    follow_up_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.consultations REPLICA IDENTITY FULL;


--
-- Name: diagnoses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnoses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    name text NOT NULL,
    icd_code text,
    status public.diagnosis_status DEFAULT 'active'::public.diagnosis_status NOT NULL,
    explanation_text text,
    severity text,
    diagnosed_date date DEFAULT CURRENT_DATE NOT NULL,
    resolved_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    previous_diagnosis_id uuid,
    change_reason text,
    public_notes text,
    private_notes text,
    justification text,
    CONSTRAINT diagnoses_severity_check CHECK ((severity = ANY (ARRAY['mild'::text, 'moderate'::text, 'severe'::text])))
);

ALTER TABLE ONLY public.diagnoses REPLICA IDENTITY FULL;


--
-- Name: document_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    comment_text text NOT NULL,
    commented_by text NOT NULL,
    commented_by_role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT document_comments_commented_by_role_check CHECK ((commented_by_role = ANY (ARRAY['patient'::text, 'professional'::text])))
);

ALTER TABLE ONLY public.document_comments REPLICA IDENTITY FULL;


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id text NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text NOT NULL,
    file_size integer,
    category text NOT NULL,
    uploaded_by text NOT NULL,
    uploaded_by_role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    consultation_id uuid,
    document_type text,
    description text,
    is_public boolean DEFAULT true NOT NULL,
    CONSTRAINT documents_category_check CHECK ((category = ANY (ARRAY['lab_results'::text, 'prescriptions'::text, 'reports'::text, 'imaging'::text, 'other'::text]))),
    CONSTRAINT documents_uploaded_by_role_check CHECK ((uploaded_by_role = ANY (ARRAY['patient'::text, 'professional'::text])))
);

ALTER TABLE ONLY public.documents REPLICA IDENTITY FULL;


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    name text NOT NULL,
    exam_type text,
    status public.exam_status DEFAULT 'requested'::public.exam_status NOT NULL,
    requested_date timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_date timestamp with time zone,
    completed_date timestamp with time zone,
    result text,
    result_file_path text,
    findings text,
    interpretation text,
    requested_by uuid,
    performed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.exams REPLICA IDENTITY FULL;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    birthdate date NOT NULL,
    medical_record_number text,
    emergency_contact_name text,
    emergency_contact_phone text,
    blood_type text,
    allergies text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address text
);

ALTER TABLE ONLY public.patients REPLICA IDENTITY FULL;


--
-- Name: treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    consultation_id uuid,
    diagnosis_id uuid,
    name text NOT NULL,
    description text,
    status public.treatment_status DEFAULT 'active'::public.treatment_status NOT NULL,
    explanation_text text,
    dosage text,
    frequency text,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    end_date date,
    prescribed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    previous_treatment_id uuid,
    change_reason text,
    public_notes text,
    private_notes text
);

ALTER TABLE ONLY public.treatments REPLICA IDENTITY FULL;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'patient'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.user_role DEFAULT 'patient'::public.user_role NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cpf text,
    profession text,
    specialty text
);

ALTER TABLE ONLY public.users REPLICA IDENTITY FULL;


--
-- Name: consultation_goals consultation_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_goals
    ADD CONSTRAINT consultation_goals_pkey PRIMARY KEY (id);


--
-- Name: consultation_orientations consultation_orientations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_orientations
    ADD CONSTRAINT consultation_orientations_pkey PRIMARY KEY (id);


--
-- Name: consultation_pendencies consultation_pendencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_pendencies
    ADD CONSTRAINT consultation_pendencies_pkey PRIMARY KEY (id);


--
-- Name: consultations consultations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_pkey PRIMARY KEY (id);


--
-- Name: diagnoses diagnoses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_pkey PRIMARY KEY (id);


--
-- Name: document_comments document_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_comments
    ADD CONSTRAINT document_comments_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: patients patients_medical_record_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_medical_record_number_key UNIQUE (medical_record_number);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: patients patients_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_user_id_key UNIQUE (user_id);


--
-- Name: treatments treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: users users_cpf_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_cpf_key UNIQUE (cpf);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_consultations_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_date ON public.consultations USING btree (consultation_date);


--
-- Name: idx_consultations_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_patient_id ON public.consultations USING btree (patient_id);


--
-- Name: idx_consultations_professional_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consultations_professional_id ON public.consultations USING btree (professional_id);


--
-- Name: idx_diagnoses_consultation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diagnoses_consultation_id ON public.diagnoses USING btree (consultation_id);


--
-- Name: idx_diagnoses_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diagnoses_patient_id ON public.diagnoses USING btree (patient_id);


--
-- Name: idx_diagnoses_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_diagnoses_status ON public.diagnoses USING btree (status);


--
-- Name: idx_document_comments_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_comments_document_id ON public.document_comments USING btree (document_id);


--
-- Name: idx_documents_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_category ON public.documents USING btree (category);


--
-- Name: idx_documents_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_created_at ON public.documents USING btree (created_at);


--
-- Name: idx_documents_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_patient_id ON public.documents USING btree (patient_id);


--
-- Name: idx_exams_consultation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_consultation_id ON public.exams USING btree (consultation_id);


--
-- Name: idx_exams_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_patient_id ON public.exams USING btree (patient_id);


--
-- Name: idx_exams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_status ON public.exams USING btree (status);


--
-- Name: idx_patients_medical_record; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_medical_record ON public.patients USING btree (medical_record_number);


--
-- Name: idx_patients_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patients_user_id ON public.patients USING btree (user_id);


--
-- Name: idx_treatments_diagnosis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatments_diagnosis_id ON public.treatments USING btree (diagnosis_id);


--
-- Name: idx_treatments_patient_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatments_patient_id ON public.treatments USING btree (patient_id);


--
-- Name: idx_treatments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatments_status ON public.treatments USING btree (status);


--
-- Name: idx_users_cpf; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_cpf ON public.users USING btree (cpf);


--
-- Name: idx_users_profession; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_profession ON public.users USING btree (profession) WHERE (role = 'professional'::public.user_role);


--
-- Name: idx_users_specialty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_specialty ON public.users USING btree (specialty) WHERE (role = 'professional'::public.user_role);


--
-- Name: consultation_goals update_consultation_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consultation_goals_updated_at BEFORE UPDATE ON public.consultation_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultation_pendencies update_consultation_pendencies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consultation_pendencies_updated_at BEFORE UPDATE ON public.consultation_pendencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consultations update_consultations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: diagnoses update_diagnoses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_diagnoses_updated_at BEFORE UPDATE ON public.diagnoses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exams update_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patients update_patients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: treatments update_treatments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users validate_cpf_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_cpf_trigger BEFORE INSERT OR UPDATE OF cpf ON public.users FOR EACH ROW WHEN ((new.cpf IS NOT NULL)) EXECUTE FUNCTION public.validate_cpf();


--
-- Name: consultation_goals consultation_goals_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_goals
    ADD CONSTRAINT consultation_goals_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;


--
-- Name: consultation_goals consultation_goals_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_goals
    ADD CONSTRAINT consultation_goals_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: consultation_orientations consultation_orientations_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_orientations
    ADD CONSTRAINT consultation_orientations_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;


--
-- Name: consultation_orientations consultation_orientations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_orientations
    ADD CONSTRAINT consultation_orientations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: consultation_pendencies consultation_pendencies_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_pendencies
    ADD CONSTRAINT consultation_pendencies_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE CASCADE;


--
-- Name: consultation_pendencies consultation_pendencies_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultation_pendencies
    ADD CONSTRAINT consultation_pendencies_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: consultations consultations_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: consultations consultations_professional_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consultations
    ADD CONSTRAINT consultations_professional_id_fkey FOREIGN KEY (professional_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: diagnoses diagnoses_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE SET NULL;


--
-- Name: diagnoses diagnoses_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: diagnoses diagnoses_previous_diagnosis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnoses
    ADD CONSTRAINT diagnoses_previous_diagnosis_id_fkey FOREIGN KEY (previous_diagnosis_id) REFERENCES public.diagnoses(id);


--
-- Name: document_comments document_comments_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_comments
    ADD CONSTRAINT document_comments_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE SET NULL;


--
-- Name: exams exams_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE SET NULL;


--
-- Name: exams exams_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: exams exams_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: patients patients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: treatments treatments_consultation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_consultation_id_fkey FOREIGN KEY (consultation_id) REFERENCES public.consultations(id) ON DELETE SET NULL;


--
-- Name: treatments treatments_diagnosis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_diagnosis_id_fkey FOREIGN KEY (diagnosis_id) REFERENCES public.diagnoses(id) ON DELETE SET NULL;


--
-- Name: treatments treatments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: treatments treatments_prescribed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_prescribed_by_fkey FOREIGN KEY (prescribed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: treatments treatments_previous_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_previous_treatment_id_fkey FOREIGN KEY (previous_treatment_id) REFERENCES public.treatments(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users Anyone can insert users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert users" ON public.users FOR INSERT WITH CHECK (true);


--
-- Name: users Anyone can view users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);


--
-- Name: document_comments Authenticated users can add comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can add comments" ON public.document_comments FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: documents Authenticated users can upload documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can upload documents" ON public.documents FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: user_roles Only admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Only admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: document_comments Professionals can delete comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete comments" ON public.document_comments FOR DELETE USING ((public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: consultations Professionals can delete consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete consultations" ON public.consultations FOR DELETE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: diagnoses Professionals can delete diagnoses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete diagnoses" ON public.diagnoses FOR DELETE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: documents Professionals can delete documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete documents" ON public.documents FOR DELETE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: exams Professionals can delete exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete exams" ON public.exams FOR DELETE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultation_goals Professionals can delete goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete goals" ON public.consultation_goals FOR DELETE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultation_orientations Professionals can delete orientations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete orientations" ON public.consultation_orientations FOR DELETE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultation_pendencies Professionals can delete pendencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete pendencies" ON public.consultation_pendencies FOR DELETE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: treatments Professionals can delete treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can delete treatments" ON public.treatments FOR DELETE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultations Professionals can insert consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can insert consultations" ON public.consultations FOR INSERT WITH CHECK (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: diagnoses Professionals can insert diagnoses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can insert diagnoses" ON public.diagnoses FOR INSERT WITH CHECK (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: exams Professionals can insert exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can insert exams" ON public.exams FOR INSERT WITH CHECK (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultation_goals Professionals can insert goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can insert goals" ON public.consultation_goals FOR INSERT WITH CHECK (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultation_orientations Professionals can insert orientations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can insert orientations" ON public.consultation_orientations FOR INSERT WITH CHECK (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: patients Professionals can insert patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can insert patients" ON public.patients FOR INSERT WITH CHECK (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultation_pendencies Professionals can insert pendencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can insert pendencies" ON public.consultation_pendencies FOR INSERT WITH CHECK (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: treatments Professionals can insert treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can insert treatments" ON public.treatments FOR INSERT WITH CHECK (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultations Professionals can update consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can update consultations" ON public.consultations FOR UPDATE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: diagnoses Professionals can update diagnoses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can update diagnoses" ON public.diagnoses FOR UPDATE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: documents Professionals can update documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can update documents" ON public.documents FOR UPDATE USING ((public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: exams Professionals can update exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can update exams" ON public.exams FOR UPDATE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultation_goals Professionals can update goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can update goals" ON public.consultation_goals FOR UPDATE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: patients Professionals can update patients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can update patients" ON public.patients FOR UPDATE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: consultation_pendencies Professionals can update pendencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can update pendencies" ON public.consultation_pendencies FOR UPDATE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: treatments Professionals can update treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Professionals can update treatments" ON public.treatments FOR UPDATE USING (((public.get_user_role(auth.uid()) = 'professional'::public.user_role) OR (public.get_user_role(auth.uid()) = 'admin'::public.user_role)));


--
-- Name: users Users can update their own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own data" ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: document_comments Users can view relevant comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant comments" ON public.document_comments FOR SELECT USING (((document_id IN ( SELECT documents.id
   FROM public.documents
  WHERE ((documents.patient_id)::uuid IN ( SELECT patients.id
           FROM public.patients
          WHERE (patients.user_id = auth.uid()))))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: consultations Users can view relevant consultations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant consultations" ON public.consultations FOR SELECT USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: diagnoses Users can view relevant diagnoses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant diagnoses" ON public.diagnoses FOR SELECT USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: documents Users can view relevant documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant documents" ON public.documents FOR SELECT USING ((((patient_id)::uuid IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: exams Users can view relevant exams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant exams" ON public.exams FOR SELECT USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: consultation_goals Users can view relevant goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant goals" ON public.consultation_goals FOR SELECT USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: consultation_orientations Users can view relevant orientations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant orientations" ON public.consultation_orientations FOR SELECT USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: patients Users can view relevant patient data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant patient data" ON public.patients FOR SELECT USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: consultation_pendencies Users can view relevant pendencies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant pendencies" ON public.consultation_pendencies FOR SELECT USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: treatments Users can view relevant treatments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view relevant treatments" ON public.treatments FOR SELECT USING (((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.user_id = auth.uid()))) OR public.has_role(auth.uid(), 'professional'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: consultation_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultation_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: consultation_orientations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultation_orientations ENABLE ROW LEVEL SECURITY;

--
-- Name: consultation_pendencies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultation_pendencies ENABLE ROW LEVEL SECURITY;

--
-- Name: consultations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

--
-- Name: diagnoses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;

--
-- Name: document_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: exams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: treatments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;