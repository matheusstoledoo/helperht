import { useState, useEffect } from "react";
import PatientLayout from "@/components/patient/PatientLayout";
import VitalsEntry from "@/components/vitals/VitalsEntry";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function PatientVitals() {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      setPatientId(patient?.id ?? null);
      setLoading(false);
    })();
  }, [user]);

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/pac/dashboard">Página inicial</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Sinais Vitais</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  if (loading) return <PatientLayout title="Sinais Vitais" breadcrumb={breadcrumb}><div className="flex justify-center py-12"><LoadingSpinner /></div></PatientLayout>;

  if (!patientId) return <PatientLayout title="Sinais Vitais" breadcrumb={breadcrumb}><p className="text-center py-12 text-muted-foreground">Perfil de paciente não encontrado.</p></PatientLayout>;

  return (
    <PatientLayout title="Sinais Vitais" subtitle="Registre suas medições diárias" breadcrumb={breadcrumb}>
      <VitalsEntry patientId={patientId} />
    </PatientLayout>
  );
}
