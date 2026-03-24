
-- Table for professional-patient link requests
CREATE TABLE public.professional_patient_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, patient_id)
);

ALTER TABLE public.professional_patient_links ENABLE ROW LEVEL SECURITY;

-- Professionals can insert links
CREATE POLICY "Professionals can create links"
  ON public.professional_patient_links FOR INSERT
  TO authenticated
  WITH CHECK (
    professional_id = auth.uid()
    AND has_role(auth.uid(), 'professional'::app_role)
  );

-- Professionals can view their own links
CREATE POLICY "Professionals can view their links"
  ON public.professional_patient_links FOR SELECT
  TO authenticated
  USING (
    professional_id = auth.uid()
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Patients can update links (approve/reject)
CREATE POLICY "Patients can update their links"
  ON public.professional_patient_links FOR UPDATE
  TO authenticated
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Patients can delete links
CREATE POLICY "Users can delete their links"
  ON public.professional_patient_links FOR DELETE
  TO authenticated
  USING (
    professional_id = auth.uid()
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RPC for searching patients with link status
CREATE OR REPLACE FUNCTION public.search_patients_for_linking(
  _professional_id uuid,
  _search_name text
)
RETURNS TABLE (
  patient_id uuid,
  patient_user_id uuid,
  patient_name text,
  link_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS patient_id,
    p.user_id AS patient_user_id,
    u.name AS patient_name,
    ppl.status AS link_status
  FROM patients p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN professional_patient_links ppl
    ON ppl.patient_id = p.id
    AND ppl.professional_id = _professional_id
  WHERE u.name ILIKE '%' || _search_name || '%'
    AND u.role = 'patient'
  ORDER BY u.name
  LIMIT 20;
$$;
