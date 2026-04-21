import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Dumbbell, Calendar, ChevronDown, ChevronUp, Clock, Flame, TrendingUp, Activity, Trophy, AlertTriangle, Eye, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { format, differenceInDays, parseISO, subDays, format as formatDate } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { usePanelViewMode } from "@/hooks/usePanelViewMode";

interface TrainingPlan {
  id: string;
  professional_name: string | null;
  sport: string | null;
  start_date: string | null;
  end_date: string | null;
  frequency_per_week: number | null;
  sessions: any[];
  periodization_notes: string | null;
  observations: string | null;
  status: string | null;
  created_at: string;
}

const SPORT_LABELS: Record<string, string> = {
  musculacao: "Musculação", corrida: "Corrida", ciclismo: "Ciclismo",
  natacao: "Natação", funcional: "Funcional", outro: "Outro",
};

// Mapeamento entre chaves semânticas (na config) e os IDs reais dos painéis
// renderizados nesta tela. Várias chaves podem apontar para o mesmo painel.
const PANEL_KEY_TO_ID: Record<string, number> = {
  acwr: 1, tss: 1, compliance: 1, carga_muscular: 1,
  recuperacao: 2, padrao_movimento: 2,
  hrv: 3, fc_repouso: 3, sinais_vitais: 3,
  sono: 4, energia: 4, gasto_calorico: 4,
  humor: 5, estresse: 5, bem_estar: 5,
  performance: 6,
  atividade: 7, alertas: 7,
};

const SPECIALTY_LABELS: Record<string, string> = {
  'médico': 'Médico',
  'fisioterapeuta': 'Fisioterapeuta',
  'educador físico': 'Educador Físico',
  'nutricionista': 'Nutricionista',
  'psicólogo': 'Psicólogo',
  'enfermeiro': 'Enfermeiro',
  'farmacêutico': 'Farmacêutico',
  'outro': 'Outro',
};

const getPanelConfig = (specialty: string): { priority: string[]; highlight: string[] } => {
  const configs: Record<string, { priority: string[]; highlight: string[] }> = {
    'médico': {
      priority: ['sinais_vitais', 'hrv', 'fc_repouso', 'alertas', 'sono', 'atividade'],
      highlight: ['sinais_vitais', 'hrv', 'fc_repouso'],
    },
    'fisioterapeuta': {
      priority: ['carga_muscular', 'acwr', 'padrao_movimento', 'recuperacao', 'atividade', 'sinais_vitais'],
      highlight: ['carga_muscular', 'acwr', 'recuperacao'],
    },
    'educador físico': {
      priority: ['acwr', 'tss', 'compliance', 'performance', 'recuperacao', 'sono'],
      highlight: ['acwr', 'tss', 'compliance'],
    },
    'nutricionista': {
      priority: ['sono', 'energia', 'gasto_calorico', 'atividade', 'recuperacao', 'sinais_vitais'],
      highlight: ['sono', 'energia', 'gasto_calorico'],
    },
    'psicólogo': {
      priority: ['humor', 'estresse', 'bem_estar', 'sono', 'recuperacao', 'atividade'],
      highlight: ['humor', 'estresse', 'bem_estar'],
    },
  };
  return configs[specialty] || { priority: [], highlight: [] };
};

const buildPanelOrder = (specialty: string): { ordered: number[]; highlighted: Set<number> } => {
  const ALL = [1, 2, 3, 4, 5, 6, 7];
  const cfg = getPanelConfig(specialty);
  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const key of cfg.priority) {
    const id = PANEL_KEY_TO_ID[key];
    if (id != null && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  for (const id of ALL) if (!seen.has(id)) ordered.push(id);

  const highlighted = new Set<number>();
  for (const key of cfg.highlight) {
    const id = PANEL_KEY_TO_ID[key];
    if (id != null) highlighted.add(id);
  }
  return { ordered, highlighted };
};

export default function ProfPatientTraining() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  // Athlete monitor states
  const [wLogs, setWLogs] = useState<any[]>([]);
  const [rLogs, setRLogs] = useState<any[]>([]);
  const [races, setRaces] = useState<any[]>([]);
  const [profSpecialty, setProfSpecialty] = useState<string>('');
  const [openPanels, setOpenPanels] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7]));
  const { showAll, toggle: togglePanelViewMode, specialty: viewSpecialty } = usePanelViewMode();
  const [recDimension, setRecDimension] = useState<string>('');
  const [recText, setRecText] = useState<string>('');
  const [recPriority, setRecPriority] = useState<string>('normal');
  const [recVisible, setRecVisible] = useState<boolean>(true);
  const [recRaceId, setRecRaceId] = useState<string>('');
  const [savingRec, setSavingRec] = useState<boolean>(false);

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
      const today = new Date().toISOString().split('T')[0];
      const [patientRes, plansRes, wLogsRes, rLogsRes, racesRes, profRes] = await Promise.all([
        supabase.from("patients").select("user_id, users(name)").eq("id", id).maybeSingle(),
        supabase.from("training_plans").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("workout_logs").select("*").eq("patient_id", id)
          .gte("activity_date", subDays(new Date(), 56).toISOString().split('T')[0])
          .order("activity_date", { ascending: true }),
        supabase.from("recovery_logs").select("*").eq("patient_id", id)
          .gte("log_date", subDays(new Date(), 14).toISOString().split('T')[0])
          .order("log_date", { ascending: true }),
        supabase.from("race_events").select("*").eq("patient_id", id)
          .gte("event_date", today)
          .order("event_date", { ascending: true }),
        supabase.from("users").select("specialty, panel_view_mode").eq("id", user!.id).maybeSingle(),
      ]);
      if (patientRes.data?.users) setPatientName((patientRes.data.users as any).name || "Paciente");
      if (plansRes.data) setPlans(plansRes.data as unknown as TrainingPlan[]);
      setWLogs(wLogsRes.data || []);
      setRLogs(rLogsRes.data || []);
      setRaces(racesRes.data || []);

      const specialty = (profRes.data as any)?.specialty || '';
      const savedMode = (profRes.data as any)?.panel_view_mode;
      setProfSpecialty(specialty);
      setShowAll(savedMode === 'all');
      const defaultOpen: Record<string, number[]> = {
        'médico': [1, 3, 4],
        'fisioterapeuta': [1, 2, 3],
        'educador físico': [1, 6, 7],
        'nutricionista': [4, 1, 7],
        'psicólogo': [5, 4, 2],
      };
      setOpenPanels(new Set(defaultOpen[specialty] || [1, 2, 3, 4, 5, 6, 7]));
      setLoading(false);
    };
    fetchData();
  }, [id, user, isProfessional, isAdmin]);

  const activePlan = plans.find((p) => p.status === "active");
  const pastPlans = plans.filter((p) => p.status !== "active");

  const togglePanel = (n: number) =>
    setOpenPanels(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s; });

  const getLoad = (log: any): number | null =>
    log.tss ?? log.srpe ??
    (log.duration_minutes != null && log.perceived_effort != null
      ? log.duration_minutes * log.perceived_effort : null);

  const now = new Date();

  const acute = wLogs
    .filter(l => differenceInDays(now, parseISO(l.activity_date)) < 7)
    .reduce((sum, l) => sum + (getLoad(l) ?? 0), 0);

  const weekLoads = [0, 1, 2, 3].map(w =>
    wLogs.filter(l => {
      const d = differenceInDays(now, parseISO(l.activity_date));
      return d >= w * 7 && d < (w + 1) * 7;
    }).reduce((sum, l) => sum + (getLoad(l) ?? 0), 0)
  );

  const weeksWithData = weekLoads.filter(w => w > 0).length;
  const chronic = weeksWithData >= 2 ? weekLoads.reduce((a, b) => a + b, 0) / 4 : null;
  const acwr = chronic && chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null;

  const acwrColor = acwr === null ? '#888' :
    acwr >= 0.85 && acwr <= 1.25 ? '#1D9E75' :
    acwr >= 0.70 && acwr <= 1.49 ? '#EF9F27' : '#E24B4A';

  const acwrLabel = acwr === null ? '' :
    acwr >= 0.85 && acwr <= 1.25 ? 'Carga adequada' :
    acwr >= 0.70 && acwr <= 1.49 ? 'Atenção à progressão' :
    'Risco elevado — revisar programação';

  const acwrChartData = [0, 1, 2, 3, 4, 5, 6, 7].slice().reverse().map(w => {
    const wAcute = wLogs
      .filter(l => { const d = differenceInDays(now, parseISO(l.activity_date)); return d >= w * 7 && d < (w + 1) * 7; })
      .reduce((sum, l) => sum + (getLoad(l) ?? 0), 0);
    const wChronic = [0, 1, 2, 3].map(ww =>
      wLogs.filter(l => { const d = differenceInDays(now, parseISO(l.activity_date)); return d >= (w + ww) * 7 && d < (w + ww + 1) * 7; })
        .reduce((sum, l) => sum + (getLoad(l) ?? 0), 0)
    ).reduce((a, b) => a + b, 0) / 4;
    return {
      week: `S-${w}`,
      acwr: wChronic > 0 ? Math.round((wAcute / wChronic) * 100) / 100 : null,
      load: Math.round(wAcute),
    };
  });

  const handleSaveRec = async () => {
    if (!recDimension || recText.trim().length < 10) return;
    setSavingRec(true);
    const { error } = await supabase.from("professional_recommendations").insert({
      professional_id: user!.id,
      patient_id: id,
      specialty: profSpecialty || 'geral',
      dimension: recDimension,
      recommendation: recText.trim(),
      priority: recPriority,
      visible_to_patient: recVisible,
      race_event_id: recRaceId || null,
    });
    setSavingRec(false);
    if (!error) {
      toast.success("Recomendação salva com sucesso");
      setRecDimension(''); setRecText(''); setRecPriority('normal');
      setRecVisible(true); setRecRaceId('');
    } else {
      toast.error("Erro ao salvar recomendação");
    }
  };

  const togglePanelViewMode = async () => {
    const next = !showAll;
    setShowAll(next);
    if (!user) return;
    const { error } = await supabase
      .from("users")
      .update({ panel_view_mode: next ? 'all' : 'specialty' } as any)
      .eq("id", user.id);
    if (error) {
      console.error("Erro ao salvar preferência de visualização:", error);
      toast.error("Não foi possível salvar sua preferência");
      setShowAll(!next);
    }
  };

  if (authLoading || roleLoading || loading) return <FullPageLoading />;

  const renderSessions = (plan: TrainingPlan) => {
    const sessions: any[] = Array.isArray(plan.sessions) ? plan.sessions : [];
    if (sessions.length === 0) return null;
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" /> Sessões de Treino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sessions.map((session: any, i: number) => {
            const key = `${plan.id}-${i}`;
            const expanded = expandedSessions[key];
            return (
              <div key={key} className="border rounded-lg">
                <button className="w-full flex items-center justify-between p-3 text-left" onClick={() => setExpandedSessions(prev => ({ ...prev, [key]: !prev[key] }))}>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{session.name || `Treino ${String.fromCharCode(65 + i)}`}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.day && <span>{session.day}</span>}
                        {session.duration && <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {session.duration}</span>}
                        {session.intensity && <span className="flex items-center gap-0.5"><Flame className="h-3 w-3" /> {session.intensity}</span>}
                      </div>
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expanded && session.exercises?.length > 0 && (
                  <div className="px-3 pb-3 space-y-2">
                    <div className="border-t pt-2" />
                    {session.exercises.map((ex: any, ei: number) => (
                      <div key={ei} className="flex items-start justify-between py-1">
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground font-mono w-5 shrink-0 pt-0.5">{ei + 1}.</span>
                          <div>
                            <p className="text-sm">{ex.name}</p>
                            {ex.notes && <p className="text-xs text-muted-foreground italic">{ex.notes}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          {ex.sets && <Badge variant="outline" className="text-xs">{ex.sets}x{ex.reps || "?"}</Badge>}
                          {ex.load && <span>{ex.load}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  const renderPlanCard = (plan: TrainingPlan, isActive: boolean) => (
    <div key={plan.id} className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isActive ? "default" : "secondary"}>{isActive ? "Ativo" : "Encerrado"}</Badge>
            {plan.sport && <Badge variant="outline" className="text-xs">{SPORT_LABELS[plan.sport] || plan.sport}</Badge>}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {plan.start_date && <span>{format(new Date(plan.start_date), "dd/MM/yyyy", { locale: ptBR })}{plan.end_date && ` — ${format(new Date(plan.end_date), "dd/MM/yyyy", { locale: ptBR })}`}</span>}
            {plan.frequency_per_week && <span>• {plan.frequency_per_week}x/semana</span>}
          </div>
          {plan.professional_name && <p className="text-sm font-medium mt-1">{plan.professional_name}</p>}
          {plan.observations && <p className="text-sm text-muted-foreground mt-2">{plan.observations}</p>}
          {plan.periodization_notes && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 inline mr-1" />{plan.periodization_notes}
            </div>
          )}
        </CardContent>
      </Card>
      {isActive && renderSessions(plan)}
    </div>
  );

  const renderPanelHeader = (n: number, title: string, icon?: React.ReactNode) => (
    <button
      onClick={() => togglePanel(n)}
      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{title}</span>
      </div>
      {openPanels.has(n) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );

  const latestRecovery = rLogs[rLogs.length - 1];
  const recoveryChartData = rLogs.map(r => ({
    date: formatDate(parseISO(r.log_date), "dd/MM"),
    musculos: r.muscle_score,
    articulacoes: r.joint_score,
    disposicao: r.disposition_score,
    energia: r.energy_score,
  }));
  const physioChartData = rLogs.map(r => ({
    date: formatDate(parseISO(r.log_date), "dd/MM"),
    hrv: r.hrv_rmssd,
    fc: r.resting_heart_rate,
  }));
  const sleepChartData = rLogs.map(r => ({
    date: formatDate(parseISO(r.log_date), "dd/MM"),
    sono: r.sleep_hours,
    energia: r.energy_score,
  }));
  const stressChartData = rLogs.map(r => ({
    date: formatDate(parseISO(r.log_date), "dd/MM"),
    estresse: r.stress_score,
  }));


  // Ordenação e destaque baseados na especialidade do profissional logado
  const { ordered: orderedPanels, highlighted: highlightedPanels } = buildPanelOrder(profSpecialty);
  const effectiveOrder = showAll ? [1, 2, 3, 4, 5, 6, 7] : orderedPanels;
  const effectiveHighlight = showAll ? new Set<number>() : highlightedPanels;
  const specialtyLabel = SPECIALTY_LABELS[profSpecialty] || null;

  // Métricas auxiliares por especialidade (Strava/Garmin/Training Peaks)
  const last7 = wLogs.filter(l => differenceInDays(now, parseISO(l.activity_date)) < 7);
  const prev7to30 = wLogs.filter(l => {
    const d = differenceInDays(now, parseISO(l.activity_date));
    return d >= 7 && d < 30;
  });
  const avgHR = (() => {
    const vals = wLogs.filter(l => l.avg_heart_rate).slice(-10).map(l => l.avg_heart_rate);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();
  const restingHR7 = (() => {
    const vals = rLogs.filter(r => r.resting_heart_rate &&
      differenceInDays(now, parseISO(r.log_date)) < 7).map(r => r.resting_heart_rate);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();
  const restingHR30 = (() => {
    const vals = rLogs.filter(r => {
      const d = differenceInDays(now, parseISO(r.log_date));
      return r.resting_heart_rate && d >= 7 && d < 37;
    }).map(r => r.resting_heart_rate);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  })();
  const weekCalories = last7.reduce((s, l) => s + (l.calories || 0), 0);
  const weekDurationMin = last7.reduce((s, l) => s + (l.duration_minutes || 0), 0);
  const plannedTSSWeek = last7.reduce((s, l) => s + (Number(l.planned_tss) || 0), 0);
  const realizedTSSWeek = last7.reduce((s, l) => s + (Number(l.tss) || 0), 0);
  const complianceVals = last7.filter(l => l.compliance_pct != null).map(l => l.compliance_pct);
  const complianceWeek = complianceVals.length
    ? Math.round(complianceVals.reduce((a, b) => a + b, 0) / complianceVals.length) : null;

  // ACWR zone label for Strava/Garmin section
  const acwrZone = acwr === null ? null
    : (acwr >= 0.85 && acwr <= 1.25 ? '🟢 Zona ideal' : '🔴 Fora da zona');

  const isFisioOrEdu = profSpecialty === 'fisioterapeuta' || profSpecialty === 'educador físico';
  const isMedico = profSpecialty === 'médico';
  const isNutri = profSpecialty === 'nutricionista';
  const isEdu = profSpecialty === 'educador físico';

  // Renderização de cada painel mapeada por ID
  const renderPanel = (n: number) => {
    const isHighlighted = effectiveHighlight.has(n);
    const cardClass = isHighlighted ? 'border-primary border-2 shadow-sm' : '';
    switch (n) {
      case 1: return (
        <Card key={n} className={cardClass}>
          {isHighlighted && (
            <div className="px-4 pt-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wide">
                Foco da especialidade
              </Badge>
            </div>
          )}
          {renderPanelHeader(1, "Carga de Treino (ACWR)", <Activity className="h-4 w-4 text-primary" />)}
          {openPanels.has(1) && (
            <CardContent className="space-y-4 pt-0">
              {acwr === null ? (
                <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded">
                  Dados insuficientes — registre pelo menos 2 semanas de treino para calcular o ACWR.
                </p>
              ) : (
                <>
                  <div className="flex items-end gap-4">
                    <span className="text-5xl font-bold" style={{ color: acwrColor }}>{acwr.toFixed(2)}</span>
                    <div className="pb-2">
                      <p className="text-sm font-medium" style={{ color: acwrColor }}>{acwrLabel}</p>
                      <p className="text-xs text-muted-foreground">Razão carga aguda / carga crônica</p>
                      {isFisioOrEdu && acwrZone && (
                        <p className="text-xs mt-1 font-medium">{acwrZone}</p>
                      )}
                    </div>
                  </div>

                  {isEdu && (plannedTSSWeek > 0 || realizedTSSWeek > 0) && (
                    <div className="grid grid-cols-3 gap-3 p-3 bg-primary/5 rounded border border-primary/20">
                      <div>
                        <p className="text-xs text-muted-foreground">TSS planejado (7d)</p>
                        <p className="text-lg font-semibold">{Math.round(plannedTSSWeek)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">TSS realizado (7d)</p>
                        <p className="text-lg font-semibold">{Math.round(realizedTSSWeek)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Compliance</p>
                        <p className="text-lg font-semibold">
                          {complianceWeek != null ? `${complianceWeek}%` : '—'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">ACWR — últimas 8 semanas</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={acwrChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 2]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <ReferenceLine y={0.85} stroke="#888" strokeDasharray="3 3" />
                        <ReferenceLine y={1.25} stroke="#888" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="acwr" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Carga semanal (TSS/sRPE) — últimas 8 semanas</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={acwrChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="load" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      );
      case 2: return (
        <Card key={n} className={cardClass}>
          {isHighlighted && (
            <div className="px-4 pt-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wide">
                Foco da especialidade
              </Badge>
            </div>
          )}
          {renderPanelHeader(2, "Recuperação Musculoesquelética")}
          {openPanels.has(2) && (
            <CardContent className="space-y-4 pt-0">
              {rLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded">Nenhum registro de recuperação encontrado.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {(['muscle_score', 'joint_score', 'disposition_score', 'energy_score'] as const).map((key, i) => {
                      const labels = ['Músculos', 'Articulações', 'Disposição', 'Energia'];
                      const val = latestRecovery?.[key];
                      if (val == null) return null;
                      const color = val >= 70 ? 'bg-green-100 text-green-800' : val >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
                      return <Badge key={key} className={color}>{labels[i]}: {Math.round(val)}</Badge>;
                    })}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={recoveryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="disposicao" stroke="#378ADD" fill="#378ADD" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="energia" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="musculos" stroke="#D85A30" fill="#D85A30" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="articulacoes" stroke="#E24B4A" fill="#E24B4A" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
            </CardContent>
          )}
        </Card>
      );
      case 3: return (
        <Card key={n} className={cardClass}>
          {isHighlighted && (
            <div className="px-4 pt-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wide">
                Foco da especialidade
              </Badge>
            </div>
          )}
          {renderPanelHeader(3, "Sinais Fisiológicos")}
          {openPanels.has(3) && (
            <CardContent className="space-y-4 pt-0">
              {isMedico && (avgHR != null || restingHR7 != null) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 rounded border border-primary/20">
                  {avgHR != null && (
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Heart className="h-3 w-3" /> FC média (últimas atividades)
                      </p>
                      <p className="text-lg font-semibold">{avgHR} bpm</p>
                    </div>
                  )}
                  {restingHR7 != null && (
                    <div>
                      <p className="text-xs text-muted-foreground">FC repouso (7d vs 30d)</p>
                      <p className="text-lg font-semibold">
                        {Math.round(restingHR7)}{' '}
                        {restingHR30 != null && (
                          <span className={`text-sm ${restingHR7 > restingHR30 ? 'text-red-600' : 'text-green-600'}`}>
                            ({restingHR7 > restingHR30 ? '↑' : '↓'} {Math.abs(Math.round(restingHR7 - restingHR30))})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {rLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded">Nenhum dado fisiológico registrado.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={physioChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line yAxisId="left" type="monotone" dataKey="hrv" stroke="#378ADD" strokeWidth={2} name="HRV (ms)" />
                      <Line yAxisId="right" type="monotone" dataKey="fc" stroke="#E24B4A" strokeWidth={2} name="FC repouso (bpm)" />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-muted-foreground">
                    HRV abaixo da média individual dos últimos 7 dias pode indicar recuperação incompleta.
                  </p>
                </>
              )}
            </CardContent>
          )}
        </Card>
      );
      case 4: return (
        <Card key={n} className={cardClass}>
          {isHighlighted && (
            <div className="px-4 pt-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wide">
                Foco da especialidade
              </Badge>
            </div>
          )}
          {renderPanelHeader(4, "Sono e Energia")}
          {openPanels.has(4) && (
            <CardContent className="space-y-4 pt-0">
              {isNutri && (weekCalories > 0 || weekDurationMin > 0) && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-primary/5 rounded border border-primary/20">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Flame className="h-3 w-3" /> Gasto calórico (7d)
                    </p>
                    <p className="text-lg font-semibold">{Math.round(weekCalories)} kcal</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duração de atividades (7d)</p>
                    <p className="text-lg font-semibold">
                      {Math.floor(weekDurationMin / 60)}h {Math.round(weekDurationMin % 60)}min
                    </p>
                  </div>
                </div>
              )}
              {rLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded">Nenhum dado de sono registrado.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={sleepChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="sono" fill="#378ADD" name="Sono (h)" />
                    <Line yAxisId="right" type="monotone" dataKey="energia" stroke="#1D9E75" strokeWidth={2} name="Energia" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          )}
        </Card>
      );
      case 5: return (
        <Card key={n} className={cardClass}>
          {isHighlighted && (
            <div className="px-4 pt-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wide">
                Foco da especialidade
              </Badge>
            </div>
          )}
          {renderPanelHeader(5, "Humor e Estresse")}
          {openPanels.has(5) && (
            <CardContent className="space-y-4 pt-0">
              {rLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded">Nenhum dado de humor registrado.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={stressChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="estresse" stroke="#E24B4A" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {rLogs.filter(r => r.free_notes).slice(-5).reverse().map((r, i) => (
                      <div key={i} className="border-l-2 border-muted-foreground/30 pl-3 py-1">
                        <p className="text-xs text-muted-foreground">{formatDate(parseISO(r.log_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-sm">{r.free_notes}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      );
      case 6: return (
        <Card key={n} className={cardClass}>
          {isHighlighted && (
            <div className="px-4 pt-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wide">
                Foco da especialidade
              </Badge>
            </div>
          )}
          {renderPanelHeader(6, "Provas e Periodização", <Trophy className="h-4 w-4 text-primary" />)}
          {openPanels.has(6) && (
            <CardContent className="space-y-3 pt-0">
              {races.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded">Nenhuma prova agendada.</p>
              ) : races.map(race => {
                const days = differenceInDays(parseISO(race.event_date), now);
                const highLoad = acwr !== null && acwr > 1.3 && days <= 14;
                const daysBadgeColor = days > 30 ? 'bg-green-100 text-green-800' : days >= 8 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800';
                return (
                  <div key={race.id} className="space-y-2">
                    <div className="border rounded-lg p-3 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{race.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(parseISO(race.event_date), "dd/MM/yyyy", { locale: ptBR })} · {race.sport}
                          {race.distance_km && ` · ${race.distance_km} km`}
                          {race.planned_tss && ` · TSS ${Math.round(race.planned_tss)}`}
                        </p>
                      </div>
                      <Badge className={daysBadgeColor}>{days}d</Badge>
                    </div>
                    {highLoad && (
                      <div className="flex items-center gap-2 p-3 rounded text-sm" style={{ background: '#FCEBEB', color: '#791F1F' }}>
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Carga elevada próxima à prova — considerar semana de regeneração</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      );
      case 7: return (
        <Card key={n} className={cardClass}>
          {isHighlighted && (
            <div className="px-4 pt-3">
              <Badge className="bg-primary text-primary-foreground text-[10px] uppercase tracking-wide">
                Foco da especialidade
              </Badge>
            </div>
          )}
          {renderPanelHeader(7, "Histórico de Atividades")}
          {openPanels.has(7) && (
            <CardContent className="pt-0">
              {wLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded">Nenhuma atividade registrada.</p>
              ) : (
                <div className="space-y-2">
                  {[...wLogs].reverse().slice(0, 10).map((log, i) => {
                    const load = getLoad(log);
                    const highLoad = (log.tss && log.tss > 100) || (log.srpe && log.srpe > 600);
                    const feelingEmoji = ['', '😫', '😕', '😐', '🙂', '💪'][log.feeling_score] || '';
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-3 p-3 rounded border"
                        style={highLoad ? { background: '#FCEBEB' } : undefined}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-muted-foreground font-mono shrink-0">
                            {formatDate(parseISO(log.activity_date), "dd/MM", { locale: ptBR })}
                          </span>
                          <span className="text-sm truncate">{log.activity_name || log.sport || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          {log.distance_km && <span>{Number(log.distance_km).toFixed(1)}km</span>}
                          {log.duration_minutes && <span>{Math.round(log.duration_minutes)}min</span>}
                          {load && <Badge variant="outline" className="text-xs">{Math.round(load)}</Badge>}
                          {log.compliance_pct != null && <span>{Math.round(log.compliance_pct)}%</span>}
                          {feelingEmoji && <span className="text-base">{feelingEmoji}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      );
      default: return null;
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
            <BreadcrumbItem><BreadcrumbPage>Treinos</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Treinos</h1>
        <p className="text-sm text-muted-foreground">Planos de treino e monitor do atleta de {patientName}</p>
      </header>

      <main className="p-4 sm:p-6 max-w-3xl mx-auto">
        <Tabs defaultValue="plan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="plan">Plano de Treino</TabsTrigger>
            <TabsTrigger value="monitor">
              <Activity className="h-4 w-4 mr-1" /> Monitor do Atleta
            </TabsTrigger>
          </TabsList>

          {/* ABA 1 — Plano de Treino (conteúdo original preservado) */}
          <TabsContent value="plan" className="space-y-6">
            {plans.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhum plano de treino registrado</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {activePlan && renderPlanCard(activePlan, true)}
                {pastPlans.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Planos anteriores</h3>
                    {pastPlans.map((plan) => renderPlanCard(plan, false))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ABA 2 — Monitor do Atleta */}
          <TabsContent value="monitor" className="space-y-4">

            {/* Chip de contexto da especialidade */}
            {specialtyLabel && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Visualizando como</span>
                  <Badge className="bg-primary text-primary-foreground">{specialtyLabel}</Badge>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    — painéis priorizados para sua especialidade
                  </span>
                </div>
                <button
                  type="button"
                  onClick={togglePanelViewMode}
                  className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted/50 transition-colors"
                >
                  {showAll ? 'Voltar à visão da especialidade' : 'Ver todos os painéis'}
                </button>
              </div>
            )}

            {/* Painéis ordenados/destacados conforme a especialidade do profissional */}
            {effectiveOrder.map(n => renderPanel(n))}

            {/* Campo de Recomendação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deixar recomendação para {patientName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Dimensão</Label>
                  <Select value={recDimension} onValueChange={setRecDimension}>
                    <SelectTrigger><SelectValue placeholder="Selecione uma dimensão" /></SelectTrigger>
                    <SelectContent>
                      {([
                        ['carga_treino', 'Carga de treino'],
                        ['recuperacao_muscular', 'Recuperação muscular'],
                        ['recuperacao_articular', 'Recuperação articular'],
                        ['sono', 'Sono'],
                        ['nutricao', 'Nutrição'],
                        ['hidratacao', 'Hidratação'],
                        ['saude_cardiovascular', 'Saúde cardiovascular'],
                        ['saude_mental', 'Saúde mental'],
                        ['retorno_treino', 'Retorno ao treino'],
                        ['periodizacao', 'Periodização'],
                        ['outro', 'Outro'],
                      ] as const).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Recomendação</Label>
                  <Textarea
                    value={recText}
                    onChange={(e) => setRecText(e.target.value)}
                    placeholder="Descreva sua recomendação..."
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{recText.length}/500</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Prioridade</Label>
                  <div className="flex gap-2">
                    {([['normal', 'Normal'], ['atencao', 'Atenção'], ['urgente', 'Urgente']] as const).map(([val, label]) => (
                      <button key={val} type="button"
                        onClick={() => setRecPriority(val)}
                        className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                          recPriority === val
                            ? val === 'urgente' ? 'bg-red-50 border-red-400 text-red-800'
                            : val === 'atencao' ? 'bg-amber-50 border-amber-400 text-amber-800'
                            : 'bg-primary/10 border-primary text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted/50'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Visível ao paciente</Label>
                  <Switch checked={recVisible} onCheckedChange={setRecVisible} />
                </div>

                {races.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Vincular à prova (opcional)</Label>
                    <Select value={recRaceId || "__none__"} onValueChange={(v) => setRecRaceId(v === "__none__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {races.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} — {formatDate(parseISO(r.event_date), "dd/MM/yyyy", { locale: ptBR })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <button
                  onClick={handleSaveRec}
                  disabled={savingRec || !recDimension || recText.trim().length < 10}
                  className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {savingRec ? 'Salvando...' : 'Salvar recomendação'}
                </button>
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
