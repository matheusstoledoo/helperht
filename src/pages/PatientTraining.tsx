import { useEffect, useState } from "react";
import { format, differenceInDays, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import PerformanceEvolution from "@/components/training/PerformanceEvolution";
import TrainingHub from "@/components/training/TrainingHub";
import PatientLayout from "@/components/patient/PatientLayout";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, MessageSquare, Plus, Star, Trophy } from "lucide-react";
import { toast } from "sonner";

export default function PatientTraining() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);

  const [raceEvents, setRaceEvents] = useState<any[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [todayRecovery, setTodayRecovery] = useState<any | null>(null);
  const [showRaceForm, setShowRaceForm] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);

  const [raceName, setRaceName] = useState("");
  const [raceSport, setRaceSport] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [raceDistance, setRaceDistance] = useState("");
  const [raceType, setRaceType] = useState("competicao");
  const [raceLocation, setRaceLocation] = useState("");
  const [raceGoal, setRaceGoal] = useState("");
  const [racePlannedTss, setRacePlannedTss] = useState("");

  const [recHrv, setRecHrv] = useState("");
  const [recHr, setRecHr] = useState("");
  const [recSleepHours, setRecSleepHours] = useState("");
  const [recSleepQuality, setRecSleepQuality] = useState(0);
  const [recDisposition, setRecDisposition] = useState(50);
  const [recEnergy, setRecEnergy] = useState(50);
  const [recMuscle, setRecMuscle] = useState(50);
  const [recJoint, setRecJoint] = useState(50);
  const [recStress, setRecStress] = useState(0);
  const [recNotes, setRecNotes] = useState("");
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [savingRace, setSavingRace] = useState(false);
  const [hasGarminWithoutGps, setHasGarminWithoutGps] = useState(false);
  const [backfillingGps, setBackfillingGps] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];
      const fourteenDaysAgo = subDays(new Date(), 14).toISOString().split("T")[0];

      const [patientRes, racesRes, rLogsRes, recsRes] = await Promise.all([
        supabase.from("patients").select("id").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("race_events")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "scheduled")
          .order("event_date", { ascending: true }),
        supabase
          .from("recovery_logs")
          .select("*")
          .eq("user_id", user.id)
          .gte("log_date", fourteenDaysAgo)
          .order("log_date", { ascending: true }),
        supabase
          .from("professional_recommendations")
          .select("*")
          .eq("visible_to_patient", true)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (patientRes.data) setPatientId(patientRes.data.id);
      setRaceEvents(racesRes.data || []);
      setRecoveryLogs(rLogsRes.data || []);
      setRecommendations(recsRes.data || []);
      const todayLog = (rLogsRes.data || []).find((r: any) => r.log_date === today);
      setTodayRecovery(todayLog || null);

      // Mostrar botão sempre que houver qualquer atividade Garmin
      const { data: garminLogs } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("user_id", user.id)
        .eq("source", "garmin")
        .limit(50);

      setHasGarminWithoutGps((garminLogs?.length ?? 0) > 0);

      setLoading(false);
    };

    fetchData();
  }, [user, authLoading]);

  const handleBackfillGps = async () => {
    setBackfillingGps(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backfill-gps-records`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token}`,
          },
        }
      );
      const data = await res.json();
      const updated = data.results?.filter((r: any) => r.status === "atualizado").length || 0;
      toast.success(`GPS extraído de ${updated} atividade${updated !== 1 ? "s" : ""}`);
      if (updated > 0) setHasGarminWithoutGps(false);
    } catch {
      toast.error("Erro ao extrair GPS");
    } finally {
      setBackfillingGps(false);
    }
  };

  const handleSaveRace = async () => {
    if (!raceName || !raceSport || !raceDate || !user) return;
    setSavingRace(true);
    await supabase.from("race_events").insert({
      user_id: user.id,
      patient_id: patientId ?? null,
      name: raceName,
      sport: raceSport,
      event_date: raceDate,
      distance_km: raceDistance ? parseFloat(raceDistance) : null,
      event_type: raceType,
      location: raceLocation || null,
      goal: raceGoal || null,
      planned_tss: racePlannedTss ? parseInt(racePlannedTss) : null,
    });
    setSavingRace(false);
    setShowRaceForm(false);
    setRaceName("");
    setRaceSport("");
    setRaceDate("");
    setRaceDistance("");
    setRaceLocation("");
    setRaceGoal("");
    setRacePlannedTss("");
    const { data } = await supabase
      .from("race_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "scheduled")
      .order("event_date", { ascending: true });
    setRaceEvents(data || []);
  };

  const handleSaveRecovery = async () => {
    if (!user) return;
    setSavingRecovery(true);
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("recovery_logs").insert({
      user_id: user.id,
      patient_id: patientId ?? null,
      log_date: today,
      hrv_rmssd: recHrv ? parseFloat(recHrv) : null,
      resting_heart_rate: recHr ? parseInt(recHr) : null,
      sleep_hours: recSleepHours ? parseFloat(recSleepHours) : null,
      sleep_quality: recSleepQuality || null,
      disposition_score: recDisposition,
      energy_score: recEnergy,
      muscle_score: recMuscle,
      joint_score: recJoint,
      stress_score: recStress || null,
      free_notes: recNotes.trim() || null,
      source: "manual",
    });
    setSavingRecovery(false);
    setShowRecoveryForm(false);
    const { data } = await supabase
      .from("recovery_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", subDays(new Date(), 14).toISOString().split("T")[0])
      .order("log_date", { ascending: true });
    setRecoveryLogs(data || []);
    const todayLog = (data || []).find((r: any) => r.log_date === today);
    setTodayRecovery(todayLog || null);
  };

  const sportColor = (sport: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      corrida: { bg: "#FAECE7", text: "#712B13" },
      ciclismo: { bg: "#E6F1FB", text: "#0C447C" },
      natacao: { bg: "#E1F5EE", text: "#085041" },
      triatlo: { bg: "#EEEDFE", text: "#3C3489" },
      trail: { bg: "#EAF3DE", text: "#27500A" },
    };
    return map[sport] || { bg: "#F1EFE8", text: "#444441" };
  };

  const daysLeft = (dateStr: string) => differenceInDays(parseISO(dateStr), new Date());

  const daysLeftBadge = (days: number) => {
    if (days > 30) return { bg: "#EAF3DE", text: "#27500A", label: `${days} dias` };
    if (days >= 8) return { bg: "#FAEEDA", text: "#633806", label: `${days} dias` };
    return { bg: "#FCEBEB", text: "#791F1F", label: `${days} dias` };
  };

  const scoreColor = (val: number) => {
    if (val >= 70) return "bg-green-100 text-green-800";
    if (val >= 40) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  };

  const specialtyColor = (specialty: string) => {
    const map: Record<string, string> = {
      "médico": "bg-blue-100 text-blue-800",
      "fisioterapeuta": "bg-green-100 text-green-800",
      "educador físico": "bg-orange-100 text-orange-800",
      "nutricionista": "bg-teal-100 text-teal-800",
      "psicólogo": "bg-purple-100 text-purple-800",
    };
    return map[specialty] || "bg-gray-100 text-gray-700";
  };

  return (
    <PatientLayout
      title="Treinos"
      subtitle="Seus planos de treino e registros"
      showHeader={false}
      breadcrumb={<PatientBreadcrumb currentPage="Treinos" />}
    >
      <div className="p-3 sm:p-6 space-y-6 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : user ? (
          <Tabs defaultValue="treinos">
            <TabsList className="w-full">
              <TabsTrigger value="treinos" className="flex-1">Meus Treinos</TabsTrigger>
              <TabsTrigger value="recuperacao" className="flex-1">Recuperação</TabsTrigger>
              <TabsTrigger value="evolucao" className="flex-1">Evolução</TabsTrigger>
            </TabsList>

            <TabsContent value="treinos" className="space-y-6 mt-4">
              <TrainingHub
                userId={user.id}
                patientId={patientId}
                onBackfillGps={handleBackfillGps}
                backfillingGps={backfillingGps}
                hasGarminWithoutGps={hasGarminWithoutGps}
              />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-600" />
                    Próximas provas
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => setShowRaceForm(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>

                {raceEvents.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Trophy className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma prova agendada</p>
                    </CardContent>
                  </Card>
                ) : (
                  raceEvents.map((event) => {
                    const days = daysLeft(event.event_date);
                    const badge = daysLeftBadge(days);
                    const sc = sportColor(event.sport);
                    return (
                      <Card key={event.id}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="font-medium">{event.name}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ backgroundColor: sc.bg, color: sc.text }}
                                >
                                  {event.sport}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(parseISO(event.event_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </span>
                                {event.distance_km && (
                                  <span className="text-xs text-muted-foreground">{event.distance_km} km</span>
                                )}
                              </div>
                              {event.location && (
                                <p className="text-xs text-muted-foreground">{event.location}</p>
                              )}
                              {event.goal && (
                                <p className="text-xs italic text-muted-foreground">🎯 {event.goal}</p>
                              )}
                            </div>
                            <span
                              className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap"
                              style={{ backgroundColor: badge.bg, color: badge.text }}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="recuperacao" className="space-y-6 mt-4">
              <div className="space-y-3">
                <h3 className="text-base font-medium">Como você está hoje?</h3>
                {todayRecovery && !showRecoveryForm ? (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`px-3 py-2 rounded-lg text-sm flex justify-between ${scoreColor(todayRecovery.disposition_score || 0)}`}>
                          <span>Disposição</span>
                          <span className="font-bold">{todayRecovery.disposition_score ?? "—"}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-lg text-sm flex justify-between ${scoreColor(todayRecovery.energy_score || 0)}`}>
                          <span>Energia</span>
                          <span className="font-bold">{todayRecovery.energy_score ?? "—"}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-lg text-sm flex justify-between ${scoreColor(todayRecovery.muscle_score || 0)}`}>
                          <span>Músculos</span>
                          <span className="font-bold">{todayRecovery.muscle_score ?? "—"}</span>
                        </div>
                        <div className={`px-3 py-2 rounded-lg text-sm flex justify-between ${scoreColor(todayRecovery.joint_score || 0)}`}>
                          <span>Articulações</span>
                          <span className="font-bold">{todayRecovery.joint_score ?? "—"}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setRecHrv(todayRecovery.hrv_rmssd ?? "");
                          setRecHr(todayRecovery.resting_heart_rate ?? "");
                          setRecSleepHours(todayRecovery.sleep_hours ?? "");
                          setRecSleepQuality(todayRecovery.sleep_quality ?? 0);
                          setRecDisposition(todayRecovery.disposition_score ?? 50);
                          setRecEnergy(todayRecovery.energy_score ?? 50);
                          setRecMuscle(todayRecovery.muscle_score ?? 50);
                          setRecJoint(todayRecovery.joint_score ?? 50);
                          setRecStress(todayRecovery.stress_score ?? 0);
                          setRecNotes(todayRecovery.free_notes ?? "");
                          setShowRecoveryForm(true);
                          setTodayRecovery(null);
                        }}
                      >
                        Editar registro
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>HRV matinal (RMSSD)</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 58 ms"
                            value={recHrv}
                            onChange={(e) => setRecHrv(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>FC de repouso</Label>
                          <Input
                            type="number"
                            placeholder="Ex: 52 bpm"
                            value={recHr}
                            onChange={(e) => setRecHr(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Horas dormidas</Label>
                          <Input
                            type="number"
                            min={0}
                            max={12}
                            step={0.5}
                            value={recSleepHours}
                            onChange={(e) => setRecSleepHours(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Qualidade do sono</Label>
                          <div className="flex gap-1 pt-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setRecSleepQuality(s)}
                                aria-label={`${s} estrelas`}
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    s <= recSleepQuality
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/40"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Disposição</span>
                          <span className="font-bold">{recDisposition}</span>
                        </Label>
                        <Slider value={[recDisposition]} onValueChange={(v) => setRecDisposition(v[0])} min={0} max={100} step={1} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Energia</span>
                          <span className="font-bold">{recEnergy}</span>
                        </Label>
                        <Slider value={[recEnergy]} onValueChange={(v) => setRecEnergy(v[0])} min={0} max={100} step={1} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Músculos</span>
                          <span className="font-bold">{recMuscle}</span>
                        </Label>
                        <Slider value={[recMuscle]} onValueChange={(v) => setRecMuscle(v[0])} min={0} max={100} step={1} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex justify-between">
                          <span>Articulações</span>
                          <span className="font-bold">{recJoint}</span>
                        </Label>
                        <Slider value={[recJoint]} onValueChange={(v) => setRecJoint(v[0])} min={0} max={100} step={1} />
                      </div>

                      <div className="space-y-2">
                        <Label>Humor / estresse</Label>
                        <div className="flex gap-2">
                          {[
                            { v: 1, e: "😔" },
                            { v: 2, e: "😐" },
                            { v: 3, e: "🙂" },
                            { v: 4, e: "😊" },
                            { v: 5, e: "😄" },
                          ].map((m) => (
                            <button
                              key={m.v}
                              type="button"
                              onClick={() => setRecStress(m.v)}
                              className={`flex-1 text-2xl py-2 rounded-md border-2 transition-colors ${
                                recStress === m.v
                                  ? "border-teal-600 bg-teal-50"
                                  : "border-border hover:border-muted-foreground/40"
                              }`}
                            >
                              {m.e}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Notas</Label>
                        <Textarea
                          placeholder="Como você está se sentindo hoje?"
                          value={recNotes}
                          onChange={(e) => setRecNotes(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={handleSaveRecovery}
                        disabled={savingRecovery}
                        className="w-full"
                      >
                        {savingRecovery ? "Salvando..." : "Salvar registro do dia"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  Recomendações dos profissionais
                </h3>
                {recommendations.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma recomendação de profissionais ainda
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  Object.entries(
                    recommendations.reduce<Record<string, any[]>>((acc, r) => {
                      if (!acc[r.specialty]) acc[r.specialty] = [];
                      acc[r.specialty].push(r);
                      return acc;
                    }, {})
                  ).map(([specialty, items]) => (
                    <Card key={specialty}>
                      <CardContent className="p-4 space-y-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${specialtyColor(specialty)}`}>
                          {specialty}
                        </span>
                        <div className="space-y-3">
                          {items.map((rec) => (
                            <div key={rec.id} className="space-y-1">
                              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                {rec.dimension}
                              </p>
                              <p className="text-sm">{rec.recommendation}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(parseISO(rec.created_at), "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="evolucao">
              <PerformanceEvolution userId={user.id} patientId={patientId} />
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Faça login para acessar seus treinos.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={showRaceForm} onOpenChange={setShowRaceForm}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Adicionar prova</SheetTitle>
            <SheetDescription>Cadastre uma competição, treino especial ou teste de performance.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da prova *</Label>
              <Input value={raceName} onChange={(e) => setRaceName(e.target.value)} placeholder="Ex: Maratona de São Paulo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Esporte *</Label>
                <Select value={raceSport} onValueChange={setRaceSport}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrida">Corrida</SelectItem>
                    <SelectItem value="ciclismo">Ciclismo</SelectItem>
                    <SelectItem value="natacao">Natação</SelectItem>
                    <SelectItem value="triatlo">Triátlo</SelectItem>
                    <SelectItem value="trail">Trail Running</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Distância (km)</Label>
                <Input type="number" step="0.1" value={raceDistance} onChange={(e) => setRaceDistance(e.target.value)} placeholder="42.2" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={raceType} onValueChange={setRaceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="competicao">Competição</SelectItem>
                    <SelectItem value="treino_especial">Treino especial</SelectItem>
                    <SelectItem value="teste_performance">Teste de performance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Local</Label>
              <Input value={raceLocation} onChange={(e) => setRaceLocation(e.target.value)} placeholder="Cidade / Estado" />
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Input value={raceGoal} onChange={(e) => setRaceGoal(e.target.value)} placeholder="Ex: terminar em menos de 4h" />
            </div>
            <div className="space-y-1.5">
              <Label>TSS planejado</Label>
              <Input type="number" value={racePlannedTss} onChange={(e) => setRacePlannedTss(e.target.value)} placeholder="Ex: 250" />
            </div>
            <Button onClick={handleSaveRace} disabled={savingRace || !raceName || !raceSport || !raceDate} className="w-full">
              {savingRace ? "Salvando..." : "Salvar prova"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PatientLayout>
  );
}
