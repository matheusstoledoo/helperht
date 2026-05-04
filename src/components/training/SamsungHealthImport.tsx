import { useState } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  BlobReader,
  TextWriter,
  ZipReader,
  configure,
} from "@zip.js/zip.js";
import { supabase } from "@/integrations/supabase/client";

configure({ useWebWorkers: false });

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  patientId: string | null;
  onImported?: () => void;
}

const sportFromExerciseType = (t: any): string => {
  const n = parseInt(String(t), 10);
  switch (n) {
    case 1001:
      return "corrida";
    case 1002:
      return "caminhada";
    case 11007:
      return "ciclismo";
    case 10003:
      return "natacao";
    case 5000:
      return "musculacao";
    default:
      return "outro";
  }
};

const toDateOnly = (v: any): string | null => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const d = new Date(iso);
  if (isNaN(d.getTime())) {
    const n = Number(s);
    if (Number.isFinite(n) && n > 0) {
      return new Date(n).toISOString().slice(0, 10);
    }
    return null;
  }
  return d.toISOString().slice(0, 10);
};

const toMs = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  const n = Number(s);
  if (Number.isFinite(n) && s.match(/^\d+$/)) return n;
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d.getTime();
};

const toIso = (v: any): string | null => {
  const ms = toMs(v);
  return ms === null ? null : new Date(ms).toISOString();
};

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const toInt = (v: any): number | null => {
  const n = toNum(v);
  return n === null ? null : Math.round(n);
};

const matchesExercise = (name: string) =>
  name.includes("shealth.exercise") &&
  !name.includes("extension") &&
  !name.includes("hr_zone") &&
  !name.includes("max_heart") &&
  !name.includes("periodization") &&
  !name.includes("custom") &&
  !name.includes("live_data");

const matchesSleep = (name: string) =>
  name.includes("shealth.sleep") &&
  !name.includes("sleep_stage") &&
  !name.includes("sleep_raw") &&
  !name.includes("sleep_combined") &&
  !name.includes("sleep_coaching");

const matchesWeight = (name: string) => name.includes("health.weight");

async function parseCsvText(text: string): Promise<any[]> {
  const cleaned = text.replace(/^[^ \n]*com\.samsung[^ \n]*\n/, "");
  return new Promise((resolve, reject) => {
    Papa.parse<any>(cleaned, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => resolve(res.data || []),
      error: (err: any) => reject(err),
    });
  });
}

export default function SamsungHealthImport({
  open,
  onOpenChange,
  userId,
  patientId,
  onImported,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<string>("");
  const [running, setRunning] = useState(false);

  const reset = () => {
    setFile(null);
    setPassword("");
    setProgress(0);
    setStep("");
    setRunning(false);
  };

  const handleClose = (v: boolean) => {
    if (!v && !running) reset();
    onOpenChange(v);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione o arquivo ZIP");
      return;
    }
    if (!patientId) {
      toast.error("Paciente não identificado");
      return;
    }

    setRunning(true);
    setProgress(2);
    setStep("Abrindo arquivo...");

    try {
      const reader = new ZipReader(new BlobReader(file), {
        password: password || undefined,
      });
      const entries = await reader.getEntries();

      setProgress(10);
      setStep(`Lendo ${entries.length} arquivos...`);

      const exerciseRows: any[] = [];
      const weightRows: any[] = [];
      const sleepRows: any[] = [];

      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (e.directory) continue;
        const lname = e.filename.toLowerCase();
        if (!(lname.endsWith(".csv"))) continue;

        let target: "ex" | "wt" | "sl" | null = null;
        if (matchesExercise(lname)) target = "ex";
        else if (matchesWeight(lname)) target = "wt";
        else if (matchesSleep(lname)) target = "sl";
        if (!target) continue;

        try {
          const text = await (e as any).getData(new TextWriter(), {
            password: password || undefined,
          });
          const rows = await parseCsvText(text as string);
          if (target === "ex") exerciseRows.push(...rows);
          else if (target === "wt") weightRows.push(...rows);
          else sleepRows.push(...rows);
        } catch (err: any) {
          console.warn("[Samsung] Falha ao ler", e.filename, err?.message);
        }

        setProgress(10 + Math.round(((i + 1) / entries.length) * 40));
      }
      await reader.close();

      const sleepByDate = new Map<string, number>();
      for (const s of sleepRows) {
        const start = toMs(s.start_time ?? s["com.samsung.health.sleep.start_time"]);
        const end = toMs(s.end_time ?? s["com.samsung.health.sleep.end_time"]);
        if (start === null || end === null || end <= start) continue;
        const dateKey = new Date(start).toISOString().slice(0, 10);
        const hours = (end - start) / 3600000;
        sleepByDate.set(dateKey, (sleepByDate.get(dateKey) || 0) + hours);
      }

      setStep("Verificando duplicatas...");
      setProgress(55);

      const { data: existing } = await supabase
        .from("workout_logs")
        .select("activity_date")
        .eq("user_id", userId)
        .eq("source", "samsung_health");
      const existingDates = new Set<string>(
        (existing || []).map((r: any) => r.activity_date),
      );

      const workoutsToInsert: any[] = [];
      let skipped = 0;
      const seenInBatch = new Set<string>();

      for (const r of exerciseRows) {
        const date = toDateOnly(
          r.start_time ?? r["com.samsung.health.exercise.start_time"],
        );
        if (!date) {
          skipped++;
          continue;
        }
        if (existingDates.has(date) || seenInBatch.has(date)) {
          skipped++;
          continue;
        }
        seenInBatch.add(date);

        const activeMs = toNum(
          r.active_time ?? r["com.samsung.health.exercise.active_time"],
        );
        const distM = toNum(
          r.distance ?? r["com.samsung.health.exercise.distance"],
        );
        const exType =
          r.exercise_type ?? r["com.samsung.health.exercise.exercise_type"];

        workoutsToInsert.push({
          user_id: userId,
          patient_id: patientId,
          source: "samsung_health",
          activity_date: date,
          duration_minutes: activeMs !== null ? Math.round(activeMs / 60000) : null,
          distance_km: distM !== null ? Number((distM / 1000).toFixed(3)) : null,
          avg_heart_rate: toInt(
            r.mean_heart_rate ??
              r["com.samsung.health.exercise.mean_heart_rate"],
          ),
          max_heart_rate: toInt(
            r.max_heart_rate ?? r["com.samsung.health.exercise.max_heart_rate"],
          ),
          calories: toInt(
            r.calorie ?? r["com.samsung.health.exercise.calorie"],
          ),
          sport: sportFromExerciseType(exType),
          sleep_hours: sleepByDate.get(date)
            ? Number(sleepByDate.get(date)!.toFixed(2))
            : null,
        });
      }

      setStep(`Importando ${workoutsToInsert.length} treinos...`);
      setProgress(70);

      let inserted = 0;
      if (workoutsToInsert.length > 0) {
        const chunk = 200;
        for (let i = 0; i < workoutsToInsert.length; i += chunk) {
          const slice = workoutsToInsert.slice(i, i + chunk);
          const { error } = await supabase.from("workout_logs").insert(slice);
          if (error) {
            console.error("[Samsung] insert workouts", error);
            throw error;
          }
          inserted += slice.length;
          setProgress(70 + Math.round((i / workoutsToInsert.length) * 15));
        }
      }

      setStep("Importando registros de peso...");
      setProgress(88);

      const weightsToInsert: any[] = [];
      for (const w of weightRows) {
        const measuredAt = toIso(
          w.start_time ?? w["com.samsung.health.weight.start_time"],
        );
        const weightKg = toNum(
          w.weight ?? w["com.samsung.health.weight.weight"],
        );
        if (!measuredAt || weightKg === null) continue;
        weightsToInsert.push({
          patient_id: patientId,
          type: "peso",
          weight: weightKg,
          recorded_at: measuredAt,
        });
      }

      let weightInserted = 0;
      if (weightsToInsert.length > 0) {
        const { error } = await supabase
          .from("vital_signs")
          .insert(weightsToInsert);
        if (error) {
          console.error("[Samsung] insert weights", error);
        } else {
          weightInserted = weightsToInsert.length;
        }
      }

      setProgress(100);
      setStep("Concluído");

      toast.success(
        `${inserted} treinos importados, ${skipped} já existiam, ${weightInserted} registros de peso importados`,
      );
      onImported?.();
      setTimeout(() => {
        reset();
        onOpenChange(false);
      }, 600);
    } catch (err: any) {
      console.error("[Samsung] erro", err);
      const msg = String(err?.message || err);
      if (msg.toLowerCase().includes("password") || msg.includes("ERR_INVALID_PASSWORD")) {
        toast.error("Senha incorreta para o arquivo ZIP");
      } else {
        toast.error("Erro ao importar arquivo: " + msg);
      }
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Samsung Health</DialogTitle>
          <DialogDescription>
            Selecione o arquivo ZIP exportado pelo aplicativo Samsung Health e
            informe a senha de proteção.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="samsung-file">Arquivo ZIP</Label>
            <Input
              id="samsung-file"
              type="file"
              accept=".zip"
              disabled={running}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="samsung-password">Senha do arquivo</Label>
            <Input
              id="samsung-password"
              type="password"
              autoComplete="off"
              placeholder="Senha definida ao exportar"
              disabled={running}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {running && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">{step}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={running}
          >
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={running || !file}>
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando
              </>
            ) : (
              "Importar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
