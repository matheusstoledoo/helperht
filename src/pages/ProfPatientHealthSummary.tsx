import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Heart, Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LabMarkerSummary {
  marker_name: string;
  latestValue: number | null;
  previousValue: number | null;
  unit: string | null;
  status: string | null;
  latestDate: string;
  variationPercent: number | null;
}

interface Insight {
  type: "warning" | "improvement" | "stable" | "attention";
  title: string;
  description: string;
}

export default function ProfPatientHealthSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const [markers, setMarkers] = useState<LabMarkerSummary[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [allergies, setAllergies] = useState<string[] | null>(null);
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [scoreLabel, setScoreLabel] = useState<string | null>(null);
  const [scoreSummary, setScoreSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) navigate("/dashboard");
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!id || !user || (!isProfessional && !isAdmin)) return;
    const fetchData = async () => {
      setLoading(true);
      const patientRes = await supabase
        .from("patients")
        .select("id, allergies, blood_type, user_id, users(name)")
        .eq("id", id)
        .maybeSingle();

      if (patientRes.data) {
        setAllergies(patientRes.data.allergies);
        setBloodType(patientRes.data.blood_type);
        setPatientName((patientRes.data.users as any)?.name || "Paciente");
      }

      const patientUserId = (patientRes.data as any)?.user_id;

      let labData = (
        await supabase
          .from("lab_results")
          .select("marker_name, value, unit, status, collection_date")
          .eq("patient_id", id)
          .order("collection_date", { ascending: false })
          .limit(200)
      ).data || [];

      if (labData.length === 0 && patientUserId) {
        labData = (
          await supabase
            .from("lab_results")
            .select("marker_name, value, unit, status, collection_date")
            .eq("user_id", patientUserId)
            .order("collection_date", { ascending: false })
            .limit(200)
        ).data || [];
      }

      const labs = labData as any[];
      const grouped: Record<string, any[]> = {};
      for (const r of labs) {
        if (!grouped[r.marker_name]) grouped[r.marker_name] = [];
        if (grouped[r.marker_name].length < 2) grouped[r.marker_name].push(r);
      }

      const summaries: LabMarkerSummary[] = Object.entries(grouped).map(([name, readings]) => {
        const latest = readings[0];
        const previous = readings.length > 1 ? readings[1] : null;
        let variationPercent: number | null = null;
        if (latest.value != null && previous?.value != null && previous.value !== 0) {
          variationPercent = Math.round(((latest.value - previous.value) / Math.abs(previous.value)) * 100);
        }
        return {
          marker_name: name,
          latestValue: latest.value,
          previousValue: previous?.value ?? null,
          unit: latest.unit,
          status: latest.status,
          latestDate: latest.collection_date,
          variationPercent,
        };
      });

      summaries.sort((a, b) => {
        const aAb = a.status === "high" || a.status === "low" ? 0 : 1;
        const bAb = b.status === "high" || b.status === "low" ? 0 : 1;
        if (aAb !== bAb) return aAb - bAb;
        return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
      });

      setMarkers(summaries);

      // Generate insights
      const newInsights: Insight[] = [];
      const abnormal = summaries.filter(m => m.status === "high" || m.status === "low");
      const worsened = summaries.filter(m => (m.status === "high" || m.status === "low") && m.variationPercent != null && Math.abs(m.variationPercent) > 10);

      if (abnormal.length === 0 && summaries.length > 0) {
        newInsights.push({ type: "stable", title: "Todos os marcadores normais", description: "Resultados recentes dentro das faixas de referência." });
      }
      for (const m of worsened.slice(0, 3)) {
        newInsights.push({ type: "warning", title: `${m.marker_name} ${m.status === "high" ? "elevado" : "baixo"}`, description: `Variação de ${m.variationPercent! > 0 ? "+" : ""}${m.variationPercent}%${m.latestValue != null ? ` (${m.latestValue} ${m.unit || ""})` : ""}` });
      }
      if (abnormal.length > 0 && worsened.length === 0) {
        newInsights.push({ type: "attention", title: `${abnormal.length} marcador${abnormal.length > 1 ? "es" : ""} fora da faixa`, description: abnormal.map(m => m.marker_name).join(", ") });
      }

      // Buscar score de saúde do documento mais recente com analise_completa
      const { data: docWithAnalysis } = await supabase
        .from("documents")
        .select("analise_completa")
        .eq("patient_id", id)
        .not("analise_completa", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const ac = (docWithAnalysis?.analise_completa as any) || null;
      setScore(typeof ac?.score === "number" ? ac.score : null);
      setScoreLabel(ac?.score_label || null);
      setScoreSummary(ac?.resumo_geral || null);

      setInsights(newInsights);
      setLoading(false);
    };
    fetchData();
  }, [id, user, isProfessional, isAdmin]);

  if (authLoading || roleLoading || loading) return <FullPageLoading />;

  const insightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "warning": return <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />;
      case "attention": return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      default: return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    }
  };

  const insightBg = (type: Insight["type"]) => {
    switch (type) {
      case "warning": return "border-destructive/30 bg-destructive/5";
      case "attention": return "border-amber-500/30 bg-amber-50 dark:bg-amber-950/20";
      default: return "border-green-500/30 bg-green-50 dark:bg-green-950/20";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dashboard">Página inicial</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href={`/prof/paciente/${id}`}>{patientName}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Resumo de Saúde</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Resumo de Saúde</h1>
        <p className="text-sm text-muted-foreground">Visão geral da saúde de {patientName}</p>
      </header>

      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {(bloodType || (allergies && allergies.length > 0)) && (
          <div className="flex flex-wrap items-center gap-2">
            {bloodType && <Badge variant="outline" className="gap-1"><Heart className="h-3 w-3 text-destructive" /> {bloodType}</Badge>}
            {allergies?.map((a, i) => <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>)}
          </div>
        )}

        {insights.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Insights
            </h3>
            {insights.map((insight, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${insightBg(insight.type)}`}>
                {insightIcon(insight.type)}
                <div>
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {markers.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Marcadores Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {markers.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${m.status === "high" ? "bg-destructive" : m.status === "low" ? "bg-amber-500" : "bg-green-500"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{m.marker_name}</span>
                          {m.status === "high" && <Badge variant="destructive" className="text-xs">Alto</Badge>}
                          {m.status === "low" && <Badge className="text-xs bg-amber-500 hover:bg-amber-600">Baixo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(m.latestDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{m.latestValue ?? "—"} <span className="text-xs font-normal text-muted-foreground">{m.unit || ""}</span></span>
                      {m.variationPercent != null && m.variationPercent !== 0 && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${(m.status === "high" || m.status === "low") ? "text-destructive" : "text-green-600"}`}>
                          {m.variationPercent > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {m.variationPercent > 0 ? "+" : ""}{m.variationPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-3 gap-1" onClick={() => navigate(`/prof/paciente/${id}/graficos-exames`)}>
                Ver gráficos detalhados <ArrowRight className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum resultado de exame encontrado</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
