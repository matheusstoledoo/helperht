
-- =====================================================
-- HELPER: Longitudinal Clinical Data Architecture
-- =====================================================

-- 1) VERSIONING: Add version tracking to care_trails
ALTER TABLE public.care_trails
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- 2) CONTEXT: Enrich trail_enrollments with clinical context
ALTER TABLE public.trail_enrollments
  ADD COLUMN IF NOT EXISTS context text, -- 'consultation', 'surgery', 'chronic_disease'
  ADD COLUMN IF NOT EXISTS context_id uuid, -- optional link to consultation/procedure
  ADD COLUMN IF NOT EXISTS expected_end_date date;

-- 3) ENRICH trail_responses with FHIR-compatible structured payloads
ALTER TABLE public.trail_responses
  ADD COLUMN IF NOT EXISTS structured_payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS unstructured_payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fhir_resource_type text; -- 'Observation', 'Condition', etc.

-- 4) CREATE clinical_events (event-sourced immutable clinical data)
CREATE TABLE public.clinical_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  enrollment_id uuid REFERENCES public.trail_enrollments(id),
  contact_point_id uuid REFERENCES public.trail_contact_points(id),
  response_id uuid REFERENCES public.trail_responses(id),
  event_type text NOT NULL, -- 'symptom_report', 'vital_sign', 'adherence', 'adverse_event', 'exam_upload', 'questionnaire'
  source text NOT NULL DEFAULT 'patient', -- 'patient', 'professional', 'system'
  structured_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  unstructured_payload jsonb DEFAULT '{}'::jsonb,
  fhir_resource_type text, -- 'Observation', 'Condition', 'Procedure', 'Encounter'
  fhir_code_system text, -- 'LOINC', 'SNOMED-CT', 'ICD-10'
  fhir_code text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Immutable: no updated_at, events are append-only
  CONSTRAINT clinical_events_source_check CHECK (source IN ('patient', 'professional', 'system'))
);

-- 5) CREATE patient_outcomes (clinical outcomes tracking)
CREATE TABLE public.patient_outcomes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  enrollment_id uuid REFERENCES public.trail_enrollments(id),
  recorded_by uuid NOT NULL REFERENCES public.users(id),
  outcome_type text NOT NULL, -- 'discharge', 'complication', 'reoperation', 'hospitalization', 'death', 'functional_improvement', 'relapse'
  outcome_date date NOT NULL DEFAULT CURRENT_DATE,
  severity text, -- 'mild', 'moderate', 'severe', 'critical'
  description text,
  clinical_context text,
  structured_data jsonb DEFAULT '{}'::jsonb,
  fhir_resource_type text DEFAULT 'Condition',
  fhir_code_system text,
  fhir_code text,
  related_diagnosis_id uuid REFERENCES public.diagnoses(id),
  related_treatment_id uuid REFERENCES public.treatments(id),
  created_at timestamptz NOT NULL DEFAULT now()
  -- Immutable: no updated_at
);

-- 6) CREATE normalized_clinical_data (terminology mapping)
CREATE TABLE public.normalized_clinical_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinical_event_id uuid REFERENCES public.clinical_events(id),
  patient_outcome_id uuid REFERENCES public.patient_outcomes(id),
  code_system text NOT NULL, -- 'ICD-10', 'LOINC', 'SNOMED-CT', 'TUSS'
  code text NOT NULL,
  display_text text NOT NULL,
  original_text text,
  confidence_score numeric DEFAULT 1.0,
  mapped_by text NOT NULL DEFAULT 'manual', -- 'manual', 'ai', 'system'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7) CREATE audit_log for trail versioning
CREATE TABLE public.trail_version_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trail_id uuid NOT NULL REFERENCES public.care_trails(id),
  version integer NOT NULL,
  snapshot jsonb NOT NULL, -- full trail config at this version
  changed_by uuid NOT NULL REFERENCES public.users(id),
  change_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- clinical_events
ALTER TABLE public.clinical_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own clinical events"
ON public.clinical_events FOR SELECT
USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Professionals can view clinical events"
ON public.clinical_events FOR SELECT
USING (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can insert clinical events"
ON public.clinical_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients can insert their own clinical events"
ON public.clinical_events FOR INSERT
WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

-- patient_outcomes
ALTER TABLE public.patient_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own outcomes"
ON public.patient_outcomes FOR SELECT
USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Professionals can view outcomes"
ON public.patient_outcomes FOR SELECT
USING (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can insert outcomes"
ON public.patient_outcomes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

-- normalized_clinical_data
ALTER TABLE public.normalized_clinical_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can manage normalized data"
ON public.normalized_clinical_data FOR ALL
USING (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Patients can view normalized data linked to their events"
ON public.normalized_clinical_data FOR SELECT
USING (
  clinical_event_id IN (SELECT id FROM clinical_events WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  OR patient_outcome_id IN (SELECT id FROM patient_outcomes WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
);

-- trail_version_history
ALTER TABLE public.trail_version_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view version history of their trails"
ON public.trail_version_history FOR SELECT
USING (trail_id IN (SELECT id FROM care_trails WHERE professional_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can insert version history"
ON public.trail_version_history FOR INSERT
WITH CHECK (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

-- =====================================================
-- INDICES for longitudinal queries and analytics
-- =====================================================

-- Clinical events: patient timeline queries
CREATE INDEX idx_clinical_events_patient_time ON public.clinical_events (patient_id, recorded_at DESC);
CREATE INDEX idx_clinical_events_enrollment ON public.clinical_events (enrollment_id, recorded_at DESC);
CREATE INDEX idx_clinical_events_type ON public.clinical_events (event_type);
CREATE INDEX idx_clinical_events_fhir ON public.clinical_events (fhir_resource_type, fhir_code);
CREATE INDEX idx_clinical_events_payload ON public.clinical_events USING GIN (structured_payload);

-- Patient outcomes: cohort analysis queries
CREATE INDEX idx_patient_outcomes_patient ON public.patient_outcomes (patient_id, outcome_date DESC);
CREATE INDEX idx_patient_outcomes_enrollment ON public.patient_outcomes (enrollment_id);
CREATE INDEX idx_patient_outcomes_type ON public.patient_outcomes (outcome_type);
CREATE INDEX idx_patient_outcomes_data ON public.patient_outcomes USING GIN (structured_data);

-- Normalized data: terminology lookups
CREATE INDEX idx_normalized_clinical_data_code ON public.normalized_clinical_data (code_system, code);
CREATE INDEX idx_normalized_clinical_data_event ON public.normalized_clinical_data (clinical_event_id);
CREATE INDEX idx_normalized_clinical_data_outcome ON public.normalized_clinical_data (patient_outcome_id);

-- Trail versioning
CREATE INDEX idx_trail_version_history_trail ON public.trail_version_history (trail_id, version DESC);

-- Existing table improvements for longitudinal queries
CREATE INDEX IF NOT EXISTS idx_trail_responses_enrollment_time ON public.trail_responses (enrollment_id, responded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trail_enrollments_patient ON public.trail_enrollments (patient_id, created_at DESC);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.clinical_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_outcomes;
