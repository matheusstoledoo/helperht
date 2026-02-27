-- Enum for methodology assessment quality
CREATE TYPE public.methodology_quality AS ENUM (
  'high',
  'moderate', 
  'low',
  'critically_low'
);

-- Enum for bias risk
CREATE TYPE public.bias_risk AS ENUM (
  'low',
  'some_concerns',
  'high',
  'serious',
  'critical'
);

-- Enum for evidence certainty (GRADE)
CREATE TYPE public.evidence_certainty AS ENUM (
  'high',
  'moderate',
  'low',
  'very_low'
);

-- Enum for clinical applicability
CREATE TYPE public.clinical_applicability AS ENUM (
  'high',
  'moderate',
  'low'
);

-- Table to store full-text analysis of articles
CREATE TABLE public.evidence_quality_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evidence_result_id UUID NOT NULL REFERENCES public.evidence_results(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  analyzed_by UUID NOT NULL REFERENCES public.users(id),
  
  -- Full text access
  full_text_available BOOLEAN NOT NULL DEFAULT false,
  full_text_source TEXT, -- 'pmc', 'unpaywall', 'doi_link'
  pmc_id TEXT,
  
  -- Study type identification
  study_type_detected TEXT NOT NULL, -- systematic_review, rct, observational, etc.
  study_design_details JSONB DEFAULT '{}'::jsonb, -- prospective, retrospective, etc.
  
  -- Methodology Assessment (varies by study type)
  methodology_quality public.methodology_quality,
  methodology_score INTEGER, -- 0-100
  methodology_checklist JSONB DEFAULT '{}'::jsonb, -- Detailed checklist by study type
  methodology_summary TEXT, -- Portuguese summary
  
  -- Bias Risk Assessment
  bias_risk public.bias_risk,
  bias_domains JSONB DEFAULT '{}'::jsonb, -- Domain-level assessments
  bias_summary TEXT, -- Portuguese summary
  
  -- Evidence Level (GRADE)
  evidence_certainty public.evidence_certainty,
  grade_factors JSONB DEFAULT '{}'::jsonb, -- imprecision, indirectness, etc.
  evidence_summary TEXT, -- Portuguese summary
  
  -- Clinical Applicability to Patient
  applicability public.clinical_applicability,
  applicability_factors JSONB DEFAULT '{}'::jsonb, -- population match, intervention, setting
  applicability_summary TEXT, -- Portuguese summary
  
  -- Overall Assessment
  overall_recommendation TEXT, -- Brief recommendation
  strengths TEXT[], -- Key strengths
  limitations TEXT[], -- Key limitations
  
  -- Audit
  analysis_version TEXT DEFAULT 'v1.0',
  llm_model_used TEXT,
  processing_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evidence_quality_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Professionals can view analyses they created"
  ON public.evidence_quality_analyses
  FOR SELECT
  USING (
    analyzed_by = auth.uid() 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Professionals can create analyses"
  ON public.evidence_quality_analyses
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'professional') 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Professionals can update their analyses"
  ON public.evidence_quality_analyses
  FOR UPDATE
  USING (
    analyzed_by = auth.uid() 
    OR has_role(auth.uid(), 'admin')
  );

-- Audit log for quality analyses
CREATE TABLE public.quality_analysis_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.evidence_quality_analyses(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'analysis_started', 'full_text_fetched', 'analysis_completed', etc.
  action_details JSONB DEFAULT '{}'::jsonb,
  performed_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quality_analysis_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view their audit logs"
  ON public.quality_analysis_audit_logs
  FOR SELECT
  USING (
    performed_by = auth.uid() 
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can insert audit logs"
  ON public.quality_analysis_audit_logs
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'professional') 
    OR has_role(auth.uid(), 'admin')
  );

-- Index for fast lookups
CREATE INDEX idx_quality_analyses_result ON public.evidence_quality_analyses(evidence_result_id);
CREATE INDEX idx_quality_analyses_patient ON public.evidence_quality_analyses(patient_id);
CREATE INDEX idx_quality_audit_analysis ON public.quality_analysis_audit_logs(analysis_id);

-- Update trigger for evidence_quality_analyses
CREATE TRIGGER update_evidence_quality_analyses_updated_at
  BEFORE UPDATE ON public.evidence_quality_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();