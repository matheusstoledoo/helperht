import { useState, useRef } from "react";
import Papa from "papaparse";
import FitParser from "fit-file-parser";
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
  feeling_score?: number | null;
  workout_steps?: any;
  raw_data?: any;
  _fitData?: any;
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

// Garmin Connect parser
const parseGarminRow = (row: any): ParsedRow => {
  const mapSport = (type: string): string => {
    const t = (type || '').toLowerCase();
    if (t.includes('running') || t.includes('run')) return 'corrida';
    if (t.includes('cycling') || t.includes('ride') || t.includes('bike')) return 'ciclismo';
    if (t.includes('swimming') || t.includes('swim')) return 'natacao';
    if (t.includes('strength') || t.includes('gym')) return 'musculacao';
    if (t.includes('trail')) return 'corrida';
    if (t.includes('triathlon')) return 'triatlo';
    return 'outro';
  };

  const parseTime = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 60 + parts[1] + Math.round(parts[2] / 60);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  };

  const parseDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    // Garmin usa formato "YYYY-MM-DD HH:MM:SS" ou "DD/MM/YYYY"
    const clean = dateStr.split(' ')[0];
    if (clean.includes('-')) return clean.slice(0, 10);
    const parts = clean.split('/');
    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    return new Date().toISOString().split("T")[0];
  };

  const distRaw = parseFloat(row['Distance'] || row['Distância'] || '0');
  const distKm = distRaw > 1000 ? distRaw / 1000 : distRaw;

  const durationMin = parseTime(row['Time'] || row['Tempo'] || row['Duration'] || '');
  const perceived = parseInt(row['RPE'] || '') || null;

  return {
    selected: true,
    activity_name: row['Title'] || row['Título'] || row['Activity Name'] || null,
    sport: mapSport(row['Activity Type'] || row['Tipo de Atividade'] || ''),
    activity_date: parseDate(row['Date'] || row['Data'] || row['Start Time'] || ''),
    duration_minutes: durationMin,
    planned_duration_minutes: null,
    distance_km: isNaN(distKm) || distKm === 0 ? null : Math.round(distKm * 100) / 100,
    tss: parseNum(row['Training Stress Score'] || row['TSS'] || ''),
    intensity_factor: parseNum(row['Intensity Factor'] || row['IF'] || ''),
    avg_heart_rate: parseInteger(row['Avg HR'] || row['FC Média'] || row['Average HR'] || ''),
    max_heart_rate: parseInteger(row['Max HR'] || row['FC Máx'] || row['Maximum HR'] || ''),
    calories: parseInteger(row['Calories'] || row['Calorias'] || ''),
    elevation_gain_m: parseNum(row['Total Ascent'] || row['Subida Total'] || ''),
    avg_pace_min_km: null,
    notes: pick(row, ['Notes', 'Workout Description', 'Descrição']) || null,
    perceived_effort: perceived,
    compliance_pct: null,
    srpe: durationMin && perceived ? durationMin * perceived : null,
  };
};

// Training Peaks parser
const parseTrainingPeaksRow = (row: any): ParsedRow => {
  const mapSport = (type: string): string => {
    const t = (type || '').toLowerCase().trim();
    if (t === 'run') return 'corrida';
    if (t === 'ride' || t === 'cycling') return 'ciclismo';
    if (t === 'swim') return 'natacao';
    if (t === 'strength') return 'musculacao';
    if (t === 'triathlon') return 'triatlo';
    return 'outro';
  };

  const plannedHours = parseFloat(row['PlannedDuration'] || '');
  const actualHours = parseFloat(row['TimeTotalInHours'] || '');
  const plannedMin = !isNaN(plannedHours) ? Math.round(plannedHours * 60) : null;
  const actualMin = !isNaN(actualHours) && actualHours > 0 ? Math.round(actualHours * 60) : null;
  const durationMin = actualMin ?? plannedMin;

  const distMeters = parseFloat(row['DistanceInMeters'] || '');
  const distKm = !isNaN(distMeters) && distMeters > 0
    ? Math.round(distMeters) / 1000
    : null;

  const velMs = parseFloat(row['VelocityAverage'] || '');
  const paceMinKm = !isNaN(velMs) && velMs > 0
    ? Math.round((1000 / (velMs * 60)) * 100) / 100
    : null;

  const tss = parseFloat(row['TSS'] || '');
  const intensityFactor = parseFloat(row['IF'] || '');
  const hrAvg = parseInt(row['HeartRateAverage'] || '');
  const hrMax = parseInt(row['HeartRateMax'] || '');
  const rpe = parseInt(row['Rpe'] || '');
  const feeling = parseInt(row['Feeling'] || '');
  const srpe = durationMin && !isNaN(rpe) && rpe > 0 ? durationMin * rpe : null;

  const hrZones: Record<string, number> = {};
  for (let i = 1; i <= 10; i++) {
    const val = parseFloat(row[`HRZone${i}Minutes`] || '');
    if (!isNaN(val) && val > 0) hrZones[`zone_${i}_minutes`] = val;
  }

  return {
    selected: true,
    activity_name: row['Title'] || null,
    sport: mapSport(row['WorkoutType'] || ''),
    activity_date: row['WorkoutDay'] || null,
    duration_minutes: durationMin,
    planned_duration_minutes: plannedMin,
    distance_km: distKm,
    avg_pace_min_km: paceMinKm,
    avg_heart_rate: !isNaN(hrAvg) && hrAvg > 0 ? hrAvg : null,
    max_heart_rate: !isNaN(hrMax) && hrMax > 0 ? hrMax : null,
    tss: !isNaN(tss) && tss > 0 ? tss : null,
    intensity_factor: !isNaN(intensityFactor) && intensityFactor > 0 ? intensityFactor : null,
    perceived_effort: !isNaN(rpe) && rpe > 0 ? rpe : null,
    feeling_score: !isNaN(feeling) && feeling > 0 ? Math.min(5, Math.round(feeling / 2)) : null,
    srpe,
    notes: [row['AthleteComments'], row['CoachComments']]
      .filter(Boolean).join('\n\n').trim() || null,
    workout_steps: row['WorkoutDescription']
      ? { description: row['WorkoutDescription'] }
      : null,
    raw_data: Object.keys(hrZones).length > 0 ? hrZones : null,
    calories: null,
    elevation_gain_m: null,
    compliance_pct: null,
  } as ParsedRow;
};

// Garmin .FIT parser
const parseGarminFit = (file: File): Promise<ParsedRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const parser = new (FitParser as any)({
        force: true,
        speedUnit: 'km/h',
        lengthUnit: 'km',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
        mode: 'both',
      });

      parser.parse(buffer, (err: any, data: any) => {
        if (err) { reject(err); return; }

        const sessions = data.sessions || data.activity?.sessions || [];
        const rows: ParsedRow[] = sessions.map((s: any) => {
          const mapSport = (sport: string, profileName: string): string => {
            const name = (profileName || sport || '').toLowerCase();
            if (name.includes('corrid') || name.includes('run')) return 'corrida';
            if (name.includes('cicl') || name.includes('bike') || name.includes('ride')) return 'ciclismo';
            if (name.includes('swim') || name.includes('nat')) return 'natacao';
            if (name.includes('strength') || name.includes('força') || name.includes('gym')) return 'musculacao';
            if (name.includes('triathl')) return 'triatlo';
            return 'outro';
          };

          const startTime = new Date(s.start_time);
          const activityDate = !isNaN(startTime.getTime())
            ? startTime.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

          const durationMin = s.total_timer_time
            ? Math.round(s.total_timer_time / 60)
            : null;

          const distKm = s.total_distance
            ? Math.round(s.total_distance * 100) / 100
            : null;

          const paceMinKm = s.avg_speed && s.avg_speed > 0
            ? Math.round((60 / s.avg_speed) * 100) / 100
            : null;

          const rpe = s.workout_rpe && s.workout_rpe > 0 ? s.workout_rpe : null;

          const feelingRaw = s.workout_feel;
          const feelingScore = feelingRaw != null
            ? Math.max(1, Math.min(5, Math.round(feelingRaw / 20) + 1))
            : null;

          const hrZones: Record<string, number> = {};
          if (data.time_in_zone) {
            data.time_in_zone.forEach((z: any) => {
              if (z.time_in_hr_zone) {
                z.time_in_hr_zone.forEach((t: number, zi: number) => {
                  if (t > 0) hrZones[`zone_${zi + 1}_minutes`] = Math.round(t / 60);
                });
              }
            });
          }

          const lapsData = s.laps?.map((lap: any, i: number) => ({
            lap: i + 1,
            distance_km: lap.total_distance ? Math.round(lap.total_distance * 100) / 100 : null,
            duration_min: lap.total_timer_time ? Math.round(lap.total_timer_time / 60 * 10) / 10 : null,
            avg_hr: lap.avg_heart_rate || null,
            avg_speed_kmh: lap.avg_speed || null,
            intensity: lap.intensity || null,
          }));

          return {
            selected: true,
            activity_name: s.sport_profile_name || null,
            sport: mapSport(s.sport || '', s.sport_profile_name || ''),
            activity_date: activityDate,
            duration_minutes: durationMin,
            planned_duration_minutes: null,
            distance_km: distKm,
            avg_pace_min_km: paceMinKm,
            avg_heart_rate: s.avg_heart_rate || null,
            max_heart_rate: s.max_heart_rate || null,
            calories: s.total_calories || null,
            elevation_gain_m: s.total_ascent
              ? Math.round(s.total_ascent * 1000)
              : null,
            tss: null,
            intensity_factor: null,
            perceived_effort: rpe,
            feeling_score: feelingScore,
            srpe: durationMin && rpe ? durationMin * rpe : null,
            workout_steps: lapsData?.length > 0 ? { laps: lapsData } : null,
            raw_data: Object.keys(hrZones).length > 0 ? hrZones : null,
            notes: null,
            compliance_pct: null,
            _fitData: data,
          } as ParsedRow;
        });

        resolve(rows.filter((r) => r.activity_date !== null));
      });
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// Salva laps e records detalhados (somente arquivos .FIT)
const saveLapsAndRecords = async (
  workoutLogId: string,
  userId: string,
  patientId: string | null,
  fitData: any
) => {
  try {
    const session = fitData?.sessions?.[0] || fitData?.activity?.sessions?.[0];
    if (!session) return;

    // Salvar laps
    const laps = (session.laps || []).map((lap: any, i: number) => ({
      workout_log_id: workoutLogId,
      user_id: userId,
      patient_id: patientId ?? null,
      lap_index: i,
      distance_km: lap.total_distance
        ? Math.round(lap.total_distance * 100) / 100
        : null,
      duration_seconds: lap.total_timer_time
        ? Math.round(lap.total_timer_time)
        : null,
      avg_speed_kmh: lap.avg_speed || null,
      max_speed_kmh: lap.max_speed || null,
      avg_heart_rate: lap.avg_heart_rate || null,
      max_heart_rate: lap.max_heart_rate || null,
      avg_cadence: lap.avg_cadence ? lap.avg_cadence * 2 : null,
      total_calories: lap.total_calories || null,
      elevation_gain_m: lap.total_ascent
        ? Math.round(lap.total_ascent * 1000)
        : null,
      intensity: lap.intensity || null,
      lap_trigger: lap.lap_trigger || null,
    }));

    if (laps.length > 0) {
      await (supabase.from('workout_laps' as any) as any).insert(laps);
    }

    // Salvar records com downsampling a cada 10 segundos (5s quando há GPS)
    const allRecords: any[] = [];
    (session.laps || []).forEach((lap: any) => {
      (lap.records || []).forEach((r: any) => {
        allRecords.push(r);
      });
    });

    // Coordenadas FIT vêm em semicírculos — converter para graus decimais
    const semicirclesToDegrees = (val: number): number =>
      val * (180 / Math.pow(2, 31));

    // Preferir records com GPS quando disponíveis
    const hasGps = allRecords.some((r: any) => r.position_lat != null);
    const sampled = hasGps
      ? allRecords.filter(
          (r: any) =>
            r.position_lat != null &&
            r.elapsed_time !== undefined &&
            r.elapsed_time % 5 === 0
        )
      : allRecords.filter(
          (r: any) => r.elapsed_time !== undefined && r.elapsed_time % 10 === 0
        );
    const recordsToSave = sampled.length >= 10 ? sampled : allRecords;

    const records = recordsToSave.map((r: any) => ({
      workout_log_id: workoutLogId,
      user_id: userId,
      patient_id: patientId ?? null,
      elapsed_seconds: Math.round(r.elapsed_time || r.timer_time || 0),
      heart_rate: r.heart_rate || null,
      speed_kmh: r.speed || null,
      cadence: r.cadence ? r.cadence * 2 : null,
      altitude_m: r.altitude ? Math.round(r.altitude * 10) / 10 : null,
      distance_km: r.distance ? Math.round(r.distance * 1000) / 1000 : null,
      lat:
        r.position_lat != null
          ? Math.round(semicirclesToDegrees(r.position_lat) * 1000000) / 1000000
          : null,
      lng:
        r.position_long != null
          ? Math.round(semicirclesToDegrees(r.position_long) * 1000000) / 1000000
          : null,
    }));

    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      await (supabase.from('workout_records' as any) as any).insert(
        records.slice(i, i + batchSize)
      );
    }
  } catch {
    // Falha silenciosa: workout_log já está salvo
  }
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
  const [importSource, setImportSource] = useState<'trainingpeaks' | 'garmin'>('trainingpeaks');
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isFit = file.name.toLowerCase().endsWith('.fit');

    if (isFit) {
      try {
        const parsed = await parseGarminFit(file);
        setRows(parsed);
        if (parsed.length === 0) {
          toast.error("Nenhuma sessão encontrada no arquivo .FIT");
        } else {
          toast.success(`${parsed.length} atividade${parsed.length > 1 ? 's' : ''} carregada${parsed.length > 1 ? 's' : ''}`);
        }
      } catch (err) {
        toast.error("Erro ao ler arquivo .FIT. Verifique se o arquivo não está corrompido.");
      }
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const resultData = results.data as any[];
        const parsed: ParsedRow[] = resultData
          .filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined))
          .map(row => importSource === 'garmin' ? parseGarminRow(row) : parseTrainingPeaksRow(row))
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
    const source = importSource === 'garmin' ? 'garmin' : 'training_peaks';

    // Para Garmin .FIT: inserir um a um para capturar o id e salvar laps/records
    const hasFitData = selected.some((r) => r._fitData);

    let hadError = false;

    if (hasFitData) {
      for (const row of selected) {
        const { selected: _s, _fitData, ...rest } = row;
        const rowToInsert = {
          ...rest,
          user_id: userId,
          patient_id: patientId,
          source,
        };
        const { data: inserted, error } = await supabase
          .from("workout_logs")
          .insert(rowToInsert)
          .select("id")
          .single();
        if (error) {
          hadError = true;
          continue;
        }
        if (inserted?.id && _fitData) {
          await saveLapsAndRecords(inserted.id, userId, patientId, _fitData);
        }
      }
    } else {
      const payload = selected.map(({ selected: _s, _fitData, ...rest }) => ({
        ...rest,
        user_id: userId,
        patient_id: patientId,
        source,
      }));
      const { error } = await supabase.from("workout_logs").insert(payload);
      if (error) hadError = true;
    }

    setImporting(false);
    if (hadError) {
      toast.error("Erro ao importar algumas atividades");
      return;
    }
    toast.success(
      `${selected.length} atividade${selected.length > 1 ? 's' : ''} importada${selected.length > 1 ? 's' : ''} com sucesso`
    );
    setRows([]);
    onImported();
    setTimeout(() => setOpen(false), 1500);
  };

  const handleClearPreviousImports = async () => {
    const ok = window.confirm(
      "Deseja realmente excluir todas as atividades importadas anteriormente do Training Peaks? Esta ação não pode ser desfeita."
    );
    if (!ok) return;
    const { error } = await supabase
      .from("workout_logs")
      .delete()
      .eq("user_id", userId)
      .eq("source", "training_peaks");
    if (error) {
      toast.error("Erro ao limpar importações anteriores");
      return;
    }
    toast.success("Importações anteriores removidas com sucesso");
    onImported();
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
          <SheetTitle>Importar atividades</SheetTitle>
          <SheetDescription>
            Importe de Training Peaks, Garmin Connect ou adicione manualmente.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Source selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Button
              type="button"
              variant={importSource === 'trainingpeaks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setImportSource('trainingpeaks')}
            >
              Training Peaks
            </Button>
            <Button
              type="button"
              variant={importSource === 'garmin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setImportSource('garmin')}
            >
              Garmin · Coros · Polar · Suunto
            </Button>
          </div>

          {/* Upload section */}
          <div className="space-y-3">
            <Label>{importSource === 'garmin' ? 'Upload do arquivo (.FIT ou .CSV)' : 'Upload do CSV'}</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                {importSource === 'garmin'
                  ? "Aceita arquivos .FIT (Garmin, Coros, Polar, Suunto) e .CSV (Garmin Connect)"
                  : "Selecione o arquivo .csv exportado do Training Peaks"}
              </p>
              {importSource === 'garmin' && (
                <p className="text-xs text-muted-foreground mb-3">
                  Para exportar do Garmin Connect: acesse garmin.com → Atividades → selecione a atividade → Export Original. Aceita arquivos .FIT e .CSV.
                </p>
              )}
              <Input
                ref={fileRef}
                type="file"
                accept={importSource === 'garmin' ? '.csv,.fit' : '.csv'}
                onChange={handleFile}
                className="max-w-xs mx-auto"
              />
            </div>

            {importSource === 'trainingpeaks' && (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearPreviousImports}
                  className="text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/5"
                >
                  Limpar atividades importadas anteriormente
                </Button>
              </div>
            )}

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
