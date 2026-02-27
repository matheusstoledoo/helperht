import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiagnosisInput {
  id: string;
  name: string;
  icd_code?: string;
  status: string;
}

interface TreatmentInput {
  id: string;
  name: string;
  dosage?: string;
  status: string;
}

interface PatientData {
  patientId: string;
  diagnoses: DiagnosisInput[];
  treatments: TreatmentInput[];
  freeText?: string;
  demographics?: {
    age?: number;
    sex?: string;
  };
}

interface ExtractedConcept {
  original_term: string;
  normalized_term: string;
  concept_type: string;
  mesh_term?: string;
  icd_code?: string;
  confidence_score: number;
}

interface PICOQuery {
  patient: string;
  intervention: string;
  comparison: string;
  outcome: string;
}

interface EvidenceResult {
  pubmed_id: string;
  pmc_id?: string;
  doi?: string;
  title: string;
  authors: string[];
  journal: string;
  publication_date: string;
  study_type: string;
  relevance_score: number;
  source_url: string;
  clinical_summary?: string;
  abstract?: string;
  full_text_available?: boolean;
}

interface SearchResponse {
  success: boolean;
  searchId: string;
  query: string;
  pico: PICOQuery;
  concepts: ExtractedConcept[];
  results: EvidenceResult[];
  totalResults: number;
  fullTextAvailable?: number;
  durationMs: number;
  error?: string;
}

export const useEvidenceSearch = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchEvidence = async (patientData: PatientData): Promise<SearchResponse | null> => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('[Evidence] Starting search for patient:', patientData.patientId);

      const { data, error: invokeError } = await supabase.functions.invoke('search-evidence', {
        body: patientData,
      });

      if (invokeError) {
        console.error('[Evidence] Function error:', invokeError);
        throw new Error(invokeError.message || 'Falha ao buscar evidências');
      }

      if (!data.success) {
        throw new Error(data.error || 'Falha ao buscar evidências');
      }

      console.log('[Evidence] Search completed:', data.totalResults, 'results');
      setResults(data);

      toast.success('Busca concluída', {
        description: `${data.totalResults} evidências encontradas em ${(data.durationMs / 1000).toFixed(1)}s`,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[Evidence] Search error:', errorMessage);
      setError(errorMessage);

      toast.error('Erro na busca de evidências', {
        description: errorMessage,
      });

      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchDetails = async (searchId: string) => {
    try {
      const [
        { data: searchData },
        { data: conceptsData },
        { data: resultsData },
      ] = await Promise.all([
        supabase
          .from('evidence_searches')
          .select('*')
          .eq('id', searchId)
          .single(),
        supabase
          .from('extracted_concepts')
          .select('*')
          .eq('search_id', searchId),
        supabase
          .from('evidence_results')
          .select('*')
          .eq('search_id', searchId)
          .order('relevance_score', { ascending: false }),
      ]);

      return {
        search: searchData,
        concepts: conceptsData || [],
        results: resultsData || [],
      };
    } catch (err) {
      console.error('[Evidence] Error fetching search details:', err);
      return null;
    }
  };

  const markResultAsViewed = async (resultId: string) => {
    try {
      await supabase
        .from('evidence_results')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', resultId);
    } catch (err) {
      console.error('[Evidence] Error marking result as viewed:', err);
    }
  };

  return {
    searchEvidence,
    fetchSearchDetails,
    markResultAsViewed,
    loading,
    results,
    error,
  };
};
