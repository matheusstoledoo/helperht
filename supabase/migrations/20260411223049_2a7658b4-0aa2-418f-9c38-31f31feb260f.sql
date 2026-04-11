
-- Vitals log table
CREATE TABLE public.vitals_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vital_type TEXT NOT NULL CHECK (vital_type IN ('pa', 'glicemia', 'peso', 'sintoma')),
  systolic INTEGER,
  diastolic INTEGER,
  heart_rate INTEGER,
  glucose_value NUMERIC,
  glucose_moment TEXT CHECK (glucose_moment IN ('jejum', 'pos_refeicao', NULL)),
  weight_value NUMERIC,
  symptoms TEXT[],
  wellbeing_score INTEGER CHECK (wellbeing_score IS NULL OR (wellbeing_score >= 1 AND wellbeing_score <= 10)),
  alert_generated BOOLEAN NOT NULL DEFAULT false,
  alert_severity TEXT CHECK (alert_severity IN ('warning', 'critical', NULL)),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vitals_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own vitals"
  ON public.vitals_log FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients can insert own vitals"
  ON public.vitals_log FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Professionals can view linked patient vitals"
  ON public.vitals_log FOR SELECT
  USING (
    public.professional_has_access_to_patient(auth.uid(), patient_id)
  );

CREATE INDEX idx_vitals_log_patient ON public.vitals_log(patient_id, created_at DESC);

-- Vitals alerts table
CREATE TABLE public.vitals_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vital_log_id UUID REFERENCES public.vitals_log(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  message TEXT NOT NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vitals_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patients can view own alerts"
  ON public.vitals_alerts FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients can update own alerts"
  ON public.vitals_alerts FOR UPDATE
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients can insert own alerts"
  ON public.vitals_alerts FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Professionals can view linked patient alerts"
  ON public.vitals_alerts FOR SELECT
  USING (
    public.professional_has_access_to_patient(auth.uid(), patient_id)
  );

CREATE INDEX idx_vitals_alerts_patient ON public.vitals_alerts(patient_id, created_at DESC);
