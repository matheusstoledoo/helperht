
-- Lab results extracted from uploaded documents
CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  marker_name text NOT NULL,
  marker_category text DEFAULT 'other', -- hemograma, bioquimica, lipidico, tireoide, inflamatorios, hormonal, other
  value numeric,
  value_text text, -- for non-numeric results
  unit text,
  reference_min numeric,
  reference_max numeric,
  reference_text text, -- for textual reference ranges
  collection_date date NOT NULL DEFAULT CURRENT_DATE,
  lab_name text,
  status text DEFAULT 'normal', -- normal, attention, abnormal
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lab results"
  ON public.lab_results FOR SELECT
  USING (
    user_id = auth.uid()
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert their own lab results"
  ON public.lab_results FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can update their own lab results"
  ON public.lab_results FOR UPDATE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete their own lab results"
  ON public.lab_results FOR DELETE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

-- Nutrition plans extracted from uploaded documents
CREATE TABLE public.nutrition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  professional_name text,
  professional_registry text, -- CRN
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  total_calories numeric,
  carbs_grams numeric,
  carbs_percent numeric,
  protein_grams numeric,
  protein_percent numeric,
  fat_grams numeric,
  fat_percent numeric,
  meals jsonb DEFAULT '[]'::jsonb, -- [{name, time, foods: [{item, quantity, unit}]}]
  restrictions text[],
  recommended_foods text[],
  avoided_foods text[],
  supplements jsonb DEFAULT '[]'::jsonb,
  observations text,
  status text DEFAULT 'active', -- active, expired, archived
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nutrition plans"
  ON public.nutrition_plans FOR SELECT
  USING (
    user_id = auth.uid()
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert their own nutrition plans"
  ON public.nutrition_plans FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can update their own nutrition plans"
  ON public.nutrition_plans FOR UPDATE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete their own nutrition plans"
  ON public.nutrition_plans FOR DELETE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

-- Training plans extracted from uploaded documents
CREATE TABLE public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  professional_name text,
  professional_registry text, -- CREF
  sport text, -- musculacao, corrida, ciclismo, natacao, triatlo, funcional, outro
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  frequency_per_week integer,
  sessions jsonb DEFAULT '[]'::jsonb, -- [{day, name, exercises: [{name, sets, reps, load, rest, notes}]}]
  periodization_notes text,
  observations text,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training plans"
  ON public.training_plans FOR SELECT
  USING (
    user_id = auth.uid()
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert their own training plans"
  ON public.training_plans FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can update their own training plans"
  ON public.training_plans FOR UPDATE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete their own training plans"
  ON public.training_plans FOR DELETE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

-- Supplements log for athletes
CREATE TABLE public.supplements_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  timing text NOT NULL, -- pre_treino, durante_treino, pos_treino, manha, tarde, noite
  product text NOT NULL,
  quantity text,
  notes text,
  training_plan_id uuid REFERENCES public.training_plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.supplements_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own supplements"
  ON public.supplements_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can insert their own supplements"
  ON public.supplements_log FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can update their own supplements"
  ON public.supplements_log FOR UPDATE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete their own supplements"
  ON public.supplements_log FOR DELETE
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'professional')
    OR has_role(auth.uid(), 'admin')
  );

-- Document extraction results (stores AI-extracted data before user confirmation)
CREATE TABLE public.document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  extraction_status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, confirmed
  raw_text text,
  extracted_data jsonb DEFAULT '{}'::jsonb, -- full structured extraction
  suggested_category text,
  confidence_score numeric,
  document_date date,
  professional_name text,
  professional_registry text,
  specialty text,
  institution text,
  error_message text,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own extractions"
  ON public.document_extractions FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own extractions"
  ON public.document_extractions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own extractions"
  ON public.document_extractions FOR UPDATE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own extractions"
  ON public.document_extractions FOR DELETE
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_lab_results_updated_at BEFORE UPDATE ON public.lab_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_nutrition_plans_updated_at BEFORE UPDATE ON public.nutrition_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_plans_updated_at BEFORE UPDATE ON public.training_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_document_extractions_updated_at BEFORE UPDATE ON public.document_extractions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
