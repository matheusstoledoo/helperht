import { useState, useEffect, useCallback } from "react";
import PatientLayout from "@/components/patient/PatientLayout";
import VitalsEntry from "@/components/vitals/VitalsEntry";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function PatientVitals() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const { data: usr } = await supabase
        .from("users")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();
      setPatientId(patient?.id ?? null);
      setPatientName(usr?.name ?? "Paciente");
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <PatientLayout title="Sinais Vitais"><div className="flex justify-center py-12"><LoadingSpinner /></div></PatientLayout>;

  if (!patientId) return <PatientLayout title="Sinais Vitais"><p className="text-center py-12 text-muted-foreground">Perfil de paciente não encontrado.</p></PatientLayout>;

  return (
    <PatientLayout title="Sinais Vitais" subtitle="Registro diário">
      <VitalsEntry patientId={patientId} patientName={patientName} />
    </PatientLayout>
  );
}
