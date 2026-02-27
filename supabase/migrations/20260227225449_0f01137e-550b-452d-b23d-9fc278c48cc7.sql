
-- Fix lab_results SELECT policy: change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own lab results" ON lab_results;
CREATE POLICY "Users can view their own lab results"
ON lab_results FOR SELECT
USING (
  user_id = auth.uid()
  OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix lab_results INSERT policy
DROP POLICY IF EXISTS "Users can insert their own lab results" ON lab_results;
CREATE POLICY "Users can insert their own lab results"
ON lab_results FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix lab_results UPDATE policy
DROP POLICY IF EXISTS "Users can update their own lab results" ON lab_results;
CREATE POLICY "Users can update their own lab results"
ON lab_results FOR UPDATE
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix lab_results DELETE policy
DROP POLICY IF EXISTS "Users can delete their own lab results" ON lab_results;
CREATE POLICY "Users can delete their own lab results"
ON lab_results FOR DELETE
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix diagnoses SELECT policy
DROP POLICY IF EXISTS "Users can view relevant diagnoses" ON diagnoses;
CREATE POLICY "Users can view relevant diagnoses"
ON diagnoses FOR SELECT
USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix diagnoses INSERT policies
DROP POLICY IF EXISTS "Patients can insert their own diagnoses" ON diagnoses;
CREATE POLICY "Patients can insert their own diagnoses"
ON diagnoses FOR INSERT
WITH CHECK (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Professionals can insert diagnoses" ON diagnoses;
CREATE POLICY "Professionals can insert diagnoses"
ON diagnoses FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix diagnoses DELETE policies
DROP POLICY IF EXISTS "Patients can delete their own self-registered diagnoses" ON diagnoses;
CREATE POLICY "Patients can delete their own self-registered diagnoses"
ON diagnoses FOR DELETE
USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  AND consultation_id IS NULL
);

DROP POLICY IF EXISTS "Professionals can delete diagnoses" ON diagnoses;
CREATE POLICY "Professionals can delete diagnoses"
ON diagnoses FOR DELETE
USING (
  has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix diagnoses UPDATE policy
DROP POLICY IF EXISTS "Professionals can update diagnoses" ON diagnoses;
CREATE POLICY "Professionals can update diagnoses"
ON diagnoses FOR UPDATE
USING (
  has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix treatments - check if same issue exists
-- Fix treatments SELECT
DROP POLICY IF EXISTS "Users can view relevant treatments" ON treatments;
CREATE POLICY "Users can view relevant treatments"
ON treatments FOR SELECT
USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix treatments INSERT policies
DROP POLICY IF EXISTS "Patients can insert their own treatments" ON treatments;
CREATE POLICY "Patients can insert their own treatments"
ON treatments FOR INSERT
WITH CHECK (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Professionals can insert treatments" ON treatments;
CREATE POLICY "Professionals can insert treatments"
ON treatments FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix treatments DELETE policies  
DROP POLICY IF EXISTS "Patients can delete their own self-registered treatments" ON treatments;
CREATE POLICY "Patients can delete their own self-registered treatments"
ON treatments FOR DELETE
USING (
  patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  AND consultation_id IS NULL
);

DROP POLICY IF EXISTS "Professionals can delete treatments" ON treatments;
CREATE POLICY "Professionals can delete treatments"
ON treatments FOR DELETE
USING (
  has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix treatments UPDATE policy
DROP POLICY IF EXISTS "Professionals can update treatments" ON treatments;
CREATE POLICY "Professionals can update treatments"
ON treatments FOR UPDATE
USING (
  has_role(auth.uid(), 'professional'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);
