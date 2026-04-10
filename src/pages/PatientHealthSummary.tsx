import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  FlaskConical,
  RefreshCw,
  Loader2,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface Marcador {
  nome: string;
  valor: string;
  unidade: string;
  status: "normal" | "atenção" | "alterado";
  acao?: string;
}

interface AnaliseCompleta {
  score: number;
  resumo_geral: string;
  marcadores: Marcador[];
  prioridades: string[];
  proximos_passos: string;
}

interface DocRow {
  id: string;
  file_name: string;
  created_at: string;
  analise_completa: AnaliseCompleta | null;
}

// --- Score helpers ---

function scoreColor(score: number) {
  if (score <= 40) return "hsl(0 84% 60%)";
  if (score <= 70) return "hsl(45 93% 47%)";
  if (score <= 89) return "hsl(142 71% 45%)";
  return "hsl(142 76% 36%)";
}

function scoreLabel(score: number) {
  if (score <= 40) return "Precisa de atenção";
  if (score <= 70) return "Regular";
  if (score <= 89) return "Bom — com pontos de atenção";
  return "Ótimo";
}

function statusDotClass(status: string) {
  if (status === "normal") return "bg-green-500";
  if (status === "atenção") return "bg-amber-500";
  return "bg-destructive";
}

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "alterado") return "destructive";
  if (status === "atenção") return "secondary";
  return "outline";
}

// --- SVG circle progress ---

function ScoreCircle({ score }: { score: number }) {
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="text-2xl font-bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
  );
}

export default function PatientHealthSummary() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analise, setAnalise] = useState<AnaliseCompleta | null>(null);
  const [latestDocId, setLatestDocId] = useState<string | null>(null);
  const [allDocs, setAllDocs] = useState<DocRow[]>([]);
  const [pendingDocs, setPendingDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });
  const [reanalyzing, setReanalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const patientId = patient?.id;
    if (!patientId) {
      setLoading(false);
      return;
    }

    const [latestRes, allRes, pendingRes] = await Promise.all([
      supabase
        .from("documents")
        .select("id, file_name, created_at, analise_completa")
        .eq("patient_id", patientId)
        .eq("category", "exame_laboratorial")
        .not("analise_completa", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("documents")
        .select("id, file_name, created_at, analise_completa")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false }),
      supabase
        .from("documents")
        .select("id, file_name, created_at, analise_completa")
        .eq("patient_id", patientId)
        .eq("category", "exame_laboratorial")
        .is("analise_completa", null)
        .order("created_at", { ascending: false }),
    ]);

    if (latestRes.data?.analise_completa) {
      setAnalise(latestRes.data.analise_completa as unknown as AnaliseCompleta);
      setLatestDocId(latestRes.data.id);
    } else {
      setAnalise(null);
      setLatestDocId(null);
    }

    setAllDocs((allRes.data || []) as unknown as DocRow[]);
    setPendingDocs((pendingRes.data || []) as unknown as DocRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }
    fetchData();
  }, [user, authLoading, fetchData]);

  const handleAnalyzeAll = async () => {
    if (!user || pendingDocs.length === 0) return;
    setAnalyzing(true);
    setAnalyzeProgress({ current: 0, total: pendingDocs.length });

    for (let i = 0; i < pendingDocs.length; i++) {
      setAnalyzeProgress({ current: i + 1, total: pendingDocs.length });
      const { error } = await supabase.functions.invoke("analyze-lab", {
        body: { exam_id: pendingDocs[i].id, user_id: user.id },
      });
      if (error) {
        toast({ title: `Erro ao analisar ${pendingDocs[i].file_name}`, variant: "destructive" });
      }
    }

    setAnalyzing(false);
    setLoading(true);
    await fetchData();
    toast({ title: "Análise concluída!" });
  };

  const handleReanalyze = async () => {
    if (!user || !latestDocId) return;
    setReanalyzing(true);
    const { error } = await supabase.functions.invoke("analyze-lab", {
      body: { exam_id: latestDocId, user_id: user.id },
    });
    if (error) {
      toast({ title: "Erro ao reanalisar exame", variant: "destructive" });
    } else {
      toast({ title: "Reanálise concluída!" });
    }
    setReanalyzing(false);
    setLoading(true);
    await fetchData();
  };

  return (
    <PatientLayout
      title="Resumo de Saúde"
      subtitle="Análise clínica dos seus exames"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Resumo de Saúde" />}
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto pb-24">
        {/* Banner de exames pendentes */}
        {!loading && pendingDocs.length > 0 && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <FlaskConical className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Você tem {pendingDocs.length} exame{pendingDocs.length > 1 ? "s" : ""} novo{pendingDocs.length > 1 ? "s" : ""} aguardando análise
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {pendingDocs.map((doc) => (
                      <li key={doc.id} className="text-xs text-amber-700 dark:text-amber-400 truncate">
                        • {doc.file_name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button
                onClick={handleAnalyzeAll}
                disabled={analyzing}
                className="w-full gap-2"
                size="sm"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analisando {analyzeProgress.current} de {analyzeProgress.total} exames...
                  </>
                ) : (
                  <>
                    <FlaskConical className="h-4 w-4" />
                    Analisar agora
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <LoadingSkeleton />
        ) : !analise ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">Nenhum exame analisado ainda</p>
              <Button onClick={() => navigate("/pac/documentos")} className="gap-1">
                Ir para Exames <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* A) Score Card */}
            <Card>
              <CardContent className="p-5 flex items-center gap-5">
                <ScoreCircle score={analise.score} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold text-foreground">{scoreLabel(analise.score)}</p>
                  <p className="text-sm text-muted-foreground mt-1">{analise.resumo_geral}</p>
                </div>
              </CardContent>
            </Card>

            {/* Botão Reanalisar */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="gap-2"
            >
              {reanalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reanalisar exame mais recente
            </Button>

            {/* B) Marcadores */}
            {analise.marcadores?.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Marcadores do último exame</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {analise.marcadores.map((m, i) => (
                    <div key={i} className="py-2.5 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`h-2 w-2 rounded-full shrink-0 ${statusDotClass(m.status)}`} />
                          <span className="text-sm font-medium truncate">{m.nome}</span>
                          <span className="text-xs text-muted-foreground">{m.valor} {m.unidade}</span>
                        </div>
                        <Badge variant={statusBadgeVariant(m.status)} className="text-xs capitalize">
                          {m.status}
                        </Badge>
                      </div>
                      {m.status !== "normal" && m.acao && (
                        <p className="text-xs text-muted-foreground mt-1 ml-4">
                          Fale com seu médico: {m.acao}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* C) Prioridades */}
            {analise.prioridades?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Suas prioridades
                </h3>
                <div className="grid gap-2">
                  {analise.prioridades.slice(0, 3).map((p, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 flex items-start gap-3">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground">{p}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* D) Próximos passos */}
            {analise.proximos_passos && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Próximos passos
                </h3>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">{analise.proximos_passos}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* E) Histórico */}
            {allDocs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">Histórico de exames</h3>
                <div className="grid gap-2">
                  {allDocs.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(doc.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        {doc.analise_completa && (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            Analisado
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* F) CTA */}
            <Button onClick={() => navigate("/pac/documentos")} className="w-full gap-1">
              Analisar novo exame <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 rounded-lg border border-muted bg-muted/30">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            As informações apresentadas são educativas e não substituem avaliação, diagnóstico ou prescrição médica.
          </p>
        </div>
      </div>
    </PatientLayout>
  );
}
