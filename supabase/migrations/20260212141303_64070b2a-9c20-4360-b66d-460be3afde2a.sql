
-- Add recurrence fields to trail_contact_points
ALTER TABLE public.trail_contact_points 
  ADD COLUMN IF NOT EXISTS recurrence_type text NOT NULL DEFAULT 'once',
  ADD COLUMN IF NOT EXISTS recurrence_interval integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_days_of_week integer[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_end_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recurrence_max_occurrences integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS action_category text NOT NULL DEFAULT 'communication';

-- Create trail_task_instances table for tracking professional tasks
CREATE TABLE public.trail_task_instances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES public.trail_enrollments(id) ON DELETE CASCADE,
  contact_point_id uuid NOT NULL REFERENCES public.trail_contact_points(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id),
  professional_id uuid NOT NULL REFERENCES public.users(id),
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL DEFAULT '09:00:00',
  title text NOT NULL,
  description text,
  action_category text NOT NULL DEFAULT 'communication',
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamp with time zone,
  postponed_to date,
  ignored_at timestamp with time zone,
  ignore_reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trail_task_instances ENABLE ROW LEVEL SECURITY;

-- RLS: Professionals can view their own tasks
CREATE POLICY "Professionals can view their own tasks"
ON public.trail_task_instances FOR SELECT
USING (professional_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS: Professionals can update their own tasks
CREATE POLICY "Professionals can update their own tasks"
ON public.trail_task_instances FOR UPDATE
USING (professional_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- RLS: System can create task instances
CREATE POLICY "System can create task instances"
ON public.trail_task_instances FOR INSERT
WITH CHECK (has_role(auth.uid(), 'professional'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS: Professionals can delete their own tasks
CREATE POLICY "Professionals can delete their own tasks"
ON public.trail_task_instances FOR DELETE
USING (professional_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_trail_task_instances_updated_at
BEFORE UPDATE ON public.trail_task_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for efficient queries
CREATE INDEX idx_trail_task_instances_professional_date 
ON public.trail_task_instances(professional_id, scheduled_date, status);

CREATE INDEX idx_trail_task_instances_enrollment 
ON public.trail_task_instances(enrollment_id);
