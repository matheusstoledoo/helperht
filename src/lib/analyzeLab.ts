import { supabase } from "@/integrations/supabase/client";

export async function analyzeLabExam(examId: string, userId: string) {
  const { data, error } = await supabase.functions.invoke("analyze-lab", {
    body: { exam_id: examId, user_id: userId },
  });

  if (error) throw error;
  return data;
}
