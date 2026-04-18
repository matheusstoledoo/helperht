import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PatientLayout from "@/components/patient/PatientLayout";
import { LabPanelSection, LAB_PANELS, classifyMarker } from "@/components/lab-charts/LabPanelSection";
import type { LabDataPoint } from "@/components/lab-charts/LabMarkerChart";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical } from "lucide-react";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { FloatingUploadButton } from "@/components/documents/FloatingUploadButton";

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
  marker_category: string | null;
}

const NORMALIZE_NAMES: Record<string, string> = {
  "glicemia": "Glicose", "blood glucose": "Glicose", "fasting glucose": "Glicose",
  "cholesterol total": "Colesterol Total",
  "ldl-c": "LDL", "ldl cholesterol": "LDL",
  "hdl-c": "HDL", "hdl cholesterol": "HDL",
  "trigliceride": "Triglicerídeos", "triglycerides": "Triglicerídeos", "triglyceride": "Triglicerídeos",
  "haemoglobin": "Hemoglobina", "hemoglobin": "Hemoglobina",
  "hba1c": "Hemoglobina Glicada", "hemoglobin a1c": "Hemoglobina Glicada",
  "25-oh vitamin d": "Vitamina D", "vitamin d": "Vitamina D",
  "c-reactive protein": "PCR", "crp": "PCR",
  "free t4": "T4 Livre", "t4 livre": "T4 Livre",
  "vitamin b12": "Vitamina B12",
  "folic acid": "Ácido Fólico", "folate": "Ácido Fólico",
}

function normalizeMarkerKey(name: string): string {
  return NORMALIZE_NAMES[name.toLowerCase().trim()] || name
}

export default function PatientLabCharts() {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<RawLabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Paciente");

  const fetchResults = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    const [patientRes, userRes] = await Promise.all([
      supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle(),
      supabase.from("users").select("name").eq("id", user.id).maybeSingle(),
    ]);

    setUserName(userRes.data?.name || "Paciente");

    if (!patientRes.data) {
      const { data } = await supabase
        .from("lab_results")
        .select("*")
        .eq("user_id", user.id)
        .order("collection_date", { ascending: true });
      setResults(data || []);
    } else {
      setPatientId(patientRes.data.id);
      const { data } = await supabase
        .from("lab_results")
        .select("*")
        .or(`user_id.eq.${user.id},patient_id.eq.${patientRes.data.id}`)
        .order("collection_date", { ascending: true });
      setResults(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchResults();
  }, [user, authLoading]);

  const groupedByMarker = useMemo(() => {
    const map = new Map<string, { points: LabDataPoint[], category: string | null }>()
    results.forEach((r) => {
      const key = normalizeMarkerKey(r.marker_name)
      if (!map.has(key)) map.set(key, { points: [], category: r.marker_category })
      map.get(key)!.points.push({
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
      })
    })
    return map
  }, [results])

  const panels = useMemo(() => {
    const panelMap = new Map<string, { markerName: string; dataPoints: LabDataPoint[] }[]>()
    LAB_PANELS.forEach((p) => panelMap.set(p.key, []))
    panelMap.set("outros", [])
    groupedByMarker.forEach(({ points, category }, markerName) => {
      const panelKey = classifyMarker(markerName, category)
      panelMap.get(panelKey)!.push({ markerName, dataPoints: points })
    })
    return panelMap
  }, [groupedByMarker])

  return (
    <PatientLayout title="Meus Exames Laboratoriais" subtitle="Acompanhe a evolução dos seus marcadores ao longo do tempo" showHeader breadcrumb={<PatientBreadcrumb currentPage="Gráficos de Exames" />}>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <FlaskConical className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Nenhum resultado encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Faça upload de um exame laboratorial para ver seus gráficos aqui.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="helper-card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {groupedByMarker.size} marcador{groupedByMarker.size > 1 ? "es" : ""} •{" "}
                    {results.length} resultado{results.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Toque em cada painel para expandir os gráficos
                  </p>
                </div>
              </div>
            </div>

            {/* Panels */}
            {LAB_PANELS.map((panel) => (
              <LabPanelSection
                key={panel.key}
                title={panel.title}
                icon={panel.icon}
                markers={panels.get(panel.key) || []}
                defaultOpen={panel.key === "hemograma" || panel.key === "bioquimica"}
              />
            ))}

            {/* Others */}
            <LabPanelSection
              title="Outros"
              icon="🧬"
              markers={panels.get("outros") || []}
            />
          </>
        )}
      </div>

      {user && (
        <FloatingUploadButton
          patientId={patientId ?? undefined}
          userId={user.id}
          userRole="patient"
          userName={userName}
          onSuccess={fetchResults}
        />
      )}
    </PatientLayout>
  );
}

