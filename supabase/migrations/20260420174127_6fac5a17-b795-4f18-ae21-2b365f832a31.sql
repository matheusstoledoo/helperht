-- Adicionar colunas à tabela users
ALTER TABLE users ADD COLUMN IF NOT EXISTS subspecialty text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS council_number text;

-- Criar tabela de eventos de corrida/prova
CREATE TABLE race_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  sport text NOT NULL,
  event_date date NOT NULL,
  distance_km numeric,
  event_type text DEFAULT 'competicao',
  location text,
  goal text,
  result_notes text,
  planned_tss integer,
  status text DEFAULT 'scheduled',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de logs de treino detalhados
CREATE TABLE workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  training_plan_id uuid REFERENCES training_plans(id),
  race_event_id uuid REFERENCES race_events(id),
  activity_date date NOT NULL,
  activity_name text,
  sport text,
  duration_minutes integer,
  planned_duration_minutes integer,
  distance_km numeric,
  planned_distance_km numeric,
  avg_pace_min_km numeric,
  planned_pace_min_km numeric,
  avg_heart_rate integer,
  max_heart_rate integer,
  min_heart_rate integer,
  calories integer,
  elevation_gain_m numeric,
  hrv_rmssd numeric,
  spo2 numeric,
  perceived_effort integer CHECK (perceived_effort BETWEEN 0 AND 10),
  feeling_score integer CHECK (feeling_score BETWEEN 1 AND 5),
  srpe integer,
  tss numeric,
  planned_tss numeric,
  intensity_factor numeric,
  compliance_pct integer,
  sleep_hours numeric,
  workout_steps jsonb,
  notes text,
  source text DEFAULT 'manual',
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de logs de recuperação
CREATE TABLE recovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  hrv_rmssd numeric,
  resting_heart_rate integer,
  sleep_quality integer CHECK (sleep_quality BETWEEN 1 AND 5),
  sleep_hours numeric,
  disposition_score integer CHECK (disposition_score BETWEEN 0 AND 100),
  energy_score integer CHECK (energy_score BETWEEN 0 AND 100),
  muscle_score integer CHECK (muscle_score BETWEEN 0 AND 100),
  joint_score integer CHECK (joint_score BETWEEN 0 AND 100),
  stress_score integer CHECK (stress_score BETWEEN 1 AND 5),
  free_notes text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- Criar tabela de recomendações profissionais
CREATE TABLE professional_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES auth.users(id),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  workout_log_id uuid REFERENCES workout_logs(id),
  recovery_log_id uuid REFERENCES recovery_logs(id),
  race_event_id uuid REFERENCES race_events(id),
  specialty text NOT NULL,
  dimension text NOT NULL,
  recommendation text NOT NULL,
  priority text DEFAULT 'normal',
  visible_to_patient boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Migrar dados existentes de clinical_events para workout_logs
INSERT INTO workout_logs (
  user_id, patient_id, activity_date, sport,
  duration_minutes, perceived_effort, srpe, notes, source, created_at
)
SELECT
  p.user_id,
  ce.patient_id,
  ce.recorded_at::date,
  (ce.structured_payload->>'workout_type'),
  (ce.structured_payload->>'duration_minutes')::integer,
  (ce.structured_payload->>'rpe')::integer,
  CASE
    WHEN (ce.structured_payload->>'duration_minutes') IS NOT NULL
    AND (ce.structured_payload->>'rpe') IS NOT NULL
    THEN (ce.structured_payload->>'duration_minutes')::integer * (ce.structured_payload->>'rpe')::integer
    ELSE NULL
  END,
  (ce.structured_payload->>'notes'),
  'manual',
  ce.created_at
FROM clinical_events ce
JOIN patients p ON p.id = ce.patient_id
WHERE ce.event_type = 'workout_log'
ON CONFLICT DO NOTHING;

-- Habilitar RLS nas novas tabelas
ALTER TABLE race_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_recommendations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para race_events
CREATE POLICY "user_own_race_events" ON race_events FOR ALL USING (auth.uid() = user_id);

-- Políticas RLS para workout_logs
CREATE POLICY "user_own_workout_logs" ON workout_logs FOR ALL USING (auth.uid() = user_id);

-- Políticas RLS para recovery_logs
CREATE POLICY "user_own_recovery_logs" ON recovery_logs FOR ALL USING (auth.uid() = user_id);

-- Políticas RLS para professional_recommendations
CREATE POLICY "prof_write_recommendations" ON professional_recommendations
  FOR INSERT WITH CHECK (auth.uid() = professional_id);
  
CREATE POLICY "prof_read_recommendations" ON professional_recommendations
  FOR SELECT USING (
    auth.uid() = professional_id OR
    patient_id IN (
      SELECT patient_id FROM professional_patient_links
      WHERE professional_id = auth.uid() AND status = 'active'
    )
  );
  
CREATE POLICY "patient_view_recommendations" ON professional_recommendations
  FOR SELECT USING (
    visible_to_patient = true AND
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );