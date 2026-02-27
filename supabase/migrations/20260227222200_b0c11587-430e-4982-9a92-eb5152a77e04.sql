
-- Allow patients to INSERT their own diagnoses
CREATE POLICY "Patients can insert their own diagnoses"
ON public.diagnoses
FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
);

-- Allow patients to DELETE their own self-registered diagnoses (no consultation_id)
CREATE POLICY "Patients can delete their own self-registered diagnoses"
ON public.diagnoses
FOR DELETE
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
  AND consultation_id IS NULL
);

-- Allow patients to INSERT their own treatments
CREATE POLICY "Patients can insert their own treatments"
ON public.treatments
FOR INSERT
WITH CHECK (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
);

-- Allow patients to DELETE their own self-registered treatments (no consultation_id)
CREATE POLICY "Patients can delete their own self-registered treatments"
ON public.treatments
FOR DELETE
USING (
  patient_id IN (
    SELECT id FROM patients WHERE user_id = auth.uid()
  )
  AND consultation_id IS NULL
);

-- Create patient_reminders table for custom alerts
CREATE TABLE public.patient_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reminder_type TEXT NOT NULL DEFAULT 'custom',
  reminder_time TEXT,
  recurrence TEXT DEFAULT 'none',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view their own reminders"
ON public.patient_reminders
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Patients can insert their own reminders"
ON public.patient_reminders
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Patients can delete their own reminders"
ON public.patient_reminders
FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Patients can update their own reminders"
ON public.patient_reminders
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Professionals can view patient reminders"
ON public.patient_reminders
FOR SELECT
USING (has_role(auth.uid(), 'professional'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
