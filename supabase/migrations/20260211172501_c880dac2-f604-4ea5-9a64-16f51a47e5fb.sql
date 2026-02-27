
-- Allow patients to view care_trails they are enrolled in
CREATE POLICY "Patients can view trails they are enrolled in"
ON public.care_trails
FOR SELECT
USING (
  id IN (
    SELECT te.trail_id
    FROM trail_enrollments te
    JOIN patients p ON te.patient_id = p.id
    WHERE p.user_id = auth.uid()
  )
);
