import { useState, useRef } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, ChevronDown, ChevronUp, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrainingPeaksImportProps {
  userId: string;
  patientId: string | null;
  onImported: () => void;
}

interface ParsedRow {
  selected: boolean;
  activity_name: string | null;
  sport: string;
  activity_date: string;
  duration_minutes: number | null;
  planned_duration_minutes: number | null;
  distance_km: number | null;
  tss: number | null;
  intensity_factor: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  elevation_gain_m: number | null;
  avg_pace_min_km: number | null;
  notes: string | null;
  perceived_effort: number | null;
  compliance_pct: number | null;
  srpe: number | null;
}

const SPORT_MAP: Record<string, string> = {
  run: "corrida",
  ride: "ciclismo",
  cycling: "ciclismo",
  bike: "ciclismo",
  swim: "natacao",
  strength: "musculacao",
};

const MANUAL_SPORTS = [
  { value: "corrida", label: "Corrida" },
  { value: "ciclismo", label: "Ciclismo" },
  { value: "natacao", label: "Natação" },
  { value: "musculacao", label: "Musculação" },
  { value: "funcional", label: "Funcional" },
  { value: "outro", label: "Outro" },
];

const FEELINGS = [
  { value: 1, emoji: "😫", label: "Péssimo" },
  { value: 2, emoji: "😕", label: "Ruim" },
  { value: 3, emoji: "😐", label: "Ok" },
  { value: 4, emoji: "🙂", label: "Bom" },
  { value: 5, emoji: "💪", label: "Ótimo" },
];

// Helpers
const pick = (row: any, keys: string[]): string | undefined => {
  for (const k of keys) {
    const lower = k.toLowerCase();
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase().trim() === lower) {
        const val = row[rk];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return String(val).trim();
        }
      }
    }
  }
  return undefined;
};

const parseDate = (v?: string): string => {
  if (!v) return new Date().toISOString().split("T")[0];
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  // MM/DD/YYYY
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return new Date().toISOString().split("T")[0];
};

const parseDurationToMinutes = (v?: string): number | null => {
  if (!v) return null;
  const s = v.trim();
  // HH:MM:SS or MM:SS
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) return Math.round(parts[0] * 60 + parts[1] + parts[2] / 60);
    if (parts.length === 2) return Math.round(parts[0] + parts[1] / 60);
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n);
};

const parseNum = (v?: string): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
};

const parseInteger = (v?: string): number | null => {
  const n = parseNum(v);
  return n === null ? null : Math.round(n);
};

const parseSport = (v?: string): string => {
  if (!v) return "outro";
  const key = v.toLowerCase().trim();
  return SPORT_MAP[key] || "outro";
};

export default function TrainingPeaksImport({
  userId,
  patientId,
  onImported,
}: TrainingPeaksImportProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Manual form state
  const [mName, setMName] = useState("");
  const [mSport, setMSport] = useState("corrida");
  const [mDate, setMDate] = useState(new Date().toISOString().split("T")[0]);
  const [mDuration, setMDuration] = useState("");
  const [mDistance, setMDistance] = useState("");
  const [mTss, setMTss] = useState("");
  const [mRpe, setMRpe] = useState<number[]>([5]);
  const [mHr, setMHr] = useState("");
  const [mCal, setMCal] = useState("");
  const [mFeeling, setMFeeling] = useState<number | null>(null);
  const [mNotes, setMNotes] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed: ParsedRow[] = (results.data as any[])
          .map((row) => {
            const duration_minutes = parseDurationToMinutes(
              pick(row, ["Duration", "Total Time"])
            );
            const perceived_effort = parseInteger(pick(row, ["RPE"]));
            let distance_km = parseNum(pick(row, ["Distance", "Total Distance"]));
            if (distance_km !== null && distance_km > 1000) distance_km = distance_km / 1000;
            return {
              selected: true,
              activity_name: pick(row, ["Title", "Workout Name"]) || null,
              sport: parseSport(pick(row, ["Workout Type"])),
              activity_date: parseDate(pick(row, ["Date", "Workout Date"])),
              duration_minutes,
              planned_duration_minutes: parseDurationToMinutes(
                pick(row, ["Planned Duration"])
              ),
              distance_km,
              tss: parseNum(pick(row, ["TSS"])),
              intensity_factor: parseNum(pick(row, ["IF", "Intensity Factor"])),
              avg_heart_rate: parseInteger(pick(row, ["Average Heart Rate"])),
              max_heart_rate: parseInteger(pick(row, ["Max Heart Rate"])),
              calories: parseInteger(pick(row, ["Calories"])),
              elevation_gain_m: parseNum(pick(row, ["Elevation Gain"])),
              avg_pace_min_km: parseNum(pick(row, ["Average Pace"])),
              notes: pick(row, ["Notes", "Workout Description"]) || null,
              perceived_effort,
              compliance_pct: parseInteger(pick(row, ["Compliance %", "Compliance"])),
              srpe:
                duration_minutes !== null && perceived_effort !== null
                  ? duration_minutes * perceived_effort
                  : null,
            };
          })
          .filter((r) => r.activity_date);
        setRows(parsed);
        if (parsed.length === 0) {
          toast.error("Nenhuma atividade encontrada no CSV");
        } else {
          toast.success(`${parsed.length} atividades carregadas`);
        }
      },
      error: () => toast.error("Erro ao processar o arquivo CSV"),
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleRow = (i: number) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, selected: !row.selected } : row)));
  };

  const toggleAll = (checked: boolean) => {
    setRows((r) => r.map((row) => ({ ...row, selected: checked })));
  };

  const handleImportSelected = async () => {
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      toast.error("Selecione ao menos uma atividade");
      return;
    }
    setImporting(true);
    const payload = selected.map(({ selected: _s, ...rest }) => ({
      ...rest,
      user_id: userId,
      patient_id: patientId,
      source: "training_peaks",
    }));
    const { error } = await supabase.from("workout_logs").insert(payload);
    setImporting(false);
    if (error) {
      toast.error("Erro ao importar atividades");
      return;
    }
    toast.success(`${selected.length} atividade(s) importada(s)! 💪`);
    setRows([]);
    onImported();
    setOpen(false);
  };

  const handleManualSave = async () => {
    if (!mDate) {
      toast.error("Data é obrigatória");
      return;
    }
    if (!mDuration) {
      toast.error("Duração é obrigatória");
      return;
    }
    setSavingManual(true);
    const duration_minutes = parseInt(mDuration, 10);
    const perceived_effort = mRpe[0];
    const { error } = await supabase.from("workout_logs").insert({
      user_id: userId,
      patient_id: patientId,
      activity_name: mName.trim() || null,
      sport: mSport,
      activity_date: mDate,
      duration_minutes,
      distance_km: mDistance ? parseFloat(mDistance.replace(",", ".")) : null,
      tss: mTss ? parseFloat(mTss.replace(",", ".")) : null,
      perceived_effort,
      srpe: duration_minutes * perceived_effort,
      avg_heart_rate: mHr ? parseInt(mHr, 10) : null,
      calories: mCal ? parseInt(mCal, 10) : null,
      feeling_score: mFeeling,
      notes: mNotes.trim() || null,
      source: "manual",
    });
    setSavingManual(false);
    if (error) {
      toast.error("Erro ao salvar atividade");
      return;
    }
    toast.success("Atividade adicionada! 💪");
    // Reset
    setMName("");
    setMSport("corrida");
    setMDate(new Date().toISOString().split("T")[0]);
    setMDuration("");
    setMDistance("");
    setMTss("");
    setMRpe([5]);
    setMHr("");
    setMCal("");
    setMFeeling(null);
    setMNotes("");
    setShowManual(false);
    onImported();
    setOpen(false);
  };

  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Importar do Training Peaks
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar do Training Peaks</SheetTitle>
          <SheetDescription>
            Faça upload do CSV exportado ou adicione uma atividade manualmente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Upload section */}
          <div className="space-y-3">
            <Label>Upload do CSV</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Selecione o arquivo .csv exportado do Training Peaks
              </p>
              <Input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="max-w-xs mx-auto"
              />
            </div>

            {rows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => toggleAll(!!v)}
                    />
                    <span className="text-sm">
                      {rows.filter((r) => r.selected).length} de {rows.length} selecionadas
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleImportSelected}
                    disabled={importing}
                  >
                    {importing ? "Importando..." : "Importar selecionados"}
                  </Button>
                </div>

                <div className="border rounded-lg max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Atividade</TableHead>
                        <TableHead>Distância</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>TSS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Checkbox
                              checked={r.selected}
                              onCheckedChange={() => toggleRow(i)}
                            />
                          </TableCell>
                          <TableCell className="text-xs">{r.activity_date}</TableCell>
                          <TableCell className="text-xs">
                            {r.activity_name || r.sport}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.distance_km !== null ? `${r.distance_km.toFixed(1)} km` : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.duration_minutes !== null ? `${r.duration_minutes}min` : "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.tss !== null ? r.tss.toFixed(0) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* Manual entry */}
          <div className="border-t pt-4">
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {showManual ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Ou adicionar atividade manualmente
            </button>

            {showManual && (
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome da atividade</Label>
                  <Input
                    value={mName}
                    onChange={(e) => setMName(e.target.value)}
                    placeholder="Ex: Treino longo de domingo"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Esporte</Label>
                    <Select value={mSport} onValueChange={setMSport}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MANUAL_SPORTS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data *</Label>
                    <Input
                      type="date"
                      value={mDate}
                      onChange={(e) => setMDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Duração (min) *</Label>
                    <Input
                      type="number"
                      value={mDuration}
                      onChange={(e) => setMDuration(e.target.value)}
                      placeholder="60"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Distância (km)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={mDistance}
                      onChange={(e) => setMDistance(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>TSS — se disponível</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={mTss}
                    onChange={(e) => setMTss(e.target.value)}
                    placeholder="Ex: 85"
                  />
                </div>

                <div className="space-y-2">
                  <Label>RPE (esforço percebido): <span className="font-bold">{mRpe[0]}/10</span></Label>
                  <Slider value={mRpe} onValueChange={setMRpe} min={0} max={10} step={1} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>FC média (bpm)</Label>
                    <Input
                      type="number"
                      value={mHr}
                      onChange={(e) => setMHr(e.target.value)}
                      placeholder="140"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Calorias</Label>
                    <Input
                      type="number"
                      value={mCal}
                      onChange={(e) => setMCal(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Como se sentiu?</Label>
                  <div className="flex gap-2">
                    {FEELINGS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setMFeeling(f.value)}
                        className={`flex-1 text-2xl py-2 rounded-md border-2 transition-colors ${
                          mFeeling === f.value
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-950/30"
                            : "border-border hover:border-muted-foreground/40"
                        }`}
                        title={f.label}
                        aria-label={f.label}
                      >
                        {f.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Notas</Label>
                  <Textarea
                    value={mNotes}
                    onChange={(e) => setMNotes(e.target.value)}
                    placeholder="Como foi a atividade?"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleManualSave}
                  disabled={savingManual}
                  className="w-full"
                >
                  {savingManual ? "Salvando..." : "Salvar atividade"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
