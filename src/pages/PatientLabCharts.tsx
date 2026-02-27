import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PatientLayout from "@/components/patient/PatientLayout";
import { LabPanelSection, LAB_PANELS, classifyMarker } from "@/components/lab-charts/LabPanelSection";
import type { LabDataPoint } from "@/components/lab-charts/LabMarkerChart";
import { Skeleton } from "@/components/ui/skeleton";
import { FlaskConical } from "lucide-react";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";

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

export default function PatientLabCharts() {
  const { user } = useAuth();
  const [results, setResults] = useState<RawLabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      setLoading(true);

      // Get patient id
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!patient) {
        // Also fetch by user_id directly (user owns their own lab results)
        const { data } = await supabase
          .from("lab_results")
          .select("*")
          .eq("user_id", user.id)
          .order("collection_date", { ascending: true });
        setResults(data || []);
      } else {
        // Fetch both user_id and patient_id results
        const { data } = await supabase
          .from("lab_results")
          .select("*")
          .or(`user_id.eq.${user.id},patient_id.eq.${patient.id}`)
          .order("collection_date", { ascending: true });
        setResults(data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  // Group by marker name
  const groupedByMarker = useMemo(() => {
    const map = new Map<string, LabDataPoint[]>();
    results.forEach((r) => {
      const key = r.marker_name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({
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

  // Classify into panels
  const panels = useMemo(() => {
    const panelMap = new Map<string, { markerName: string; dataPoints: LabDataPoint[] }[]>();

    // Initialize all panels
    LAB_PANELS.forEach((p) => panelMap.set(p.key, []));
    panelMap.set("outros", []);

    groupedByMarker.forEach((dataPoints, markerName) => {
      const panelKey = classifyMarker(markerName);
      panelMap.get(panelKey)!.push({ markerName, dataPoints });
    });

    return panelMap;
  }, [groupedByMarker]);

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
    </PatientLayout>
  );
}

