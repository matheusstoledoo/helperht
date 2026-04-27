
-- Profissionais/admins podem ler patient_goals dos pacientes vinculados
CREATE POLICY "Professionals can view linked patient goals"
ON public.patient_goals
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'professional'::app_role)
   AND professional_has_access_to_patient(auth.uid(), patient_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Profissionais/admins podem ler patient_insights dos pacientes vinculados
-- (patient_insights.patient_id = auth.uid() do paciente)
CREATE POLICY "Professionals can view linked patient insights"
ON public.patient_insights
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'professional'::app_role)
   AND EXISTS (
     SELECT 1 FROM public.patients p
     WHERE p.user_id = patient_insights.patient_id
       AND professional_has_access_to_patient(auth.uid(), p.id)
   ))
  OR has_role(auth.uid(), 'admin'::app_role)
);
