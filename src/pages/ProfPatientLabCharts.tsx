import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical } from "lucide-react";
import { LabPanelSection, LAB_PANELS, classifyMarker } from "@/components/lab-charts/LabPanelSection";
import type { LabDataPoint } from "@/components/lab-charts/LabMarkerChart";

interface RawLabResult {
  id: string;
  marker_name: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  reference_min: number | null;
  reference_max: number | null;
  reference_text: string | null;
  collection_date: string;
  lab_name: string | null;
  status: string | null;
}

export default function ProfPatientLabCharts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const [results, setResults] = useState<RawLabResult[]>([]);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role !== null && !isProfessional && !isAdmin) navigate("/dashboard");
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!id || !user || (!isProfessional && !isAdmin)) return;
    const fetchData = async () => {
      setLoading(true);
      const patientRes = await supabase
        .from("patients")
        .select("user_id, users(name)")
        .eq("id", id)
        .maybeSingle();
      if (patientRes.data?.users) setPatientName((patientRes.data.users as any).name || "Paciente");
      const patientUserId = (patientRes.data as any)?.user_id;

      let labData = (
        await supabase
          .from("lab_results")
          .select("*")
          .eq("patient_id", id)
          .order("collection_date", { ascending: true })
      ).data || [];

      if (labData.length === 0 && patientUserId) {
        labData = (
          await supabase
            .from("lab_results")
            .select("*")
            .eq("user_id", patientUserId)
            .order("collection_date", { ascending: true })
        ).data || [];
      }

      setResults(labData as any);
      setLoading(false);
    };
    fetchData();
  }, [id, user, isProfessional, isAdmin]);

  const groupedByMarker = useMemo(() => {
    const map = new Map<string, LabDataPoint[]>();
    results.forEach((r) => {
      if (!map.has(r.marker_name)) map.set(r.marker_name, []);
      map.get(r.marker_name)!.push({
        id: r.id,
        collection_date: r.collection_date,
        value: r.value,
        value_text: r.value_text,
        unit: r.unit,
        reference_min: r.reference_min,
        reference_max: r.reference_max,
        reference_text: r.reference_text,
        lab_name: r.lab_name,
        status: r.status,
      });
    });
    return map;
  }, [results]);

  const panels = useMemo(() => {
    const panelMap = new Map<string, { markerName: string; dataPoints: LabDataPoint[] }[]>();
    LAB_PANELS.forEach((p) => panelMap.set(p.key, []));
    panelMap.set("outros", []);
    groupedByMarker.forEach((dataPoints, markerName) => {
      panelMap.get(classifyMarker(markerName))!.push({ markerName, dataPoints });
    });
    return panelMap;
  }, [groupedByMarker]);

  if (authLoading || roleLoading) return <FullPageLoading />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dashboard">Página inicial</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href={`/prof/paciente/${id}`}>{patientName}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Gráficos de Exames</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gráficos de Exames</h1>
        <p className="text-sm text-muted-foreground">Evolução dos marcadores laboratoriais de {patientName}</p>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <FlaskConical className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Nenhum resultado encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">Este paciente ainda não possui resultados laboratoriais.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {groupedByMarker.size} marcador{groupedByMarker.size > 1 ? "es" : ""} • {results.length} resultado{results.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">Toque em cada painel para expandir os gráficos</p>
                </div>
              </div>
            </div>
            {LAB_PANELS.map((panel) => (
              <LabPanelSection key={panel.key} title={panel.title} icon={panel.icon} markers={panels.get(panel.key) || []} defaultOpen={panel.key === "hemograma" || panel.key === "bioquimica"} />
            ))}
            <LabPanelSection title="Outros" icon="🧬" markers={panels.get("outros") || []} />
          </>
        )}
      </main>
    </div>
  );
}
