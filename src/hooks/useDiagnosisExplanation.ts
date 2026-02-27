import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiagnosisData {
  name: string;
  icd_code?: string;
  severity?: string;
}

export const useDiagnosisExplanation = () => {
  const [generating, setGenerating] = useState(false);

  const generateExplanation = async (diagnosisData: DiagnosisData): Promise<string | null> => {
    setGenerating(true);
    
    try {
      console.log('[Diagnosis] Generating explanation for:', diagnosisData);
      
      const { data, error } = await supabase.functions.invoke('generate-diagnosis-explanation', {
        body: {
          diagnosisName: diagnosisData.name,
          icdCode: diagnosisData.icd_code,
          severity: diagnosisData.severity,
        },
      });

      if (error) {
        console.error('[Diagnosis] Error generating explanation:', error);
        
        // Handle specific error codes
        if (error.message?.includes('429')) {
          toast.error('Rate limit exceeded', {
            description: 'Please wait a moment before generating more explanations.',
          });
          return null;
        }
        
        if (error.message?.includes('402')) {
          toast.error('AI credits exhausted', {
            description: 'Please add credits to your workspace to continue.',
          });
          return null;
        }
        
        toast.error('Failed to generate explanation', {
          description: 'Using basic description instead.',
        });
        return null;
      }

      if (!data?.explanation) {
        console.error('[Diagnosis] No explanation in response:', data);
        toast.error('Failed to generate explanation');
        return null;
      }

      console.log('[Diagnosis] Generated explanation:', data.explanation);
      
      toast.success('Explanation generated', {
        description: 'AI-powered patient-friendly explanation created.',
      });
      
      return data.explanation;
      
    } catch (error) {
      console.error('[Diagnosis] Exception generating explanation:', error);
      toast.error('Error generating explanation');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generateExplanation,
    generating,
  };
};
