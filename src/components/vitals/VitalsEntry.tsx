import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Heart,
  Droplets,
  Scale,
  Activity,
  AlertTriangle,
  CheckCircle,
  Save,
  Delete,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
interface Props {
  patientId: string;
  patientName: string;
}

type AlertLevel = "normal" | "warning" | "critical";

// ─── Numpad ──────────────────────────────────────────────────────────
function NumPad({ value, onChange, maxLength = 3 }: { value: string; onChange: (v: string) => void; maxLength?: number }) {
  const press = (d: string) => {
    if (value.length < maxLength) onChange(value + d);
  };
  const del = () => onChange(value.slice(0, -1));
  const clear = () => onChange("");

  return (
    <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
      {["1","2","3","4","5","6","7","8","9"].map(d => (
        <button key={d} type="button" onClick={() => press(d)}
          className="h-14 min-w-[48px] rounded-xl bg-secondary text-foreground text-xl font-bold active:scale-95 transition-transform">
          {d}
        </button>
      ))}
      <button type="button" onClick={clear}
        className="h-14 min-w-[48px] rounded-xl bg-destructive/10 text-destructive text-base font-semibold active:scale-95 transition-transform">
        Limpar
      </button>
      <button type="button" onClick={() => press("0")}
        className="h-14 min-w-[48px] rounded-xl bg-secondary text-foreground text-xl font-bold active:scale-95 transition-transform">
        0
      </button>
      <button type="button" onClick={del}
        className="h-14 min-w-[48px] rounded-xl bg-muted text-muted-foreground text-xl active:scale-95 transition-transform flex items-center justify-center">
        <Delete className="h-5 w-5" />
      </button>
    </div>
  );
}

// ─── Alert Banner ────────────────────────────────────────────────────
function AlertBanner({ level, message }: { level: AlertLevel; message: string }) {
  if (level === "normal") {
    return (
      <Alert className="border-green-500/50 bg-green-500/10">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400 text-base">Normal</AlertTitle>
        <AlertDescription className="text-green-600 dark:text-green-300 text-sm">{message}</AlertDescription>
      </Alert>
    );
  }
  const isCritical = level === "critical";
  return (
    <Alert className={isCritical ? "border-red-500/50 bg-red-500/10 animate-pulse" : "border-orange-500/50 bg-orange-500/10"}>
      <AlertTriangle className={`h-5 w-5 ${isCritical ? "text-red-600" : "text-orange-600"}`} />
      <AlertTitle className={`${isCritical ? "text-red-700 dark:text-red-400" : "text-orange-700 dark:text-orange-400"} text-base font-bold`}>
        {isCritical ? "⚠️ Alerta Urgente" : "⚠️ Atenção"}
      </AlertTitle>
      <AlertDescription className={`${isCritical ? "text-red-600 dark:text-red-300" : "text-orange-600 dark:text-orange-300"} text-sm`}>
        {message}
      </AlertDescription>
    </Alert>
  );
}

// ─── Value Display ───────────────────────────────────────────────────
function BigValue({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-5xl font-bold tabular-nums text-foreground">{value || "—"}</p>
      <p className="text-xs text-muted-foreground mt-1">{unit}</p>
    </div>
  );
}

// ─── Wellbeing labels ────────────────────────────────────────────────
const wellbeingLabels: Record<number, string> = {
  1: "Muito mal", 2: "Mal", 3: "Ruim", 4: "Desconfortável",
  5: "Regular", 6: "Razoável", 7: "Bem", 8: "Muito bem", 9: "Ótimo", 10: "Excelente",
};

// ─── Symptom chips ───────────────────────────────────────────────────
const SYMPTOM_OPTIONS = [
  "Falta de ar", "Tontura", "Dor no peito", "Inchaço nas pernas",
  "Dor de cabeça", "Fraqueza", "Náusea", "Queda hoje",
];
const URGENT_SYMPTOMS = ["Queda hoje", "Dor no peito", "Falta de ar"];

// ═════════════════════════════════════════════════════════════════════
export default function VitalsEntry({ patientId, patientName }: Props) {
  const [tab, setTab] = useState("pa");
  const [saving, setSaving] = useState(false);

  // PA state
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [paField, setPaField] = useState<"sys" | "dia" | "hr">("sys");

  // Glicemia state
  const [glucose, setGlucose] = useState("");
  const [glucoseMoment, setGlucoseMoment] = useState<"jejum" | "pos_refeicao">("jejum");

  // Peso state
  const [weight, setWeight] = useState<number[]>([70]);
  const [lastWeight, setLastWeight] = useState<number | null>(null);

  // Sintomas state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [wellbeing, setWellbeing] = useState<number[]>([5]);

  // Fetch last weight on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vitals_log")
        .select("weight_value")
        .eq("patient_id", patientId)
        .eq("vital_type", "peso")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.weight_value) {
        setLastWeight(Number(data.weight_value));
        setWeight([Number(data.weight_value)]);
      }
    })();
  }, [patientId]);

  // ── PA Alert logic ──
  const getPaAlert = useCallback((): { level: AlertLevel; message: string } => {
    const s = parseInt(systolic); const d = parseInt(diastolic);
    if (!s || !d) return { level: "normal", message: "Insira os valores" };
    if (s >= 180 || d >= 110) return { level: "critical", message: "PA muito elevada! Procure atendimento imediato. Familiar será notificado." };
    if (s >= 160 || d >= 100) return { level: "warning", message: "PA elevada. Verifique se tomou a medicação hoje." };
    if (s >= 120 && s < 160 && d >= 80 && d < 100) return { level: "normal", message: "PA dentro da normalidade." };
    return { level: "normal", message: "Valores registrados." };
  }, [systolic, diastolic]);

  // ── Glucose Alert logic ──
  const getGlucoseAlert = useCallback((): { level: AlertLevel; message: string } => {
    const g = parseFloat(glucose);
    if (!g) return { level: "normal", message: "Insira o valor" };
    if (g < 70) return { level: "critical", message: "Hipoglicemia! Ingerir 15g de carboidrato agora (ex: 1 colher de sopa de açúcar em água)." };
    if (g > 250) return { level: "critical", message: "Hiperglicemia grave! Contacte seu médico imediatamente." };
    if (g >= 70 && g <= 180) return { level: "normal", message: "Glicemia em alvo. ✓" };
    return { level: "warning", message: "Glicemia acima do ideal. Monitore nas próximas horas." };
  }, [glucose]);

  // ── Symptom Alert logic ──
  const getSymptomAlert = useCallback((): { level: AlertLevel; message: string } => {
    const urgent = selectedSymptoms.filter(s => URGENT_SYMPTOMS.includes(s));
    if (urgent.length > 0) return { level: "critical", message: `Sintoma(s) urgente(s): ${urgent.join(", ")}. Seu cuidador será notificado.` };
    if (selectedSymptoms.length > 0) return { level: "warning", message: "Sintomas registrados. Informe ao seu médico na próxima consulta." };
    return { level: "normal", message: "Nenhum sintoma selecionado." };
  }, [selectedSymptoms]);

  // ── Save handler ──
  const handleSave = async () => {
    setSaving(true);
    try {
      let alertLevel: AlertLevel = "normal";
      let alertMsg = "";
      const record: Record<string, any> = {
        patient_id: patientId,
        vital_type: tab,
        alert_generated: false,
      };

      if (tab === "pa") {
        if (!systolic || !diastolic) { toast.error("Preencha sistólica e diastólica"); setSaving(false); return; }
        record.systolic = parseInt(systolic);
        record.diastolic = parseInt(diastolic);
        record.heart_rate = heartRate ? parseInt(heartRate) : null;
        const a = getPaAlert();
        alertLevel = a.level; alertMsg = a.message;
      } else if (tab === "glicemia") {
        if (!glucose) { toast.error("Preencha o valor da glicemia"); setSaving(false); return; }
        record.glucose_value = parseFloat(glucose);
        record.glucose_moment = glucoseMoment;
        const a = getGlucoseAlert();
        alertLevel = a.level; alertMsg = a.message;
      } else if (tab === "peso") {
        record.weight_value = weight[0];
      } else if (tab === "sintoma") {
        if (selectedSymptoms.length === 0 && wellbeing[0] === 5) { toast.error("Selecione ao menos um sintoma ou ajuste o bem-estar"); setSaving(false); return; }
        record.symptoms = selectedSymptoms;
        record.wellbeing_score = wellbeing[0];
        const a = getSymptomAlert();
        alertLevel = a.level; alertMsg = a.message;
      }

      if (alertLevel !== "normal") {
        record.alert_generated = true;
        record.alert_severity = alertLevel;
      }

      const { data: inserted, error } = await supabase
        .from("vitals_log")
        .insert([record as any])
        .select("id")
        .single();

      if (error) throw error;

      // Create alert record if needed
      if (alertLevel !== "normal" && inserted) {
        await supabase.from("vitals_alerts").insert({
          patient_id: patientId,
          vital_log_id: inserted.id,
          alert_type: tab,
          severity: alertLevel,
          message: alertMsg,
        });

        // Fire edge function for critical alerts
        if (alertLevel === "critical") {
          supabase.functions.invoke("vitals-alert-notify", {
            body: { patient_id: patientId, alert_type: tab, severity: alertLevel, message: alertMsg },
          }).catch(() => {});
        }
      }

      toast.success("Registro salvo com sucesso!");

      // Reset fields
      if (tab === "pa") { setSystolic(""); setDiastolic(""); setHeartRate(""); }
      if (tab === "glicemia") { setGlucose(""); }
      if (tab === "sintoma") { setSelectedSymptoms([]); setWellbeing([5]); }
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const paAlert = getPaAlert();
  const glucoseAlert = getGlucoseAlert();
  const symptomAlert = getSymptomAlert();
  const weightDelta = lastWeight != null ? +(weight[0] - lastWeight).toFixed(1) : null;

  const toggleSymptom = (s: string) => {
    setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const numpadValue = paField === "sys" ? systolic : paField === "dia" ? diastolic : heartRate;
  const numpadSet = paField === "sys" ? setSystolic : paField === "dia" ? setDiastolic : setHeartRate;

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold text-foreground">{patientName}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Heart className="h-8 w-8 text-primary" />
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full h-12">
          <TabsTrigger value="pa" className="text-xs sm:text-sm gap-1 data-[state=active]:bg-red-500/10">
            <Heart className="h-4 w-4" /> Pressão
          </TabsTrigger>
          <TabsTrigger value="glicemia" className="text-xs sm:text-sm gap-1 data-[state=active]:bg-blue-500/10">
            <Droplets className="h-4 w-4" /> Glicemia
          </TabsTrigger>
          <TabsTrigger value="peso" className="text-xs sm:text-sm gap-1 data-[state=active]:bg-green-500/10">
            <Scale className="h-4 w-4" /> Peso
          </TabsTrigger>
          <TabsTrigger value="sintoma" className="text-xs sm:text-sm gap-1 data-[state=active]:bg-purple-500/10">
            <Activity className="h-4 w-4" /> Sintomas
          </TabsTrigger>
        </TabsList>

        {/* ═══ PA Tab ═══ */}
        <TabsContent value="pa" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Values display */}
              <div className="flex items-end justify-center gap-4">
                <button type="button" onClick={() => setPaField("sys")}
                  className={`p-3 rounded-xl transition-colors ${paField === "sys" ? "ring-2 ring-primary bg-primary/5" : ""}`}>
                  <BigValue label="Sistólica" value={systolic} unit="mmHg" />
                </button>
                <span className="text-3xl font-bold text-muted-foreground pb-6">/</span>
                <button type="button" onClick={() => setPaField("dia")}
                  className={`p-3 rounded-xl transition-colors ${paField === "dia" ? "ring-2 ring-primary bg-primary/5" : ""}`}>
                  <BigValue label="Diastólica" value={diastolic} unit="mmHg" />
                </button>
              </div>
              <button type="button" onClick={() => setPaField("hr")}
                className={`mx-auto block p-3 rounded-xl transition-colors ${paField === "hr" ? "ring-2 ring-primary bg-primary/5" : ""}`}>
                <BigValue label="Freq. Cardíaca" value={heartRate} unit="bpm" />
              </button>

              {/* Numpad */}
              <NumPad value={numpadValue} onChange={numpadSet} />

              {/* Alert */}
              {(systolic && diastolic) && <AlertBanner level={paAlert.level} message={paAlert.message} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Glicemia Tab ═══ */}
        <TabsContent value="glicemia" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <BigValue label="Glicemia" value={glucose} unit="mg/dL" />

              {/* Moment selector */}
              <div className="flex gap-2 justify-center">
                <Button size="lg" variant={glucoseMoment === "jejum" ? "default" : "outline"}
                  onClick={() => setGlucoseMoment("jejum")} className="min-h-[48px] text-base">
                  Jejum
                </Button>
                <Button size="lg" variant={glucoseMoment === "pos_refeicao" ? "default" : "outline"}
                  onClick={() => setGlucoseMoment("pos_refeicao")} className="min-h-[48px] text-base">
                  Pós-refeição
                </Button>
              </div>

              <NumPad value={glucose} onChange={setGlucose} />

              {glucose && <AlertBanner level={glucoseAlert.level} message={glucoseAlert.message} />}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Peso Tab ═══ */}
        <TabsContent value="peso" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Peso atual</p>
                <p className="text-6xl font-bold tabular-nums text-foreground">{weight[0].toFixed(1)}</p>
                <p className="text-sm text-muted-foreground mt-1">kg</p>
              </div>

              <Slider
                value={weight}
                onValueChange={setWeight}
                min={30}
                max={200}
                step={0.1}
                className="w-full"
              />

              {weightDelta !== null && (
                <div className="text-center">
                  <Badge variant={Math.abs(weightDelta) > 2 ? "destructive" : "secondary"} className="text-base px-4 py-1">
                    {weightDelta > 0 ? "+" : ""}{weightDelta} kg desde último registro
                  </Badge>
                </div>
              )}

              <Alert className="border-blue-500/30 bg-blue-500/5">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                  Ganho &gt; 2kg em 3 dias pode indicar retenção hídrica (ICC). Informe seu médico.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ Sintomas Tab ═══ */}
        <TabsContent value="sintoma" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <p className="text-sm font-medium text-foreground">Selecione seus sintomas hoje:</p>
              <div className="grid grid-cols-2 gap-2">
                {SYMPTOM_OPTIONS.map(s => {
                  const isUrgent = URGENT_SYMPTOMS.includes(s);
                  const isSelected = selectedSymptoms.includes(s);
                  return (
                    <button key={s} type="button" onClick={() => toggleSymptom(s)}
                      className={`min-h-[48px] rounded-xl px-3 py-2 text-sm font-medium transition-all border
                        ${isSelected
                          ? isUrgent
                            ? "bg-red-500/20 border-red-500 text-red-700 dark:text-red-300"
                            : "bg-primary/10 border-primary text-primary"
                          : "bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary"}`
                      }>
                      {s}
                    </button>
                  );
                })}
              </div>

              {/* Wellbeing slider */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Como você se sente? (1–10)</p>
                <Slider value={wellbeing} onValueChange={setWellbeing} min={1} max={10} step={1} />
                <p className="text-center text-lg font-semibold text-foreground">
                  {wellbeing[0]} — {wellbeingLabels[wellbeing[0]]}
                </p>
              </div>

              {selectedSymptoms.length > 0 && <AlertBanner level={symptomAlert.level} message={symptomAlert.message} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save button */}
      <Button onClick={handleSave} disabled={saving} size="lg"
        className="w-full min-h-[56px] text-lg font-bold gap-2">
        <Save className="h-5 w-5" />
        {saving ? "Salvando..." : "Salvar Registro"}
      </Button>
    </div>
  );
}
