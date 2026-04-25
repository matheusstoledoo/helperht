import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import PatientLayout from "@/components/patient/PatientLayout";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, MapPin } from "lucide-react";
import ActivityAnalysisCharts, {
  formatPace,
} from "@/components/training/ActivityAnalysisCharts";
import ActivityMap from "@/components/training/ActivityMap";

export default function PatientActivityAnalysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [log, setLog] = useState<any>(null);
  const [laps, setLaps] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      const [logRes, lapsRes, recordsRes] = await Promise.all([
        supabase.from("workout_logs").select("*").eq("id", id).single(),
        (supabase.from("workout_laps" as any) as any)
          .select("*")
          .eq("workout_log_id", id)
          .order("lap_index"),
        (supabase.from("workout_records" as any) as any)
          .select("*")
          .eq("workout_log_id", id)
          .order("elapsed_seconds"),
      ]);
      if (cancelled) return;
      setLog(logRes.data);
      setLaps(lapsRes.data || []);
      setRecords(recordsRes.data || []);
      setLoading(false);
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  if (loading) {
    return (
      <PatientLayout title="Análise de atividade">
        <div className="space-y-4 p-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </PatientLayout>
    );
  }

  if (!log) {
    return (
      <PatientLayout title="Análise de atividade">
        <div className="p-4 sm:p-6 space-y-3">
          <PatientBreadcrumb
            currentPage="Atividade não encontrada"
            intermediatePages={[{ label: "Treinos", href: "/pac/treinos" }]}
          />
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Atividade não encontrada ou você não tem acesso.
            </CardContent>
          </Card>
        </div>
      </PatientLayout>
    );
  }

  const title = log.activity_name || log.sport || "Atividade";
  const dateLabel = log.activity_date
    ? format(parseISO(log.activity_date), "dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })
    : "";

  const summary = [
    {
      label: "Distância",
      value: log.distance_km != null ? `${log.distance_km} km` : "—",
    },
    {
      label: "Duração",
      value: log.duration_minutes != null ? `${log.duration_minutes} min` : "—",
    },
    {
      label: "Pace médio",
      value: log.avg_pace_min_km
        ? `${formatPace(Number(log.avg_pace_min_km))} min/km`
        : "—",
    },
    {
      label: "FC média",
      value: log.avg_heart_rate != null ? `${log.avg_heart_rate} bpm` : "—",
    },
    {
      label: "FC máxima",
      value: log.max_heart_rate != null ? `${log.max_heart_rate} bpm` : "—",
    },
    {
      label: log.tss != null ? "TSS" : "sRPE",
      value:
        log.tss != null
          ? `${log.tss}`
          : log.srpe != null
          ? `${log.srpe}`
          : "—",
    },
  ];

  return (
    <PatientLayout title="Análise de atividade">
      <div className="p-3 sm:p-6 space-y-4 max-w-6xl mx-auto">
        <PatientBreadcrumb
          currentPage={title}
          intermediatePages={[{ label: "Treinos", href: "/pac/treinos" }]}
        />

        <div className="flex items-start justify-between flex-wrap gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold break-words">{title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground capitalize">
              {dateLabel}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pac/treinos")}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Voltar para treinos</span>
            <span className="sm:hidden">Voltar</span>
          </Button>
        </div>

        {/* Card de resumo */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {summary.map((s) => (
                <div key={s.label} className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-base sm:text-lg font-semibold truncate">{s.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <ActivityAnalysisCharts laps={laps} records={records} />
      </div>
    </PatientLayout>
  );
}
