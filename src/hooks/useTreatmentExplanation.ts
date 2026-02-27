import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TreatmentData {
  name: string;
  description?: string;
  dosage?: string;
  frequency?: string;
  isModification?: boolean;
}

export const useTreatmentExplanation = () => {
  const [generating, setGenerating] = useState(false);

  const generateExplanation = async (treatmentData: TreatmentData): Promise<string | null> => {
    setGenerating(true);
    
    try {
      console.log('[Treatment] Generating explanation for:', treatmentData);
      
      const { data, error } = await supabase.functions.invoke('generate-treatment-explanation', {
        body: {
          treatmentName: treatmentData.name,
          description: treatmentData.description,
          dosage: treatmentData.dosage,
          frequency: treatmentData.frequency,
          isModification: treatmentData.isModification || false,
        },
      });

      if (error) {
        console.error('[Treatment] Error generating explanation:', error);
        
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
        console.error('[Treatment] No explanation in response:', data);
        toast.error('Failed to generate explanation');
        return null;
      }

      console.log('[Treatment] Generated explanation:', data.explanation);
      
      toast.success('Explanation generated', {
        description: 'AI-powered patient-friendly explanation created.',
      });
      
      return data.explanation;
      
    } catch (error) {
      console.error('[Treatment] Exception generating explanation:', error);
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
