import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Heart, Droplets, Weight, Stethoscope, Delete, ArrowRight, Save } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { markDataUpdated } from "@/lib/healthDataEvents";

interface VitalsEntryProps {
  patientId: string;
}

const Numpad = ({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) => (
  <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
    {["1","2","3","4","5","6","7","8","9"].map(d => (
      <button key={d} onClick={() => onDigit(d)}
        className="h-14 rounded-xl text-xl font-semibold bg-card border border-border hover:bg-accent/10 transition-colors text-foreground"
      >{d}</button>
    ))}
    <button onClick={() => onDigit("0")} className="h-14 rounded-xl text-xl font-semibold bg-card border border-border hover:bg-accent/10 col-start-2 text-foreground">0</button>
    <button onClick={onDelete} className="h-14 rounded-xl text-xl font-semibold bg-card border border-border hover:bg-destructive/10 col-start-3 text-foreground flex items-center justify-center">
      <Delete className="h-5 w-5" />
    </button>
  </div>
);

const getPaBadge = (sys: number, dia: number): { label: string; bg: string; color: string; bold?: boolean } => {
  if (sys >= 180 || dia >= 120) return { label: "Crise", bg: "#FDECEA", color: "#E74C3C", bold: true };
  if (sys >= 140 || dia >= 90) return { label: "Alterado", bg: "#FDECEA", color: "#E74C3C" };
  if (sys >= 130 || dia >= 80) return { label: "Atenção", bg: "#FEF3C7", color: "#F59E0B" };
  return { label: "Normal", bg: "#DCFCE7", color: "#16A34A" };
};

const getGlucoseBadge = (val: number, moment: string) => {
  if (val < 70) return { label: "Hipoglicemia", bg: "#FDECEA", color: "#E74C3C" };
  if (moment === "jejum") {
    if (val >= 126) return { label: "Alterado", bg: "#FDECEA", color: "#E74C3C" };
    if (val >= 100) return { label: "Atenção", bg: "#FEF3C7", color: "#F59E0B" };
  } else {
    if (val > 200) return { label: "Alterado", bg: "#FDECEA", color: "#E74C3C" };
    if (val > 140) return { label: "Atenção", bg: "#FEF3C7", color: "#F59E0B" };
  }
  return { label: "Normal", bg: "#DCFCE7", color: "#16A34A" };
};

const RecentRecords = ({ records, type }: { records: any[]; type: string }) => {
  if (!records.length) return null;
  const formatValue = (r: any) => {
    if (type === "pressao") return `${r.systolic}/${r.diastolic} mmHg · FC ${r.heart_rate || "—"} bpm`;
    if (type === "glicemia") return `${r.glucose} mg/dL · ${r.glucose_moment === "jejum" ? "Jejum" : r.glucose_moment === "pos_prandial" ? "Pós-prandial" : r.glucose_moment === "antes_dormir" ? "Antes de dormir" : "Aleatório"}`;
    if (type === "peso") return `${Number(r.weight).toFixed(1)} kg`;
    return `${(r.symptoms || []).length} sintoma(s) · Bem-estar: ${r.wellbeing}/10`;
  };
  const getBadge = (r: any) => {
    if (type === "pressao" && r.systolic && r.diastolic) return getPaBadge(r.systolic, r.diastolic);
    if (type === "glicemia" && r.glucose) return getGlucoseBadge(Number(r.glucose), r.glucose_moment || "aleatorio");
    return null;
  };
  return (
    <div className="space-y-2 mb-6">
      <p className="text-xs font-medium text-muted-foreground">Últimos registros</p>
      {records.map(r => {
        const badge = getBadge(r);
        return (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-2xl border border-border bg-card">
            <div>
              <p className="text-sm font-medium text-foreground">{formatValue(r)}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(r.recorded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
            {badge && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color, fontWeight: ('bold' in badge && badge.bold) ? 700 : 600 }}>{badge.label}</span>}
          </div>
        );
      })}
    </div>
  );
};

export default function VitalsEntry({ patientId }: VitalsEntryProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [recentByType, setRecentByType] = useState<Record<string, any[]>>({});

  const [paStep, setPaStep] = useState<0 | 1 | 2>(0);
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [heartRate, setHeartRate] = useState("");

  const [glucose, setGlucose] = useState("");
  const [glucoseMoment, setGlucoseMoment] = useState("jejum");

  const [weightInt, setWeightInt] = useState("");
  const [weightDec, setWeightDec] = useState("");
  const [weightField, setWeightField] = useState<"int" | "dec">("int");

  const SYMPTOM_LIST = ["Falta de ar","Tontura","Dor no peito","Inchaço nas pernas","Dor de cabeça","Fraqueza","Náusea","Queda hoje","Palpitações","Visão turva","Formigamento","Cansaço excessivo"];
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [wellbeing, setWellbeing] = useState(5);

  const fetchRecent = useCallback(async () => {
    const types = ["pressao", "glicemia", "peso", "sintomas"];
    const results: Record<string, any[]> = {};
    await Promise.all(types.map(async (t) => {
      const { data } = await supabase.from("vital_signs").select("*").eq("patient_id", patientId).eq("type", t).order("recorded_at", { ascending: false }).limit(3);
      results[t] = data || [];
    }));
    setRecentByType(results);
  }, [patientId]);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const paFields = [systolic, diastolic, heartRate];
  const paSetters = [setSystolic, setDiastolic, setHeartRate];
  const paLabels = ["Sistólica", "Diastólica", "Freq. Cardíaca"];
  const paUnits = ["mmHg", "mmHg", "bpm"];

  const handlePaDigit = (d: string) => { const c = paFields[paStep]; if (c.length < 3) paSetters[paStep](c + d); };
  const handlePaDelete = () => paSetters[paStep](paFields[paStep].slice(0, -1));
  const handleGlucoseDigit = (d: string) => { if (glucose.length < 3) setGlucose(glucose + d); };
  const handleGlucoseDelete = () => setGlucose(glucose.slice(0, -1));
  const handleWeightDigit = (d: string) => { if (weightField === "int") { if (weightInt.length < 3) setWeightInt(weightInt + d); } else { if (weightDec.length < 1) setWeightDec(d); } };
  const handleWeightDelete = () => { if (weightField === "int") setWeightInt(weightInt.slice(0, -1)); else setWeightDec(weightDec.slice(0, -1)); };
  const toggleSymptom = (s: string) => setSelectedSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const numericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"];
    if (allowedKeys.includes(e.key) || ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))) return;
    if (!/[0-9.,]/.test(e.key)) e.preventDefault();
  };
  const handleIntegerInput = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    maxLength = 3,
  ) => {
    const sanitized = value.replace(/[^\d]/g, "").slice(0, maxLength);
    setter(sanitized);
  };
  const handleDecimalInput = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    maxLength = 6,
  ) => {
    const sanitized = value.replace(/[^\d.,]/g, "").replace(/,/g, ".");
    const parts = sanitized.split(".");
    const normalized = parts.length <= 1 ? parts[0] : `${parts[0]}.${parts.slice(1).join("")}`;
    setter(normalized.slice(0, maxLength));
  };
  const weightDisplayValue = `${weightInt || ""}${weightDec ? `,${weightDec}` : ""}`;
  const handleWeightInput = (value: string) => {
    const sanitized = value.replace(/[^\d.,]/g, "").replace(/,/g, ".");
    const [intPart = "", decPart = ""] = sanitized.split(".");
    setWeightInt(intPart.replace(/\D/g, "").slice(0, 3));
    setWeightDec(decPart.replace(/\D/g, "").slice(0, 1));
  };

  const saveRecord = async (type: string) => {
    setSaving(true);
    try {
      let record: any = { patient_id: patientId, type, recorded_at: new Date().toISOString() };
      if (type === "pressao") {
        if (!systolic || !diastolic || !heartRate) { toast({ title: "Preencha todos os campos", variant: "destructive" }); setSaving(false); return; }
        record = { ...record, systolic: parseInt(systolic), diastolic: parseInt(diastolic), heart_rate: parseInt(heartRate) };
      } else if (type === "glicemia") {
        if (!glucose) { toast({ title: "Informe a glicemia", variant: "destructive" }); setSaving(false); return; }
        record = { ...record, glucose: parseFloat(glucose), glucose_moment: glucoseMoment };
      } else if (type === "peso") {
        if (!weightInt) { toast({ title: "Informe o peso", variant: "destructive" }); setSaving(false); return; }
        record = { ...record, weight: parseFloat(`${weightInt}.${weightDec || "0"}`) };
      } else if (type === "sintomas") {
        if (!selectedSymptoms.length) { toast({ title: "Selecione pelo menos um sintoma", variant: "destructive" }); setSaving(false); return; }
        record = { ...record, symptoms: selectedSymptoms, wellbeing };
      }
      const { error } = await supabase.from("vital_signs").insert(record as any);
      if (error) throw error;
      markDataUpdated();
      toast({ title: "✅ Registro salvo" });
      if (type === "pressao") { setSystolic(""); setDiastolic(""); setHeartRate(""); setPaStep(0); }
      if (type === "glicemia") setGlucose("");
      if (type === "peso") { setWeightInt(""); setWeightDec(""); setWeightField("int"); }
      if (type === "sintomas") { setSelectedSymptoms([]); setWellbeing(5); }
      fetchRecent();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const wellbeingColor = wellbeing <= 4 ? "#E74C3C" : wellbeing <= 6 ? "#F59E0B" : "#16A34A";
  const wellbeingLabel = ["","Muito mal","Muito mal","Mal","Mal","Regular","Regular","Bem","Bem","Muito bem","Excelente"];

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Tabs defaultValue="pressao">
        <TabsList className="w-full grid grid-cols-4 h-11 rounded-2xl bg-muted/60">
          <TabsTrigger value="pressao" className="rounded-xl text-xs sm:text-sm gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm"><Heart className="h-4 w-4" /> Pressão</TabsTrigger>
          <TabsTrigger value="glicemia" className="rounded-xl text-xs sm:text-sm gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm"><Droplets className="h-4 w-4" /> Glicemia</TabsTrigger>
          <TabsTrigger value="peso" className="rounded-xl text-xs sm:text-sm gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm"><Weight className="h-4 w-4" /> Peso</TabsTrigger>
          <TabsTrigger value="sintomas" className="rounded-xl text-xs sm:text-sm gap-1 data-[state=active]:bg-card data-[state=active]:shadow-sm"><Stethoscope className="h-4 w-4" /> Sintomas</TabsTrigger>
        </TabsList>

        <TabsContent value="pressao" className="mt-4 space-y-4">
          <RecentRecords records={recentByType["pressao"] || []} type="pressao" />
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2].map(i => (
              <Card key={i} className={`cursor-pointer transition-all rounded-2xl ${paStep === i ? "ring-2 ring-primary border-primary" : ""}`} onClick={() => setPaStep(i as 0|1|2)}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">{paLabels[i]}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{paFields[i] || "—"}</p>
                  <p className="text-xs text-muted-foreground">{paUnits[i]}</p>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={paFields[i]}
                    onChange={(e) => handleIntegerInput(e.target.value, paSetters[i])}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={numericKeyDown}
                    className="mt-3 h-8 text-center"
                    placeholder="Digite"
                    onClick={(e) => e.stopPropagation()}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
          {systolic && diastolic && (() => { const b = getPaBadge(parseInt(systolic), parseInt(diastolic)); return <div className="text-center"><span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: b.bg, color: b.color }}>{b.label}</span></div>; })()}
          <Numpad onDigit={handlePaDigit} onDelete={handlePaDelete} />
          {paStep < 2 ? (
            <Button onClick={() => setPaStep((paStep + 1) as 0|1|2)} className="w-full h-12 rounded-xl text-base" style={{ backgroundColor: "#1E2D4E" }} disabled={!paFields[paStep]}>Próximo <ArrowRight className="ml-2 h-4 w-4" /></Button>
          ) : (
            <Button onClick={() => saveRecord("pressao")} className="w-full h-12 rounded-xl text-base" style={{ backgroundColor: "#1E2D4E" }} disabled={saving || !heartRate}><Save className="mr-2 h-4 w-4" /> Salvar Registro</Button>
          )}
        </TabsContent>

        <TabsContent value="glicemia" className="mt-4 space-y-4">
          <RecentRecords records={recentByType["glicemia"] || []} type="glicemia" />
          <div className="flex gap-2 flex-wrap">
            {[{ value: "jejum", label: "Jejum" },{ value: "pos_prandial", label: "Pós-prandial" },{ value: "aleatorio", label: "Aleatório" },{ value: "antes_dormir", label: "Antes de dormir" }].map(m => (
              <button key={m.value} onClick={() => setGlucoseMoment(m.value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${glucoseMoment === m.value ? "text-primary-foreground" : "bg-muted/60 text-foreground"}`}
                style={glucoseMoment === m.value ? { backgroundColor: "#1E2D4E" } : {}}
              >{m.label}</button>
            ))}
          </div>
          <Card className="rounded-2xl"><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Glicemia</p>
            <p className="text-4xl font-bold text-foreground mt-1">{glucose || "—"}</p>
            <p className="text-sm text-muted-foreground">mg/dL</p>
            {glucose && (() => { const b = getGlucoseBadge(parseInt(glucose), glucoseMoment); return <span className="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: b.bg, color: b.color }}>{b.label}</span>; })()}
            <Input
              type="text"
              inputMode="decimal"
              value={glucose}
              onChange={(e) => handleDecimalInput(e.target.value, setGlucose)}
              onFocus={(e) => e.target.select()}
              onKeyDown={numericKeyDown}
              className="mt-3 h-9 text-center"
              placeholder="Digite o valor"
            />
          </CardContent></Card>
          <Numpad onDigit={handleGlucoseDigit} onDelete={handleGlucoseDelete} />
          <Button onClick={() => saveRecord("glicemia")} className="w-full h-12 rounded-xl text-base" style={{ backgroundColor: "#1E2D4E" }} disabled={saving || !glucose}><Save className="mr-2 h-4 w-4" /> Salvar Registro</Button>
        </TabsContent>

        <TabsContent value="peso" className="mt-4 space-y-4">
          <RecentRecords records={recentByType["peso"] || []} type="peso" />
          <Card className="rounded-2xl"><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Peso</p>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className={`text-4xl font-bold cursor-pointer px-2 rounded-lg text-foreground ${weightField === "int" ? "bg-primary/10 ring-2 ring-primary" : ""}`} onClick={() => setWeightField("int")}>{weightInt || "—"}</span>
              <span className="text-3xl font-bold text-muted-foreground">,</span>
              <span className={`text-4xl font-bold cursor-pointer px-2 rounded-lg text-foreground ${weightField === "dec" ? "bg-primary/10 ring-2 ring-primary" : ""}`} onClick={() => setWeightField("dec")}>{weightDec || "0"}</span>
              <span className="text-lg text-muted-foreground ml-1">kg</span>
            </div>
            <Input
              type="text"
              inputMode="decimal"
              value={weightDisplayValue}
              onChange={(e) => handleWeightInput(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={numericKeyDown}
              className="mt-3 h-9 text-center"
              placeholder="Digite o peso"
            />
          </CardContent></Card>
          <Numpad onDigit={handleWeightDigit} onDelete={handleWeightDelete} />
          <Button onClick={() => saveRecord("peso")} className="w-full h-12 rounded-xl text-base" style={{ backgroundColor: "#1E2D4E" }} disabled={saving || !weightInt}><Save className="mr-2 h-4 w-4" /> Salvar Registro</Button>
        </TabsContent>

        <TabsContent value="sintomas" className="mt-4 space-y-4">
          <RecentRecords records={recentByType["sintomas"] || []} type="sintomas" />
          <div className="grid grid-cols-2 gap-2">
            {SYMPTOM_LIST.map(s => (
              <button key={s} onClick={() => toggleSymptom(s)}
                className="p-3 rounded-xl text-sm font-medium text-left transition-colors border"
                style={selectedSymptoms.includes(s) ? { backgroundColor: "#1E2D4E", color: "#FFFFFF", borderColor: "transparent" } : { backgroundColor: "#F2F4F7", color: "#1A2540", borderColor: "transparent" }}
              >{s}</button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-foreground">Bem-estar geral</p>
              <span className="text-lg font-bold" style={{ color: wellbeingColor }}>{wellbeing}/10 — {wellbeingLabel[wellbeing]}</span>
            </div>
            <Slider value={[wellbeing]} onValueChange={v => setWellbeing(v[0])} min={1} max={10} step={1} className="py-2" />
          </div>
          <Button onClick={() => saveRecord("sintomas")} className="w-full h-12 rounded-xl text-base" style={{ backgroundColor: "#1E2D4E" }} disabled={saving || !selectedSymptoms.length}><Save className="mr-2 h-4 w-4" /> Salvar Registro</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
