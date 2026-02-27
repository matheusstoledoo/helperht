import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RealtimeTimelineOptions {
  patientId: string;
  onDataChange: () => void;
}

export const useRealtimeTimeline = ({ patientId, onDataChange }: RealtimeTimelineOptions) => {
  useEffect(() => {
    console.log(`[Realtime] Setting up timeline subscriptions for patient ${patientId}`);

    const consultationsChannel = supabase
      .channel(`consultations-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consultations",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          console.log("[Realtime] Consultation change:", payload);
          toast.info("Consultation updated", {
            description: "Timeline refreshed automatically",
          });
          onDataChange();
        }
      )
      .subscribe();

    const diagnosesChannel = supabase
      .channel(`diagnoses-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "diagnoses",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          console.log("[Realtime] Diagnosis change:", payload);
          toast.info("Diagnosis updated", {
            description: "Clinical summary refreshed automatically",
          });
          onDataChange();
        }
      )
      .subscribe();

    const treatmentsChannel = supabase
      .channel(`treatments-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "treatments",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          console.log("[Realtime] Treatment change:", payload);
          toast.info("Treatment updated", {
            description: "Clinical summary refreshed automatically",
          });
          onDataChange();
        }
      )
      .subscribe();

    const examsChannel = supabase
      .channel(`exams-${patientId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exams",
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          console.log("[Realtime] Exam change:", payload);
          toast.info("Exam updated", {
            description: "Timeline refreshed automatically",
          });
          onDataChange();
        }
      )
      .subscribe();

    return () => {
      console.log(`[Realtime] Cleaning up timeline subscriptions for patient ${patientId}`);
      supabase.removeChannel(consultationsChannel);
      supabase.removeChannel(diagnosesChannel);
      supabase.removeChannel(treatmentsChannel);
      supabase.removeChannel(examsChannel);
    };
  }, [patientId, onDataChange]);
};
