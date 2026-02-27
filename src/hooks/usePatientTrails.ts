 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
import { TrailEnrollment } from "./useCareTrails";

export interface PartialTrail {
  id: string;
  name: string;
  description: string | null;
  specialty: string | null;
  clinical_condition: string | null;
  duration_days: number;
  status: "draft" | "active" | "paused" | "archived";
  icon: string | null;
}
 
export interface PatientEnrollment extends Omit<TrailEnrollment, 'patient'> {
  trail?: PartialTrail;
   enrolled_by_name?: string;
   pending_alerts_count?: number;
 }
 
 export interface TrailAlert {
   id: string;
   enrollment_id: string;
   contact_point_id: string | null;
   response_id: string | null;
   alert_type: string;
   alert_message: string;
   severity: string;
   is_read: boolean;
   is_resolved: boolean;
   read_at: string | null;
   resolved_at: string | null;
   resolved_by: string | null;
   resolution_notes: string | null;
   created_at: string;
   trail_name?: string;
   response_text?: string;
 }
 
 export interface TrailResponse {
   id: string;
   enrollment_id: string;
   contact_point_id: string;
   response_type: string;
   response_text: string | null;
   response_numeric: number | null;
   response_choice: string | null;
   response_file_path: string | null;
   is_critical: boolean | null;
   critical_keyword_matched: string | null;
   responded_at: string;
   created_at: string;
   contact_point?: {
     title: string;
     point_type: string;
     structured_data_type: string | null;
   };
   trail?: {
     id: string;
     name: string;
   };
 }
 
 export const usePatientEnrollments = (patientId: string) => {
   return useQuery({
     queryKey: ["patient-enrollments", patientId],
     queryFn: async () => {
       if (!patientId) return [];
       
       const { data, error } = await supabase
         .from("trail_enrollments")
         .select(`
           *,
           trail:care_trails(
             id, name, description, specialty, clinical_condition, 
             duration_days, status, icon
           ),
           enrolled_by_user:users!trail_enrollments_enrolled_by_fkey(name)
         `)
         .eq("patient_id", patientId)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       
       // Get pending alerts count for each enrollment
       const enrollmentIds = data?.map(e => e.id) || [];
       if (enrollmentIds.length > 0) {
         const { data: alertCounts } = await supabase
           .from("trail_alerts")
           .select("enrollment_id")
           .in("enrollment_id", enrollmentIds)
           .eq("is_resolved", false);
         
         const countMap: Record<string, number> = {};
         alertCounts?.forEach(a => {
           countMap[a.enrollment_id] = (countMap[a.enrollment_id] || 0) + 1;
         });
 
        return (data?.map(e => ({
           ...e,
          enrolled_by_name: (e.enrolled_by_user as { name?: string } | null)?.name,
           pending_alerts_count: countMap[e.id] || 0,
        })) || []) as PatientEnrollment[];
       }
 
      return (data || []) as PatientEnrollment[];
     },
     enabled: !!patientId,
   });
 };
 
 export const useTrailAlerts = (patientId: string) => {
   return useQuery({
     queryKey: ["trail-alerts", patientId],
     queryFn: async () => {
       if (!patientId) return [];
       
       // Get enrollments for this patient
       const { data: enrollments } = await supabase
         .from("trail_enrollments")
         .select("id, trail_id")
         .eq("patient_id", patientId);
       
       if (!enrollments || enrollments.length === 0) return [];
 
       const enrollmentIds = enrollments.map(e => e.id);
       
       const { data, error } = await supabase
         .from("trail_alerts")
         .select(`
           *,
           enrollment:trail_enrollments(
             trail:care_trails(name)
           ),
           response:trail_responses(response_text, response_numeric, response_choice)
         `)
         .in("enrollment_id", enrollmentIds)
         .order("created_at", { ascending: false })
         .limit(50);
 
       if (error) throw error;
 
       return data?.map(alert => ({
         ...alert,
         trail_name: alert.enrollment?.trail?.name,
         response_text: alert.response?.response_text || 
                       (alert.response?.response_numeric != null ? String(alert.response.response_numeric) : null) ||
                       alert.response?.response_choice,
       })) as TrailAlert[];
     },
     enabled: !!patientId,
   });
 };
 
 export const usePatientResponses = (patientId: string) => {
   return useQuery({
     queryKey: ["patient-trail-responses", patientId],
     queryFn: async () => {
       if (!patientId) return [];
       
       // Get enrollments for this patient
       const { data: enrollments } = await supabase
         .from("trail_enrollments")
         .select("id")
         .eq("patient_id", patientId);
       
       if (!enrollments || enrollments.length === 0) return [];
 
       const enrollmentIds = enrollments.map(e => e.id);
       
       const { data, error } = await supabase
         .from("trail_responses")
         .select(`
           *,
           contact_point:trail_contact_points(
             title,
             point_type,
             structured_data_type
           ),
           enrollment:trail_enrollments(
             trail:care_trails(id, name)
           )
         `)
         .in("enrollment_id", enrollmentIds)
         .order("responded_at", { ascending: false });
 
       if (error) throw error;
 
       return data?.map(r => ({
         ...r,
         trail: r.enrollment?.trail,
       })) as TrailResponse[];
     },
     enabled: !!patientId,
   });
 };
 
 export const useMarkAlertAsRead = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ alertId, patientId }: { alertId: string; patientId: string }) => {
       const { error } = await supabase
         .from("trail_alerts")
         .update({ 
           is_read: true, 
           read_at: new Date().toISOString() 
         })
         .eq("id", alertId);
 
       if (error) throw error;
       return { patientId };
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ["trail-alerts", data.patientId] });
       queryClient.invalidateQueries({ queryKey: ["patient-enrollments", data.patientId] });
     },
   });
 };
 
 export const useResolveAlert = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ 
       alertId, 
       patientId, 
       resolutionNotes 
     }: { 
       alertId: string; 
       patientId: string; 
       resolutionNotes?: string;
     }) => {
       const { data: userData } = await supabase.auth.getUser();
       
       const { error } = await supabase
         .from("trail_alerts")
         .update({ 
           is_resolved: true,
           resolved_at: new Date().toISOString(),
           resolved_by: userData.user?.id,
           resolution_notes: resolutionNotes || null,
         })
         .eq("id", alertId);
 
       if (error) throw error;
       return { patientId };
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ["trail-alerts", data.patientId] });
       queryClient.invalidateQueries({ queryKey: ["patient-enrollments", data.patientId] });
       toast.success("Alerta resolvido!");
     },
     onError: (error) => {
       toast.error("Erro ao resolver alerta: " + error.message);
     },
   });
 };
 
 export const useUpdateEnrollmentStatus = () => {
   const queryClient = useQueryClient();
 
   return useMutation({
     mutationFn: async ({ 
       enrollmentId, 
       status,
       patientId,
       exitReason,
     }: { 
       enrollmentId: string; 
       status: "active" | "paused" | "completed" | "exited";
       patientId: string;
       exitReason?: string;
     }) => {
       const updates: Record<string, unknown> = { status };
       
       if (status === "completed") {
         updates.completed_at = new Date().toISOString();
       } else if (status === "exited") {
         updates.exited_at = new Date().toISOString();
         updates.exit_reason = exitReason;
       }
       
       const { error } = await supabase
         .from("trail_enrollments")
         .update(updates)
         .eq("id", enrollmentId);
 
       if (error) throw error;
       return { patientId };
     },
     onSuccess: (data) => {
       queryClient.invalidateQueries({ queryKey: ["patient-enrollments", data.patientId] });
       toast.success("Status atualizado!");
     },
     onError: (error) => {
       toast.error("Erro ao atualizar status: " + error.message);
     },
   });
 };