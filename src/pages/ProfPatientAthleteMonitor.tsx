import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Activity, ChevronDown, ChevronUp, Trophy, Heart, Moon, Smile,
  CalendarDays, History, Dumbbell, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, parseISO, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";

const DIMENSION_OPTIONS: { value: string; label: string }[] = [
  { value: "carga_treino", label: "Carga de treino" },
  { value: "recuperacao_muscular", label: "Recuperação muscular" },
  { value: "recuperacao_articular", label: "Recuperação articular" },
  { value: "sono", label: "Sono" },
  { value: "nutricao", label: "Nutrição" },
  { value: "hidratacao", label: "Hidratação" },
  { value: "saude_cardiovascular", label: "Saúde cardiovascular" },
  { value: "saude_mental", label: "Saúde mental" },
  { value: "retorno_treino", label: "Retorno ao treino" },
  { value: "periodizacao", label: "Periodização" },
  { value: "outro", label: "Outro" },
];

const FEELING_EMOJI: Record<number, string> = { 1: "😫", 2: "😕", 3: "😐", 4: "🙂", 5: "💪" };

const SPORT_LABELS: Record<string, string> = {
  corrida: "Corrida", ciclismo: "Ciclismo", natacao: "Natação",
  triatlo: "Triatlo", trail: "Trail", musculacao: "Musculação",
  funcional: "Funcional", outro: "Outro",
};

export default function ProfPatientAthleteMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("Paciente");
  const [profSpecialty, setProfSpecialty] = useState<string>("");

  const [wLogs, setWLogs] = useState<any[]>([]);
  const [rLogs, setRLogs] = useState<any[]>([]);
  const [races, setRaces] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  const [openPanels, setOpenPanels] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7]));

  // Recomendação form
  const [recDimension, setRecDimension] = useState("");
  const [recText, setRecText] = useState("");
  const [recPriority, setRecPriority] = useState<"normal" | "atencao" | "urgente">("normal");
  const [recVisible, setRecVisible] = useState(true);
  const [recRaceId, setRecRaceId] = useState<string>("");
  const [savingRec, setSavingRec] = useState(false);

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
      const today = new Date().toISOString().split("T")[0];
      const [wLogsRes, rLogsRes, racesRes, recsRes, profRes, patientRes] = await Promise.all([
        supabase.from("workout_logs").select("*").eq("patient_id", id)
          .gte("activity_date", subDays(new Date(), 56).toISOString().split("T")[0])
          .order("activity_date", { ascending: true }),
        supabase.from("recovery_logs").select("*").eq("patient_id", id)
          .gte("log_date", subDays(new Date(), 14).toISOString().split("T")[0])
          .order("log_date", { ascending: true }),
        supabase.from("race_events").select("*").eq("patient_id", id)
          .gte("event_date", today).order("event_date", { ascending: true }),
        supabase.from("professional_recommendations").select("*")
          .eq("patient_id", id).order("created_at", { ascending: false }).limit(20),
        supabase.from("users").select("specialty").eq("id", user!.id).maybeSingle(),
        supabase.from("patients").select("user_id, users(name)").eq("id", id).maybeSingle(),
      ]);

      setWLogs(wLogsRes.data || []);
      setRLogs(rLogsRes.data || []);
      setRaces(racesRes.data || []);
      setRecommendations(recsRes.data || []);
      const specialty = (profRes.data?.specialty || "").toLowerCase();
      setProfSpecialty(specialty);
      const name = (patientRes.data?.users as any)?.name || "Paciente";
      setPatientName(name);

      const defaultPanels: Record<string, number[]> = {
        "médico": [1, 3, 4],
        "medico": [1, 3, 4],
        "fisioterapeuta": [1, 2, 3],
        "educador físico": [1, 6, 7],
        "educador fisico": [1, 6, 7],
        "nutricionista": [4, 1, 7],
        "psicólogo": [5, 4, 2],
        "psicologo": [5, 4, 2],
      };
      const initial = defaultPanels[specialty] || [1, 2, 3, 4, 5, 6, 7];
      setOpenPanels(new Set(initial));

      setLoading(false);
    };
    fetchData();
  }, [id, user, isProfessional, isAdmin]);

  const togglePanel = (n: number) => setOpenPanels(prev => {
    const s = new Set(prev);
    s.has(n) ? s.delete(n) : s.add(n);
    return s;
  });

  // ============ ACWR ============
  const getLoad = (log: any): number | null =>
    log.tss ?? log.srpe ??
    (log.duration_minutes != null && log.perceived_effort != null
      ? log.duration_minutes * log.perceived_effort : null);

  const { acute, chronic, acwr, weekLoads } = useMemo(() => {
    const now = new Date();
    const acute = wLogs
      .filter(l => differenceInDays(now, parseISO(l.activity_date)) < 7)
      .reduce((sum, l) => sum + (getLoad(l) ?? 0), 0);

    const weekLoads = [0, 1, 2, 3].map(w =>
      wLogs
        .filter(l => {
          const d = differenceInDays(now, parseISO(l.activity_date));
          return d >= w * 7 && d < (w + 1) * 7;
        })
        .reduce((sum, l) => sum + (getLoad(l) ?? 0), 0)
    );

    const weeksWithData = weekLoads.filter(w => w > 0).length;
    const chronic = weeksWithData >= 2
      ? weekLoads.reduce((a, b) => a + b, 0) / 4
      : null;
    const acwr = chronic && chronic > 0
      ? Math.round((acute / chronic) * 100) / 100
      : null;

    return { acute, chronic, acwr, weekLoads };
  }, [wLogs]);

  const acwrColor =
    acwr === null ? "hsl(var(--muted-foreground))"
    : acwr >= 0.85 && acwr <= 1.25 ? "#1D9E75"
    : acwr >= 0.70 && acwr <= 1.49 ? "#EF9F27"
    : "#E24B4A";

  const acwrLabel =
    acwr === null ? ""
    : acwr >= 0.85 && acwr <= 1.25 ? "Carga adequada"
    : acwr >= 0.70 && acwr <= 1.49 ? "Atenção à progressão"
    : "Risco elevado — revisar programação";

  // 8-week ACWR series
  const acwrSeries = useMemo(() => {
    const now = new Date();
    const series: { week: string; acwr: number | null }[] = [];
    for (let i = 7; i >= 0; i--) {
      const refDate = subDays(now, i * 7);
      const weekLoads = [0, 1, 2, 3].map(w =>
        wLogs
          .filter(l => {
            const d = differenceInDays(refDate, parseISO(l.activity_date));
            return d >= w * 7 && d < (w + 1) * 7;
          })
          .reduce((sum, l) => sum + (getLoad(l) ?? 0), 0)
      );
      const acuteW = weekLoads[0];
      const weeksWithData = weekLoads.filter(w => w > 0).length;
      const chronicW = weeksWithData >= 2 ? weekLoads.reduce((a, b) => a + b, 0) / 4 : null;
      const v = chronicW && chronicW > 0 ? Math.round((acuteW / chronicW) * 100) / 100 : null;
      series.push({ week: format(refDate, "dd/MM"), acwr: v });
    }
    return series;
  }, [wLogs]);

  const weekLoadBars = useMemo(() => {
    return [3, 2, 1, 0].map(w => {
      const now = new Date();
      const start = subDays(now, (w + 1) * 7);
      const items = wLogs.filter(l => {
        const d = differenceInDays(now, parseISO(l.activity_date));
        return d >= w * 7 && d < (w + 1) * 7;
      });
      const tssSum = items.reduce((s, l) => s + (l.tss ?? l.srpe ?? 0), 0);
      return { week: `Sem ${format(start, "dd/MM")}`, carga: Math.round(tssSum) };
    });
  }, [wLogs]);

  // ============ Recovery series ============
  const recoverySeries = useMemo(() =>
    rLogs.map(r => ({
      date: format(parseISO(r.log_date), "dd/MM"),
      disposition: r.disposition_score,
      energy: r.energy_score,
      muscle: r.muscle_score,
      joint: r.joint_score,
    })), [rLogs]);

  const lastRecovery = rLogs[rLogs.length - 1];

  // ============ Physiological ============
  const physioSeries = useMemo(() => {
    const base = rLogs.map(r => ({
      date: format(parseISO(r.log_date), "dd/MM"),
      hrv: r.hrv_rmssd ?? null,
      rhr: r.resting_heart_rate ?? null,
      _hrvRaw: r.hrv_rmssd,
    }));
    // 7-day moving average for HRV
    return base.map((p, i) => {
      const window = base.slice(Math.max(0, i - 6), i + 1).map(b => b._hrvRaw).filter((v): v is number => v != null);
      const ma = window.length > 0 ? window.reduce((a, b) => a + b, 0) / window.length : null;
      return { ...p, hrvMa: ma != null ? Math.round(ma * 10) / 10 : null };
    });
  }, [rLogs]);

  const lastAvgHr = useMemo(() => {
    const recent = wLogs.filter(l => l.avg_heart_rate).slice(-1)[0];
    return recent?.avg_heart_rate ?? null;
  }, [wLogs]);
  const lastMaxHr = useMemo(() => {
    const recent = wLogs.filter(l => l.max_heart_rate).slice(-1)[0];
    return recent?.max_heart_rate ?? null;
  }, [wLogs]);

  // ============ Sleep & Energy ============
  const sleepEnergySeries = useMemo(() =>
    rLogs.map(r => ({
      date: format(parseISO(r.log_date), "dd/MM"),
      sono: r.sleep_hours ?? 0,
      energia: r.energy_score ?? 0,
    })), [rLogs]);

  const avgSleep = useMemo(() => {
    const arr = rLogs.map(r => r.sleep_hours).filter((v): v is number => v != null);
    return arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
  }, [rLogs]);
  const avgEnergy = useMemo(() => {
    const arr = rLogs.map(r => r.energy_score).filter((v): v is number => v != null);
    return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  }, [rLogs]);

  // ============ Stress ============
  const stressSeries = useMemo(() =>
    rLogs.map(r => ({
      date: format(parseISO(r.log_date), "dd/MM"),
      estresse: r.stress_score ?? null,
    })), [rLogs]);

  const lastNotes = useMemo(() =>
    [...rLogs].reverse().filter(r => r.free_notes).slice(0, 5), [rLogs]);

  // ============ Activities table ============
  const recentActivities = useMemo(() =>
    [...wLogs].reverse().slice(0, 10), [wLogs]);

  // ============ Helpers ============
  const scoreColor = (val: number | null | undefined) => {
    if (val == null) return "bg-muted text-muted-foreground";
    if (val >= 70) return "bg-green-100 text-green-800";
    if (val >= 40) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  };

  const daysLeft = (dateStr: string) => differenceInDays(parseISO(dateStr), new Date());
  const daysLeftBadge = (days: number) => {
    if (days > 30) return { bg: "#EAF3DE", text: "#27500A", label: `${days} dias` };
    if (days >= 8) return { bg: "#FAEEDA", text: "#633806", label: `${days} dias` };
    return { bg: "#FCEBEB", text: "#791F1F", label: `${days} dias` };
  };

  const handleSaveRec = async () => {
    if (!recDimension || recText.trim().length < 10) {
      toast({ title: "Preencha dimensão e recomendação (mín. 10 caracteres)", variant: "destructive" });
      return;
    }
    if (recText.length > 500) {
      toast({ title: "Recomendação excede 500 caracteres", variant: "destructive" });
      return;
    }
    setSavingRec(true);
    const { error } = await supabase.from("professional_recommendations").insert({
      professional_id: user!.id,
      patient_id: id!,
      specialty: profSpecialty || "geral",
      dimension: recDimension,
      recommendation: recText.trim(),
      priority: recPriority,
      visible_to_patient: recVisible,
      race_event_id: recRaceId || null,
    });
    setSavingRec(false);
    if (error) {
      toast({ title: "Erro ao salvar recomendação", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Recomendação salva com sucesso" });
    setRecDimension(""); setRecText(""); setRecPriority("normal");
    setRecVisible(true); setRecRaceId("");
    // refresh
    const { data } = await supabase.from("professional_recommendations").select("*")
      .eq("patient_id", id!).order("created_at", { ascending: false }).limit(20);
    setRecommendations(data || []);
  };

  if (authLoading || roleLoading || loading) return <FullPageLoading />;

  const PanelHeader = ({ n, icon: Icon, title }: { n: number; icon: any; title: string }) => (
    <button
      className="w-full flex items-center justify-between p-4 text-left"
      onClick={() => togglePanel(n)}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-semibold">{title}</span>
      </div>
      {openPanels.has(n) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dashboard">Página inicial</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href={`/prof/paciente/${id}`}>{patientName}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Monitor do Atleta</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Monitor do Atleta</h1>
        <p className="text-sm text-muted-foreground">Visão integrada de carga, recuperação e periodização de {patientName}</p>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4">
        {/* PANEL 1 — ACWR */}
        <Card>
          <PanelHeader n={1} icon={Activity} title="Carga de Treino (ACWR)" />
          {openPanels.has(1) && (
            <CardContent className="space-y-4">
              {acwr === null ? (
                <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  Dados insuficientes — registre pelo menos 2 semanas de treino para calcular o ACWR.
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-bold" style={{ color: acwrColor }}>{acwr.toFixed(2)}</span>
                    <span className="text-sm font-medium" style={{ color: acwrColor }}>{acwrLabel}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>Aguda (7d): <strong className="text-foreground">{Math.round(acute)}</strong></div>
                    <div>Crônica (28d média): <strong className="text-foreground">{chronic ? Math.round(chronic) : "—"}</strong></div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">ACWR — últimas 8 semanas</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={acwrSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 2]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <ReferenceLine y={0.85} stroke="#999" strokeDasharray="3 3" />
                        <ReferenceLine y={1.25} stroke="#999" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="acwr" stroke="#378ADD" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Carga semanal — últimas 4 semanas (TSS/sRPE)</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={weekLoadBars} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="carga" fill="#378ADD" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* PANEL 2 — Recuperação */}
        <Card>
          <PanelHeader n={2} icon={Heart} title="Recuperação Musculoesquelética" />
          {openPanels.has(2) && (
            <CardContent className="space-y-4">
              {recoverySeries.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Heart className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Nenhum registro de recuperação nas últimas 2 semanas.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={recoverySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="disposition" name="Disposição" stroke="#378ADD" fill="#378ADD" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="energy" name="Energia" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="muscle" name="Músculos" stroke="#D85A30" fill="#D85A30" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="joint" name="Articulações" stroke="#E24B4A" fill="#E24B4A" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  {lastRecovery && (
                    <div className="flex flex-wrap gap-2">
                      <Badge className={scoreColor(lastRecovery.disposition_score)}>Disposição {Math.round(lastRecovery.disposition_score ?? 0)}</Badge>
                      <Badge className={scoreColor(lastRecovery.energy_score)}>Energia {Math.round(lastRecovery.energy_score ?? 0)}</Badge>
                      <Badge className={scoreColor(lastRecovery.muscle_score)}>Músculos {Math.round(lastRecovery.muscle_score ?? 0)}</Badge>
                      <Badge className={scoreColor(lastRecovery.joint_score)}>Articulações {Math.round(lastRecovery.joint_score ?? 0)}</Badge>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* PANEL 3 — Sinais Fisiológicos */}
        <Card>
          <PanelHeader n={3} icon={Activity} title="Sinais Fisiológicos" />
          {openPanels.has(3) && (
            <CardContent className="space-y-4">
              {physioSeries.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Sem registros de HRV ou FC de repouso.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={physioSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="hrv" name="HRV (RMSSD)" stroke="#1D9E75" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line type="monotone" dataKey="hrvMa" name="HRV (média 7d)" stroke="#1D9E75" strokeDasharray="4 2" dot={false} connectNulls />
                    <Line type="monotone" dataKey="rhr" name="FC repouso" stroke="#E24B4A" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {lastAvgHr != null && <Badge variant="outline">Última FC média: {Math.round(lastAvgHr)} bpm</Badge>}
                {lastMaxHr != null && <Badge variant="outline">Última FC máxima: {Math.round(lastMaxHr)} bpm</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">HRV elevado e FC repouso baixa indicam boa recuperação autonômica.</p>
            </CardContent>
          )}
        </Card>

        {/* PANEL 4 — Sono e Energia */}
        <Card>
          <PanelHeader n={4} icon={Moon} title="Sono e Energia" />
          {openPanels.has(4) && (
            <CardContent className="space-y-4">
              {sleepEnergySeries.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Moon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Sem registros de sono e energia.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={sleepEnergySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} domain={[0, 12]} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} domain={[0, 100]} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar yAxisId="left" dataKey="sono" name="Sono (h)" fill="#378ADD" />
                      <Line yAxisId="right" type="monotone" dataKey="energia" name="Energia" stroke="#1D9E75" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {avgSleep != null && <Badge variant="outline">Sono médio: {avgSleep.toFixed(1)} h</Badge>}
                    {avgEnergy != null && <Badge variant="outline">Energia média: {Math.round(avgEnergy)}</Badge>}
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* PANEL 5 — Humor e Estresse */}
        <Card>
          <PanelHeader n={5} icon={Smile} title="Humor e Estresse" />
          {openPanels.has(5) && (
            <CardContent className="space-y-4">
              {stressSeries.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Smile className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Sem registros de humor.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={stressSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="estresse" stroke="#7B5BE0" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {lastNotes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Últimas anotações</p>
                  {lastNotes.map((n) => (
                    <div key={n.id} className="border-l-2 border-primary/40 pl-3 py-1">
                      <p className="text-xs text-muted-foreground">{format(parseISO(n.log_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <p className="text-sm">{n.free_notes}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* PANEL 6 — Provas */}
        <Card>
          <PanelHeader n={6} icon={Trophy} title="Provas e Periodização" />
          {openPanels.has(6) && (
            <CardContent className="space-y-3">
              {races.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Nenhuma prova agendada.
                </div>
              ) : (
                races.map((race) => {
                  const days = daysLeft(race.event_date);
                  const badge = daysLeftBadge(days);
                  const showAlert = acwr !== null && acwr > 1.3 && days <= 14;
                  return (
                    <div key={race.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{race.name}</span>
                        <Badge variant="outline">{SPORT_LABELS[race.sport] || race.sport}</Badge>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: badge.bg, color: badge.text }}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>{format(parseISO(race.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                        {race.distance_km && <span>{race.distance_km} km</span>}
                        {race.planned_tss && <span>TSS planejado: {Math.round(race.planned_tss)}</span>}
                      </div>
                      {showAlert && (
                        <div className="rounded-md p-2 text-sm" style={{ background: "#FCEBEB", color: "#791F1F" }}>
                          ⚠ Carga elevada próxima à prova — considerar semana de regeneração.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          )}
        </Card>

        {/* PANEL 7 — Histórico */}
        <Card>
          <PanelHeader n={7} icon={History} title="Histórico de Atividades" />
          {openPanels.has(7) && (
            <CardContent>
              {recentActivities.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  Nenhuma atividade registrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left py-2 px-2">Data</th>
                        <th className="text-left py-2 px-2">Atividade</th>
                        <th className="text-right py-2 px-2">Duração</th>
                        <th className="text-right py-2 px-2">Distância</th>
                        <th className="text-right py-2 px-2">TSS/sRPE</th>
                        <th className="text-right py-2 px-2">Compl.</th>
                        <th className="text-center py-2 px-2">😊</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivities.map((log) => {
                        const flagged = (log.tss && log.tss > 100) || (log.srpe && log.srpe > 600);
                        return (
                          <tr key={log.id} className="border-b" style={flagged ? { background: "#FCEBEB" } : undefined}>
                            <td className="py-2 px-2 whitespace-nowrap">{format(parseISO(log.activity_date), "dd/MM", { locale: ptBR })}</td>
                            <td className="py-2 px-2">{log.activity_name || SPORT_LABELS[log.sport] || log.sport || "—"}</td>
                            <td className="py-2 px-2 text-right">{log.duration_minutes ? `${Math.round(log.duration_minutes)} min` : "—"}</td>
                            <td className="py-2 px-2 text-right">{log.distance_km ? `${log.distance_km.toFixed(2)} km` : "—"}</td>
                            <td className="py-2 px-2 text-right">{log.tss ? Math.round(log.tss) : log.srpe ? Math.round(log.srpe) : "—"}</td>
                            <td className="py-2 px-2 text-right">{log.compliance_pct != null ? `${Math.round(log.compliance_pct)}%` : "—"}</td>
                            <td className="py-2 px-2 text-center">{log.feeling_score ? FEELING_EMOJI[log.feeling_score] : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* RECOMMENDATION FORM */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Deixar recomendação para {patientName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Dimensão</Label>
                <Select value={recDimension} onValueChange={setRecDimension}>
                  <SelectTrigger><SelectValue placeholder="Selecione a dimensão" /></SelectTrigger>
                  <SelectContent>
                    {DIMENSION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Vincular à prova (opcional)</Label>
                <Select value={recRaceId || "none"} onValueChange={(v) => setRecRaceId(v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {races.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} — {format(parseISO(r.event_date), "dd/MM/yyyy", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Recomendação</Label>
              <Textarea
                placeholder="Escreva uma recomendação clara e acionável (10–500 caracteres)…"
                value={recText}
                onChange={(e) => setRecText(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">{recText.length}/500</p>
            </div>

            <div>
              <Label className="text-xs">Prioridade</Label>
              <div className="flex gap-2 mt-1">
                {(["normal", "atencao", "urgente"] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setRecPriority(p)}
                    className={`px-3 py-1.5 rounded-md text-sm border-2 transition-colors ${
                      recPriority === p
                        ? p === "urgente" ? "border-red-600 bg-red-50 text-red-800"
                          : p === "atencao" ? "border-amber-600 bg-amber-50 text-amber-800"
                          : "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {p === "normal" ? "Normal" : p === "atencao" ? "Atenção" : "Urgente"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={recVisible} onCheckedChange={setRecVisible} id="rec-visible" />
                <Label htmlFor="rec-visible" className="text-sm cursor-pointer">Visível ao paciente</Label>
              </div>
              <Button onClick={handleSaveRec} disabled={savingRec}>
                {savingRec ? "Salvando…" : "Salvar recomendação"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RECENT RECOMMENDATIONS LIST */}
        {recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Recomendações recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recommendations.slice(0, 5).map(r => (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{r.specialty}</Badge>
                    <Badge variant="secondary" className="text-xs">{DIMENSION_OPTIONS.find(o => o.value === r.dimension)?.label || r.dimension}</Badge>
                    {r.priority === "urgente" && <Badge className="bg-red-100 text-red-800 text-xs">Urgente</Badge>}
                    {r.priority === "atencao" && <Badge className="bg-amber-100 text-amber-800 text-xs">Atenção</Badge>}
                    <span className="text-xs text-muted-foreground ml-auto">{format(parseISO(r.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                  <p className="text-sm">{r.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
