-- Create goals table
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  target_date DATE,
  completed_date DATE,
  progress INTEGER DEFAULT 0,
  public_notes TEXT,
  private_notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Professionals can insert goals"
ON public.goals
FOR INSERT
WITH CHECK (
  (get_user_role(auth.uid()) = 'professional'::user_role) OR 
  (get_user_role(auth.uid()) = 'admin'::user_role)
);

CREATE POLICY "Professionals can update goals"
ON public.goals
FOR UPDATE
USING (
  (get_user_role(auth.uid()) = 'professional'::user_role) OR 
  (get_user_role(auth.uid()) = 'admin'::user_role)
);

CREATE POLICY "Professionals can delete goals"
ON public.goals
FOR DELETE
USING (
  (get_user_role(auth.uid()) = 'professional'::user_role) OR 
  (get_user_role(auth.uid()) = 'admin'::user_role)
);

CREATE POLICY "Users can view relevant goals"
ON public.goals
FOR SELECT
USING (
  (patient_id IN (SELECT patients.id FROM patients WHERE patients.user_id = auth.uid())) OR 
  has_role(auth.uid(), 'professional'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_goals_patient_id ON public.goals(patient_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_goals_created_by ON public.goals(created_by);