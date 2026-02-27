-- =============================================
-- MÓDULO DE EVIDÊNCIA CIENTÍFICA CONTEXTUALIZADA
-- =============================================

-- Enum para tipos de estudo científico
CREATE TYPE public.study_type AS ENUM (
  'guideline',
  'meta_analysis',
  'systematic_review',
  'randomized_controlled_trial',
  'cohort_study',
  'case_control',
  'case_report',
  'expert_opinion',
  'other'
);

-- Enum para status da busca
CREATE TYPE public.evidence_search_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- Enum para tipo de conceito clínico extraído
CREATE TYPE public.clinical_concept_type AS ENUM (
  'disease',
  'medication',
  'symptom',
  'procedure',
  'lab_test',
  'outcome',
  'demographic',
  'other'
);

-- =============================================
-- TABELA: Buscas de Evidência
-- Registra cada busca realizada por um profissional
-- =============================================
CREATE TABLE public.evidence_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Dados de entrada usados na busca
  input_diagnoses JSONB DEFAULT '[]',
  input_treatments JSONB DEFAULT '[]',
  input_free_text TEXT,
  
  -- Query PICO gerada
  pico_patient TEXT,
  pico_intervention TEXT,
  pico_comparison TEXT,
  pico_outcome TEXT,
  generated_query TEXT,
  
  -- Metadados da busca
  status public.evidence_search_status NOT NULL DEFAULT 'pending',
  total_results INTEGER DEFAULT 0,
  search_duration_ms INTEGER,
  error_message TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- TABELA: Conceitos Clínicos Extraídos
-- Termos normalizados identificados pelo LLM
-- =============================================
CREATE TABLE public.extracted_concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES public.evidence_searches(id) ON DELETE CASCADE,
  
  -- Termo original e normalizado
  original_term TEXT NOT NULL,
  normalized_term TEXT NOT NULL,
  concept_type public.clinical_concept_type NOT NULL,
  
  -- Mapeamentos para vocabulários padrão
  icd_code TEXT,
  mesh_term TEXT,
  snomed_code TEXT,
  
  -- Confiança da extração (0-1)
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABELA: Resultados de Evidência
-- Artigos retornados com scoring de relevância
-- =============================================
CREATE TABLE public.evidence_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES public.evidence_searches(id) ON DELETE CASCADE,
  
  -- Identificadores do artigo
  pubmed_id TEXT,
  doi TEXT,
  pmc_id TEXT,
  
  -- Metadados do artigo
  title TEXT NOT NULL,
  authors JSONB DEFAULT '[]',
  journal TEXT,
  publication_date DATE,
  abstract TEXT,
  
  -- Classificação
  study_type public.study_type DEFAULT 'other',
  evidence_level TEXT,
  
  -- Scoring de relevância (0-100)
  relevance_score INTEGER DEFAULT 0,
  patient_similarity_score INTEGER DEFAULT 0,
  study_quality_score INTEGER DEFAULT 0,
  recency_score INTEGER DEFAULT 0,
  
  -- Resumo gerado para o médico
  clinical_summary TEXT,
  
  -- Link para o artigo
  source_url TEXT,
  
  -- Flag se foi visualizado pelo médico
  viewed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- TABELA: Log de Auditoria Detalhado
-- Para compliance e rastreabilidade
-- =============================================
CREATE TABLE public.evidence_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES public.evidence_searches(id) ON DELETE CASCADE,
  
  -- Ação realizada
  action TEXT NOT NULL,
  action_details JSONB DEFAULT '{}',
  
  -- Dados do paciente usados (anonimizados para log)
  patient_data_used JSONB DEFAULT '{}',
  
  -- Quem realizou
  performed_by UUID NOT NULL REFERENCES public.users(id),
  
  -- IP e user agent (para auditoria)
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================
CREATE INDEX idx_evidence_searches_patient ON public.evidence_searches(patient_id);
CREATE INDEX idx_evidence_searches_professional ON public.evidence_searches(professional_id);
CREATE INDEX idx_evidence_searches_status ON public.evidence_searches(status);
CREATE INDEX idx_evidence_searches_created ON public.evidence_searches(created_at DESC);

CREATE INDEX idx_extracted_concepts_search ON public.extracted_concepts(search_id);
CREATE INDEX idx_extracted_concepts_type ON public.extracted_concepts(concept_type);

CREATE INDEX idx_evidence_results_search ON public.evidence_results(search_id);
CREATE INDEX idx_evidence_results_relevance ON public.evidence_results(relevance_score DESC);
CREATE INDEX idx_evidence_results_pubmed ON public.evidence_results(pubmed_id);

CREATE INDEX idx_evidence_audit_search ON public.evidence_audit_logs(search_id);
CREATE INDEX idx_evidence_audit_performed ON public.evidence_audit_logs(performed_by);
CREATE INDEX idx_evidence_audit_created ON public.evidence_audit_logs(created_at DESC);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Evidence Searches
ALTER TABLE public.evidence_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can insert evidence searches"
ON public.evidence_searches FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Professionals can view their own searches"
ON public.evidence_searches FOR SELECT
USING (
  professional_id = auth.uid() 
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Professionals can update their own searches"
ON public.evidence_searches FOR UPDATE
USING (
  professional_id = auth.uid() 
  OR has_role(auth.uid(), 'admin')
);

-- Extracted Concepts
ALTER TABLE public.extracted_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view concepts from their searches"
ON public.extracted_concepts FOR SELECT
USING (
  search_id IN (
    SELECT id FROM public.evidence_searches 
    WHERE professional_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "System can insert concepts"
ON public.extracted_concepts FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin')
);

-- Evidence Results
ALTER TABLE public.evidence_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view results from their searches"
ON public.evidence_results FOR SELECT
USING (
  search_id IN (
    SELECT id FROM public.evidence_searches 
    WHERE professional_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "System can insert results"
ON public.evidence_results FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Professionals can update results they can view"
ON public.evidence_results FOR UPDATE
USING (
  search_id IN (
    SELECT id FROM public.evidence_searches 
    WHERE professional_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- Audit Logs
ALTER TABLE public.evidence_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view their own audit logs"
ON public.evidence_audit_logs FOR SELECT
USING (
  performed_by = auth.uid() 
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Professionals can insert audit logs"
ON public.evidence_audit_logs FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'professional') OR has_role(auth.uid(), 'admin')
);

-- =============================================
-- FUNÇÃO: Exportar relatório de auditoria
-- =============================================
CREATE OR REPLACE FUNCTION public.export_evidence_audit_report(
  _professional_id UUID,
  _start_date TIMESTAMPTZ DEFAULT NULL,
  _end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verificar se o usuário pode exportar
  IF NOT (
    auth.uid() = _professional_id 
    OR has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'generated_at', now(),
    'professional_id', _professional_id,
    'period', jsonb_build_object(
      'start', COALESCE(_start_date, now() - interval '30 days'),
      'end', COALESCE(_end_date, now())
    ),
    'searches', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'search_id', es.id,
          'patient_id', es.patient_id,
          'created_at', es.created_at,
          'status', es.status,
          'total_results', es.total_results,
          'pico_query', jsonb_build_object(
            'patient', es.pico_patient,
            'intervention', es.pico_intervention,
            'comparison', es.pico_comparison,
            'outcome', es.pico_outcome
          ),
          'concepts_extracted', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'original', ec.original_term,
                'normalized', ec.normalized_term,
                'type', ec.concept_type,
                'confidence', ec.confidence_score
              )
            )
            FROM public.extracted_concepts ec
            WHERE ec.search_id = es.id
          ),
          'results_returned', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'pubmed_id', er.pubmed_id,
                'title', er.title,
                'study_type', er.study_type,
                'relevance_score', er.relevance_score,
                'viewed', er.viewed_at IS NOT NULL
              )
            )
            FROM public.evidence_results er
            WHERE er.search_id = es.id
          ),
          'audit_events', (
            SELECT jsonb_agg(
              jsonb_build_object(
                'action', eal.action,
                'details', eal.action_details,
                'timestamp', eal.created_at
              )
            )
            FROM public.evidence_audit_logs eal
            WHERE eal.search_id = es.id
          )
        )
      )
      FROM public.evidence_searches es
      WHERE es.professional_id = _professional_id
        AND es.created_at >= COALESCE(_start_date, now() - interval '30 days')
        AND es.created_at <= COALESCE(_end_date, now())
    )
  ) INTO result;

  RETURN result;
END;
$$;