-- Enum for trail status
CREATE TYPE public.trail_status AS ENUM ('draft', 'active', 'paused', 'archived');

-- Enum for contact point types
CREATE TYPE public.contact_point_type AS ENUM (
  'educational_message',
  'open_question',
  'closed_question', 
  'structured_data',
  'reminder',
  'professional_task'
);

-- Enum for structured data types
CREATE TYPE public.structured_data_type AS ENUM (
  'glucose',
  'weight',
  'blood_pressure',
  'mood',
  'pain_scale',
  'adherence',
  'custom_numeric',
  'custom_text'
);

-- Enum for trail trigger types
CREATE TYPE public.trail_trigger_type AS ENUM (
  'manual',
  'first_consultation',
  'post_report',
  'specific_diagnosis',
  'patient_tag'
);

-- Enum for trail exit conditions
CREATE TYPE public.trail_exit_type AS ENUM (
  'duration_complete',
  'all_points_complete',
  'return_scheduled',
  'goals_reached',
  'manual'
);

-- Enum for enrollment status
CREATE TYPE public.trail_enrollment_status AS ENUM (
  'active',
  'completed',
  'paused',
  'exited'
);

-- Main care trails table
CREATE TABLE public.care_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  specialty TEXT,
  clinical_condition TEXT,
  clinical_objective TEXT,
  duration_days INTEGER NOT NULL DEFAULT 30,
  status trail_status NOT NULL DEFAULT 'draft',
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_category TEXT,
  icon TEXT DEFAULT 'route',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trail contact points (steps in the trail)
CREATE TABLE public.trail_contact_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES public.care_trails(id) ON DELETE CASCADE,
  day_offset INTEGER NOT NULL DEFAULT 0,
  hour_of_day INTEGER NOT NULL DEFAULT 9,
  minute_of_day INTEGER NOT NULL DEFAULT 0,
  point_type contact_point_type NOT NULL,
  title TEXT NOT NULL,
  message_content TEXT,
  structured_data_type structured_data_type,
  question_options JSONB, -- For closed questions: ["option1", "option2"]
  requires_response BOOLEAN NOT NULL DEFAULT false,
  reminder_hours_if_no_response INTEGER,
  notify_professional_if_no_response BOOLEAN DEFAULT false,
  continue_if_no_response BOOLEAN DEFAULT true,
  critical_keywords TEXT[], -- Words that trigger alerts
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conditional logic rules for contact points
CREATE TABLE public.trail_conditional_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_point_id UUID NOT NULL REFERENCES public.trail_contact_points(id) ON DELETE CASCADE,
  condition_type TEXT NOT NULL, -- 'response_equals', 'response_greater_than', 'response_less_than', 'response_contains'
  condition_value TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'send_message', 'create_alert', 'add_to_trail', 'create_task'
  action_config JSONB NOT NULL, -- Configuration for the action
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trail triggers (when to start a trail)
CREATE TABLE public.trail_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES public.care_trails(id) ON DELETE CASCADE,
  trigger_type trail_trigger_type NOT NULL,
  trigger_config JSONB, -- Additional config (e.g., specific diagnosis code)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trail exit conditions
CREATE TABLE public.trail_exit_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES public.care_trails(id) ON DELETE CASCADE,
  exit_type trail_exit_type NOT NULL,
  exit_config JSONB, -- Additional config (e.g., target metrics)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Patient enrollments in trails
CREATE TABLE public.trail_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES public.care_trails(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  enrolled_by UUID NOT NULL REFERENCES public.users(id),
  status trail_enrollment_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  exited_at TIMESTAMP WITH TIME ZONE,
  exit_reason TEXT,
  current_day INTEGER NOT NULL DEFAULT 0,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Patient responses to contact points
CREATE TABLE public.trail_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.trail_enrollments(id) ON DELETE CASCADE,
  contact_point_id UUID NOT NULL REFERENCES public.trail_contact_points(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL, -- 'text', 'numeric', 'choice', 'file'
  response_text TEXT,
  response_numeric DECIMAL,
  response_choice TEXT,
  response_file_path TEXT,
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_critical BOOLEAN DEFAULT false,
  critical_keyword_matched TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alerts generated from trail interactions
CREATE TABLE public.trail_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.trail_enrollments(id) ON DELETE CASCADE,
  contact_point_id UUID REFERENCES public.trail_contact_points(id),
  response_id UUID REFERENCES public.trail_responses(id),
  alert_type TEXT NOT NULL, -- 'critical_response', 'no_response', 'goal_deviation', 'custom'
  alert_message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scheduled dispatches for contact points
CREATE TABLE public.trail_scheduled_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.trail_enrollments(id) ON DELETE CASCADE,
  contact_point_id UUID NOT NULL REFERENCES public.trail_contact_points(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  is_dispatched BOOLEAN NOT NULL DEFAULT false,
  dispatch_result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.care_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_contact_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_conditional_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_exit_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_scheduled_dispatches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for care_trails
CREATE POLICY "Professionals can view their own trails and templates"
ON public.care_trails FOR SELECT
USING (professional_id = auth.uid() OR is_template = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can create trails"
ON public.care_trails FOR INSERT
WITH CHECK (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can update their own trails"
ON public.care_trails FOR UPDATE
USING (professional_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can delete their own trails"
ON public.care_trails FOR DELETE
USING (professional_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- RLS Policies for trail_contact_points
CREATE POLICY "Users can view contact points of accessible trails"
ON public.trail_contact_points FOR SELECT
USING (
  trail_id IN (
    SELECT id FROM public.care_trails 
    WHERE professional_id = auth.uid() OR is_template = true OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Professionals can manage contact points"
ON public.trail_contact_points FOR ALL
USING (
  trail_id IN (
    SELECT id FROM public.care_trails 
    WHERE professional_id = auth.uid() OR has_role(auth.uid(), 'admin')
  )
);

-- RLS Policies for trail_conditional_rules
CREATE POLICY "Users can view rules of accessible trails"
ON public.trail_conditional_rules FOR SELECT
USING (
  contact_point_id IN (
    SELECT tcp.id FROM public.trail_contact_points tcp
    JOIN public.care_trails ct ON tcp.trail_id = ct.id
    WHERE ct.professional_id = auth.uid() OR ct.is_template = true OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Professionals can manage conditional rules"
ON public.trail_conditional_rules FOR ALL
USING (
  contact_point_id IN (
    SELECT tcp.id FROM public.trail_contact_points tcp
    JOIN public.care_trails ct ON tcp.trail_id = ct.id
    WHERE ct.professional_id = auth.uid() OR has_role(auth.uid(), 'admin')
  )
);

-- RLS Policies for trail_triggers
CREATE POLICY "Users can view triggers of accessible trails"
ON public.trail_triggers FOR SELECT
USING (
  trail_id IN (
    SELECT id FROM public.care_trails 
    WHERE professional_id = auth.uid() OR is_template = true OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Professionals can manage triggers"
ON public.trail_triggers FOR ALL
USING (
  trail_id IN (
    SELECT id FROM public.care_trails 
    WHERE professional_id = auth.uid() OR has_role(auth.uid(), 'admin')
  )
);

-- RLS Policies for trail_exit_conditions
CREATE POLICY "Users can view exit conditions of accessible trails"
ON public.trail_exit_conditions FOR SELECT
USING (
  trail_id IN (
    SELECT id FROM public.care_trails 
    WHERE professional_id = auth.uid() OR is_template = true OR has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Professionals can manage exit conditions"
ON public.trail_exit_conditions FOR ALL
USING (
  trail_id IN (
    SELECT id FROM public.care_trails 
    WHERE professional_id = auth.uid() OR has_role(auth.uid(), 'admin')
  )
);

-- RLS Policies for trail_enrollments
CREATE POLICY "Professionals can view enrollments in their trails"
ON public.trail_enrollments FOR SELECT
USING (
  trail_id IN (SELECT id FROM public.care_trails WHERE professional_id = auth.uid())
  OR patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Professionals can create enrollments"
ON public.trail_enrollments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can update enrollments"
ON public.trail_enrollments FOR UPDATE
USING (
  trail_id IN (SELECT id FROM public.care_trails WHERE professional_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Professionals can delete enrollments"
ON public.trail_enrollments FOR DELETE
USING (
  trail_id IN (SELECT id FROM public.care_trails WHERE professional_id = auth.uid())
  OR has_role(auth.uid(), 'admin')
);

-- RLS Policies for trail_responses
CREATE POLICY "Users can view their own responses or responses in their trails"
ON public.trail_responses FOR SELECT
USING (
  enrollment_id IN (
    SELECT te.id FROM public.trail_enrollments te
    JOIN public.care_trails ct ON te.trail_id = ct.id
    WHERE ct.professional_id = auth.uid()
  )
  OR enrollment_id IN (
    SELECT te.id FROM public.trail_enrollments te
    JOIN public.patients p ON te.patient_id = p.id
    WHERE p.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can create responses to their enrollments"
ON public.trail_responses FOR INSERT
WITH CHECK (
  enrollment_id IN (
    SELECT te.id FROM public.trail_enrollments te
    JOIN public.patients p ON te.patient_id = p.id
    WHERE p.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'professional')
  OR has_role(auth.uid(), 'admin')
);

-- RLS Policies for trail_alerts
CREATE POLICY "Professionals can view alerts from their trails"
ON public.trail_alerts FOR SELECT
USING (
  enrollment_id IN (
    SELECT te.id FROM public.trail_enrollments te
    JOIN public.care_trails ct ON te.trail_id = ct.id
    WHERE ct.professional_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "System can create alerts"
ON public.trail_alerts FOR INSERT
WITH CHECK (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can update alerts"
ON public.trail_alerts FOR UPDATE
USING (
  enrollment_id IN (
    SELECT te.id FROM public.trail_enrollments te
    JOIN public.care_trails ct ON te.trail_id = ct.id
    WHERE ct.professional_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- RLS Policies for trail_scheduled_dispatches
CREATE POLICY "Professionals can view scheduled dispatches"
ON public.trail_scheduled_dispatches FOR SELECT
USING (
  enrollment_id IN (
    SELECT te.id FROM public.trail_enrollments te
    JOIN public.care_trails ct ON te.trail_id = ct.id
    WHERE ct.professional_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "System can manage scheduled dispatches"
ON public.trail_scheduled_dispatches FOR ALL
USING (has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin'));

-- Create updated_at triggers
CREATE TRIGGER update_care_trails_updated_at
BEFORE UPDATE ON public.care_trails
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trail_contact_points_updated_at
BEFORE UPDATE ON public.trail_contact_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trail_enrollments_updated_at
BEFORE UPDATE ON public.trail_enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_care_trails_professional ON public.care_trails(professional_id);
CREATE INDEX idx_care_trails_status ON public.care_trails(status);
CREATE INDEX idx_care_trails_template ON public.care_trails(is_template) WHERE is_template = true;
CREATE INDEX idx_trail_contact_points_trail ON public.trail_contact_points(trail_id);
CREATE INDEX idx_trail_contact_points_sort ON public.trail_contact_points(trail_id, sort_order);
CREATE INDEX idx_trail_enrollments_trail ON public.trail_enrollments(trail_id);
CREATE INDEX idx_trail_enrollments_patient ON public.trail_enrollments(patient_id);
CREATE INDEX idx_trail_enrollments_status ON public.trail_enrollments(status);
CREATE INDEX idx_trail_responses_enrollment ON public.trail_responses(enrollment_id);
CREATE INDEX idx_trail_alerts_enrollment ON public.trail_alerts(enrollment_id);
CREATE INDEX idx_trail_alerts_unread ON public.trail_alerts(is_read) WHERE is_read = false;
CREATE INDEX idx_trail_scheduled_dispatches_pending ON public.trail_scheduled_dispatches(scheduled_for) WHERE is_dispatched = false;