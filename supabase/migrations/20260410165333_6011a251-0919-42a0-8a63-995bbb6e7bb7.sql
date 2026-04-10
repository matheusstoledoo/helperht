CREATE POLICY "Patients can delete their own documents"
ON public.documents
FOR DELETE
TO public
USING (
  (patient_id)::uuid IN (
    SELECT patients.id FROM patients WHERE patients.user_id = auth.uid()
  )
);