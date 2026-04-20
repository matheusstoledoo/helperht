CREATE TABLE meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  nutrition_plan_id uuid REFERENCES nutrition_plans(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  meal_index integer NOT NULL,
  meal_name text,
  completed boolean DEFAULT true,
  notes text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_meal_logs" ON meal_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "prof_read_meal_logs" ON meal_logs
  FOR SELECT USING (
    patient_id IN (
      SELECT patient_id FROM professional_patient_links
      WHERE professional_id = auth.uid() AND status = 'active'
    )
  );