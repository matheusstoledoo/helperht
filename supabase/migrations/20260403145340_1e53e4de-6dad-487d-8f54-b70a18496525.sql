
-- Helper function: check if professional has active link to a patient
CREATE OR REPLACE FUNCTION public.professional_has_access_to_patient(_professional_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.professional_patient_links
    WHERE professional_id = _professional_id
      AND patient_id = _patient_id
      AND status = 'active'
  )
$$;

-- ============ PATIENTS ============
DROP POLICY IF EXISTS "Users can view relevant patient data" ON public.patients;
CREATE POLICY "Users can view relevant patient data" ON public.patients
FOR SELECT USING (
  auth.uid() = user_id
  OR (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Professionals can only insert patients they will link to
DROP POLICY IF EXISTS "Professionals can insert patients" ON public.patients;
CREATE POLICY "Professionals can insert patients" ON public.patients
FOR INSERT WITH CHECK (
  get_user_role(auth.uid()) = 'professional'::user_role
  OR get_user_role(auth.uid()) = 'admin'::user_role
);

DROP POLICY IF EXISTS "Professionals can update patients" ON public.patients;
CREATE POLICY "Professionals can update patients" ON public.patients
FOR UPDATE USING (
  auth.uid() = user_id
  OR (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============ DIAGNOSES ============
DROP POLICY IF EXISTS "Users can view relevant diagnoses" ON public.diagnoses;
CREATE POLICY "Users can view relevant diagnoses" ON public.diagnoses
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  OR (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can insert diagnoses" ON public.diagnoses;
CREATE POLICY "Professionals can insert diagnoses" ON public.diagnoses
FOR INSERT WITH CHECK (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can update diagnoses" ON public.diagnoses;
CREATE POLICY "Professionals can update diagnoses" ON public.diagnoses
FOR UPDATE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Patients can delete their own diagnoses" ON public.diagnoses;
DROP POLICY IF EXISTS "Professionals can delete diagnoses" ON public.diagnoses;
CREATE POLICY "Professionals can delete diagnoses" ON public.diagnoses
FOR DELETE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============ TREATMENTS ============
DROP POLICY IF EXISTS "Users can view relevant treatments" ON public.treatments;
CREATE POLICY "Users can view relevant treatments" ON public.treatments
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  OR (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can insert treatments" ON public.treatments;
CREATE POLICY "Professionals can insert treatments" ON public.treatments
FOR INSERT WITH CHECK (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can update treatments" ON public.treatments;
CREATE POLICY "Professionals can update treatments" ON public.treatments
FOR UPDATE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can delete treatments" ON public.treatments;
CREATE POLICY "Professionals can delete treatments" ON public.treatments
FOR DELETE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============ CONSULTATIONS ============
DROP POLICY IF EXISTS "Users can view relevant consultations" ON public.consultations;
CREATE POLICY "Users can view relevant consultations" ON public.consultations
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  OR (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can insert consultations" ON public.consultations;
CREATE POLICY "Professionals can insert consultations" ON public.consultations
FOR INSERT WITH CHECK (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can update consultations" ON public.consultations;
CREATE POLICY "Professionals can update consultations" ON public.consultations
FOR UPDATE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can delete consultations" ON public.consultations;
CREATE POLICY "Professionals can delete consultations" ON public.consultations
FOR DELETE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============ EXAMS ============
DROP POLICY IF EXISTS "Users can view relevant exams" ON public.exams;
CREATE POLICY "Users can view relevant exams" ON public.exams
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  OR (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can insert exams" ON public.exams;
CREATE POLICY "Professionals can insert exams" ON public.exams
FOR INSERT WITH CHECK (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can update exams" ON public.exams;
CREATE POLICY "Professionals can update exams" ON public.exams
FOR UPDATE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can delete exams" ON public.exams;
CREATE POLICY "Professionals can delete exams" ON public.exams
FOR DELETE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============ GOALS ============
DROP POLICY IF EXISTS "Users can view relevant goals" ON public.goals;
CREATE POLICY "Users can view relevant goals" ON public.goals
FOR SELECT USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  OR (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can insert goals" ON public.goals;
CREATE POLICY "Professionals can insert goals" ON public.goals
FOR INSERT WITH CHECK (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can update goals" ON public.goals;
CREATE POLICY "Professionals can update goals" ON public.goals
FOR UPDATE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can delete goals" ON public.goals;
CREATE POLICY "Professionals can delete goals" ON public.goals
FOR DELETE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ============ DOCUMENTS ============
DROP POLICY IF EXISTS "Users can view relevant documents" ON public.documents;
CREATE POLICY "Users can view relevant documents" ON public.documents
FOR SELECT USING (
  (patient_id::uuid IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  OR (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id::uuid))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can update documents" ON public.documents;
CREATE POLICY "Professionals can update documents" ON public.documents
FOR UPDATE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id::uuid))
  OR has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Professionals can delete documents" ON public.documents;
CREATE POLICY "Professionals can delete documents" ON public.documents
FOR DELETE USING (
  (has_role(auth.uid(), 'professional'::app_role) AND professional_has_access_to_patient(auth.uid(), patient_id::uuid))
  OR has_role(auth.uid(), 'admin'::app_role)
);
