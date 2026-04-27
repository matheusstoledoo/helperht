import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, parseISO, subDays, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PerformanceEvolutionProps {
  userId: string;
  patientId: string | null;
}

type Period = "4s" | "3m" | "6m" | "1a";
type CompareMetric = "hr" | "pace" | "cadence";

const formatPace = (minKm: number | null | undefined): string => {
  if (minKm == null || isNaN(minKm) || minKm <= 0) return "—";
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const detectTrend = (
  values: number[],
  metric: "higher_better" | "lower_better"
): "improving" | "plateau" | "declining" | null => {
  if (values.length < 4) return null;
  const recent = values.slice(-4);
  const older = values.slice(-8, -4);
  if (older.length === 0) return null;
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  if (avgOlder === 0) return null;
  const change = ((avgRecent - avgOlder) / avgOlder) * 100;
  if (Math.abs(change) < 3) return "plateau";
  if (metric === "higher_better") return change > 0 ? "improving" : "declining";
  return change < 0 ? "improving" : "declining";
};

const TrendBadge = ({
  trend,
}: {
  trend: "improving" | "plateau" | "declining" | null;
}) => {
  if (!trend) return null;
  if (trend === "improving")
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
        <TrendingUp className="h-3 w-3 mr-1" />
        Melhora
      </Badge>
    );
  if (trend === "plateau")
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
        <Minus className="h-3 w-3 mr-1" />
        Platô
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
      <TrendingDown className="h-3 w-3 mr-1" />
      Atenção
    </Badge>
  );
};

const movingAverage = (values: (number | null)[], window: number): (number | null)[] => {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v != null);
    if (slice.length === 0) return null;
    return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 100) / 100;
  });
};

// Linear regression sobre os últimos N pontos não-nulos.
// Retorna um array do mesmo tamanho de `values`, com a reta de tendência projetada
// apenas nas posições dos N últimos pontos não-nulos (demais posições = null).
const trendLineLastN = (values: (number | null)[], n: number): (number | null)[] => {
  const result: (number | null)[] = values.map(() => null);
  const indexed = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v != null);
  if (indexed.length < 2) return result;
  const lastN = indexed.slice(-n);
  if (lastN.length < 2) return result;

  const xs = lastN.map((p) => p.i);
  const ys = lastN.map((p) => p.v);
  const count = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, idx) => s + x * ys[idx], 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const denom = count * sumXX - sumX * sumX;
  if (denom === 0) return result;
  const slope = (count * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / count;

  for (const p of lastN) {
    result[p.i] = Math.round((slope * p.i + intercept) * 100) / 100;
  }
  return result;
};

const COMPARE_COLORS = ["#378ADD", "#E24B4A", "#27500A", "#D85A30"];

export default function PerformanceEvolution({ userId, patientId }: PerformanceEvolutionProps) {
  const [period, setPeriod] = useState<Period>("3m");
  const [sport, setSport] = useState<string>("corrida");
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [comparisonLaps, setComparisonLaps] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [compareMetric, setCompareMetric] = useState<CompareMetric>("hr");

  useEffect(() => {
    if (!userId) return;
    const fetchLogs = async () => {
      setLoading(true);
      const days = { "4s": 28, "3m": 90, "6m": 180, "1a": 365 }[period];
      let query = supabase
        .from("workout_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("activity_date", subDays(new Date(), days).toISOString().split("T")[0])
        .order("activity_date", { ascending: true });

      if (sport !== "todos") {
        query = query.eq("sport", sport);
      }

      const { data } = await query;
      setLogs(data || []);
      setSelectedForComparison([]);
      setComparisonLaps({});
      setLoading(false);
    };
    fetchLogs();
  }, [userId, period, sport]);

  // Fetch laps when comparison changes
  useEffect(() => {
    if (selectedForComparison.length < 2) {
      setComparisonLaps({});
      return;
    }
    const fetchLaps = async () => {
      const { data } = await supabase
        .from("workout_laps")
        .select("*")
        .in("workout_log_id", selectedForComparison)
        .order("lap_index");
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((lap: any) => {
        if (!grouped[lap.workout_log_id]) grouped[lap.workout_log_id] = [];
        grouped[lap.workout_log_id].push(lap);
      });
      setComparisonLaps(grouped);
    };
    fetchLaps();
  }, [selectedForComparison]);

  // Group logs by week
  const weeklyData = useMemo(() => {
    if (logs.length === 0) return [];
    const groups: Record<string, any[]> = {};
    logs.forEach((l) => {
      const d = parseISO(l.activity_date);
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, weekLogs]) => {
        const tssTotal = weekLogs.reduce(
          (s, l) => s + (Number(l.tss) || Number(l.srpe) || 0),
          0
        );

        // Volume semanal — apenas atividades com distance_km > 0
        const kmTotal = weekLogs
          .filter((l) => Number(l.distance_km) > 0)
          .reduce((s, l) => s + Number(l.distance_km), 0);

        // FC média semanal — apenas esportes cardio, valida faixa fisiológica,
        // e pondera pela duração do treino quando disponível.
        const cardioSports = ["corrida", "ciclismo", "natacao", "triatlo", "outro"];
        const hrLogs = weekLogs.filter((l) => {
          const sportLower = String(l.sport || "").toLowerCase();
          if (!cardioSports.includes(sportLower)) return false;
          const hr = Number(l.avg_heart_rate);
          return hr > 0 && hr < 220;
        });
        const hrWeightSum = hrLogs.reduce((s, l) => s + (Number(l.duration_minutes) || 0), 0);
        let avgHr: number | null = null;
        if (hrLogs.length > 0) {
          if (hrWeightSum > 0) {
            avgHr =
              hrLogs.reduce(
                (s, l) => s + Number(l.avg_heart_rate) * (Number(l.duration_minutes) || 0),
                0
              ) / hrWeightSum;
          } else {
            avgHr =
              hrLogs.reduce((s, l) => s + Number(l.avg_heart_rate), 0) / hrLogs.length;
          }
        }

        // Pace médio semanal — exige distância > 0 e pace válido (< 20 min/km).
        // Nunca inclui musculação/força ou treinos sem distância.
        const paceLogs = weekLogs.filter((l) => {
          const sportLower = String(l.sport || "").toLowerCase();
          if (sportLower === "musculacao" || sportLower === "forca" || sportLower === "força") return false;
          const dist = Number(l.distance_km);
          const pace =
            Number(l.avg_pace_min_km) ||
            (Number(l.avg_speed_kmh) > 0 ? 60 / Number(l.avg_speed_kmh) : 0);
          return dist > 0 && pace > 0 && pace < 20;
        });
        const avgPace = paceLogs.length
          ? paceLogs.reduce(
              (s, l) =>
                s +
                (Number(l.avg_pace_min_km) ||
                  (Number(l.avg_speed_kmh) > 0 ? 60 / Number(l.avg_speed_kmh) : 0)),
              0
            ) / paceLogs.length
          : null;

        return {
          label: format(parseISO(key), "dd/MM"),
          tss: Math.round(tssTotal),
          km: Math.round(kmTotal * 10) / 10,
          avgPace: avgPace ? Math.round(avgPace * 100) / 100 : null,
          avgPaceLabel: avgPace ? formatPace(avgPace) : "—",
          avgHr: avgHr ? Math.round(avgHr) : null,
          count: weekLogs.length,
        };
      });
  }, [logs]);

  // Add trend lines (linear regression sobre os últimos 4 pontos).
  const weeklyDataWithTrend = useMemo(() => {
    const tssTrend = trendLineLastN(weeklyData.map((w) => w.tss), 4);
    const kmTrend = trendLineLastN(weeklyData.map((w) => w.km), 4);
    return weeklyData.map((w, i) => ({
      ...w,
      tssTrend: tssTrend[i],
      kmTrend: kmTrend[i],
    }));
  }, [weeklyData]);

  const tssTrend = useMemo(
    () => detectTrend(weeklyData.map((w) => w.tss).filter((v): v is number => v != null), "higher_better"),
    [weeklyData]
  );
  const kmTrend = useMemo(
    () => detectTrend(weeklyData.map((w) => w.km).filter((v): v is number => v != null), "higher_better"),
    [weeklyData]
  );
  const paceTrend = useMemo(
    () =>
      detectTrend(
        weeklyData.map((w) => w.avgPace).filter((v): v is number => v != null),
        "lower_better"
      ),
    [weeklyData]
  );
  const hrTrend = useMemo(
    () =>
      detectTrend(
        weeklyData.map((w) => w.avgHr).filter((v): v is number => v != null),
        "lower_better"
      ),
    [weeklyData]
  );

  // Aerobic Efficiency
  const aerobicEfficiency = useMemo(() => {
    return logs
      .filter((l) => l.avg_heart_rate && (l.avg_pace_min_km || (l.avg_speed_kmh && l.avg_speed_kmh > 0)))
      .map((l) => {
        const pace = l.avg_pace_min_km || (l.avg_speed_kmh > 0 ? 60 / l.avg_speed_kmh : 0);
        return {
          date: l.activity_date,
          efficiency: Math.round((pace / l.avg_heart_rate) * 1000) / 1000,
          label: format(parseISO(l.activity_date), "dd/MM"),
        };
      });
  }, [logs]);

  const efficiencyTrend = useMemo(
    () => detectTrend(aerobicEfficiency.map((a) => a.efficiency), "lower_better"),
    [aerobicEfficiency]
  );

  // Last 10 logs for comparison list
  const lastTenLogs = useMemo(() => {
    return [...logs]
      .sort((a, b) => b.activity_date.localeCompare(a.activity_date))
      .slice(0, 10);
  }, [logs]);

  const toggleSelection = (id: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  // Comparison chart data
  const comparisonChartData = useMemo(() => {
    if (selectedForComparison.length < 2) return [];
    const maxLaps = Math.max(
      ...selectedForComparison.map((id) => (comparisonLaps[id] || []).length),
      0
    );
    const data: any[] = [];
    for (let i = 0; i < maxLaps; i++) {
      const row: any = { lap: i + 1 };
      selectedForComparison.forEach((id) => {
        const lap = (comparisonLaps[id] || [])[i];
        if (!lap) {
          row[id] = null;
          return;
        }
        if (compareMetric === "hr") row[id] = lap.avg_heart_rate || null;
        else if (compareMetric === "pace")
          row[id] = lap.avg_speed_kmh > 0 ? Math.round((60 / lap.avg_speed_kmh) * 100) / 100 : null;
        else row[id] = lap.avg_cadence || null;
      });
      data.push(row);
    }
    return data;
  }, [selectedForComparison, comparisonLaps, compareMetric]);

  // Best values per column for comparison table
  const bestValues = useMemo(() => {
    if (selectedForComparison.length < 2) return {};
    const selectedLogs = logs.filter((l) => selectedForComparison.includes(l.id));
    const best: Record<string, string | null> = {
      distance_km: null,
      duration_seconds: null,
      pace: null,
      avg_heart_rate: null,
      max_heart_rate: null,
      tss: null,
      avg_cadence: null,
    };
    const maxBy = (key: string) => {
      const vals = selectedLogs
        .map((l) => ({ id: l.id, v: Number(l[key]) }))
        .filter((x) => !isNaN(x.v) && x.v > 0);
      if (vals.length === 0) return null;
      return vals.reduce((m, c) => (c.v > m.v ? c : m)).id;
    };
    const minBy = (key: string) => {
      const vals = selectedLogs
        .map((l) => ({ id: l.id, v: Number(l[key]) }))
        .filter((x) => !isNaN(x.v) && x.v > 0);
      if (vals.length === 0) return null;
      return vals.reduce((m, c) => (c.v < m.v ? c : m)).id;
    };
    best.distance_km = maxBy("distance_km");
    best.duration_seconds = maxBy("duration_seconds");
    // Best pace = lowest min/km (computed from avg_speed_kmh: highest speed)
    best.pace = maxBy("avg_speed_kmh");
    best.avg_heart_rate = minBy("avg_heart_rate"); // lower HR for similar effort = better
    best.max_heart_rate = minBy("max_heart_rate");
    best.tss = maxBy("tss");
    best.avg_cadence = maxBy("avg_cadence");
    return best;
  }, [selectedForComparison, logs]);

  const formatDuration = (s: number | null | undefined) => {
    if (!s) return "—";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.round(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Period buttons
  const PeriodButtons = (
    <div className="flex flex-wrap gap-1">
      {([
        { v: "4s", label: "4 sem" },
        { v: "3m", label: "3 meses" },
        { v: "6m", label: "6 meses" },
        { v: "1a", label: "1 ano" },
      ] as { v: Period; label: string }[]).map((opt) => (
        <Button
          key={opt.v}
          size="sm"
          variant={period === opt.v ? "default" : "outline"}
          onClick={() => setPeriod(opt.v)}
          className="h-8 px-2.5 text-xs"
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const enoughData = weeklyData.length >= 3;

  return (
    <div className="space-y-6">
      {/* Top controls */}
      <Card>
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Esporte:</span>
            <Select value={sport} onValueChange={setSport}>
              <SelectTrigger className="w-full sm:w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrida">Corrida</SelectItem>
                <SelectItem value="ciclismo">Ciclismo</SelectItem>
                <SelectItem value="musculacao">Musculação</SelectItem>
                <SelectItem value="natacao">Natação</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {PeriodButtons}
        </CardContent>
      </Card>

      {/* Section 1 — Weekly trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendências semanais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!enoughData ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Dados insuficientes para análise de tendências (mínimo 3 semanas com atividades).
            </p>
          ) : (
            <>
              {/* TSS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">TSS / sRPE semanal</span>
                  <TrendBadge trend={tssTrend} />
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <ComposedChart data={weeklyDataWithTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="tss"
                      stroke="#378ADD"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="TSS"
                    />
                    <Line
                      type="monotone"
                      dataKey="tssTrend"
                      stroke="#0C447C"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Tendência"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Volume */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Volume semanal (km)</span>
                  <TrendBadge trend={kmTrend} />
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <ComposedChart data={weeklyDataWithTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="km"
                      stroke="#27500A"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="km"
                    />
                    <Line
                      type="monotone"
                      dataKey="kmTrend"
                      stroke="#27500A"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Tendência"
                      strokeOpacity={0.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Pace */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Pace médio semanal (min/km)</span>
                  <TrendBadge trend={paceTrend} />
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      reversed
                      tickFormatter={(v) => formatPace(v)}
                    />
                    <Tooltip
                      formatter={(value: any) =>
                        typeof value === "number" ? formatPace(value) : value
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="avgPace"
                      stroke="#378ADD"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Pace"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* HR */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">FC média semanal (bpm)</span>
                  <TrendBadge trend={hrTrend} />
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="avgHr"
                      stroke="#E24B4A"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="FC média"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 2 — Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparativo entre atividades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastTenLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade encontrada no período.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Selecione 2 a 4 atividades para comparar trecho a trecho.
              </p>
              <div className="space-y-1.5 max-h-64 overflow-y-auto border rounded-md p-2">
                {lastTenLogs.map((log) => {
                  const isSelected = selectedForComparison.includes(log.id);
                  const disabled = !isSelected && selectedForComparison.length >= 4;
                  return (
                    <label
                      key={log.id}
                      className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer ${
                        disabled ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={disabled}
                        onCheckedChange={() => toggleSelection(log.id)}
                      />
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 text-sm">
                        <div className="min-w-0 flex flex-col">
                          <span className="font-medium truncate">
                            {log.activity_name || log.sport || "Atividade"}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {format(parseISO(log.activity_date), "dd 'de' MMM yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs sm:text-right shrink-0">
                          {log.distance_km ? `${log.distance_km} km` : ""}
                          {log.duration_seconds ? `${log.distance_km ? " · " : ""}${formatDuration(log.duration_seconds)}` : ""}
                          {log.avg_heart_rate ? ` · ${log.avg_heart_rate} bpm` : ""}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {selectedForComparison.length >= 2 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Métrica:</span>
                    <div className="flex gap-1">
                      {(
                        [
                          { v: "hr", label: "FC" },
                          { v: "pace", label: "Pace" },
                          { v: "cadence", label: "Cadência" },
                        ] as { v: CompareMetric; label: string }[]
                      ).map((opt) => (
                        <Button
                          key={opt.v}
                          size="sm"
                          variant={compareMetric === opt.v ? "default" : "outline"}
                          onClick={() => setCompareMetric(opt.v)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {comparisonChartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      As atividades selecionadas não possuem dados de trechos (laps).
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={comparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis
                          dataKey="lap"
                          tick={{ fontSize: 11 }}
                          label={{ value: "Trecho", position: "insideBottom", offset: -2, fontSize: 11 }}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          reversed={compareMetric === "pace"}
                          tickFormatter={(v) =>
                            compareMetric === "pace" ? formatPace(v) : v
                          }
                        />
                        <Tooltip
                          formatter={(value: any) =>
                            compareMetric === "pace" && typeof value === "number"
                              ? formatPace(value)
                              : value
                          }
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {selectedForComparison.map((id, i) => {
                          const log = logs.find((l) => l.id === id);
                          const label = log
                            ? format(parseISO(log.activity_date), "dd/MM", { locale: ptBR })
                            : id.slice(0, 6);
                          return (
                            <Line
                              key={id}
                              type="monotone"
                              dataKey={id}
                              stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
                              strokeWidth={2}
                              dot={{ r: 2 }}
                              name={label}
                              connectNulls
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {/* Comparison — Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Distância</TableHead>
                          <TableHead>Duração</TableHead>
                          <TableHead>Pace médio</TableHead>
                          <TableHead>FC média</TableHead>
                          <TableHead>FC máx</TableHead>
                          <TableHead>TSS</TableHead>
                          <TableHead>Cadência</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedForComparison.map((id) => {
                          const log = logs.find((l) => l.id === id);
                          if (!log) return null;
                          const cellClass = (key: string) =>
                            bestValues[key] === id ? "bg-green-50 font-semibold" : "";
                          const pace =
                            log.avg_pace_min_km ||
                            (log.avg_speed_kmh > 0 ? 60 / log.avg_speed_kmh : null);
                          return (
                            <TableRow key={id}>
                              <TableCell>
                                {format(parseISO(log.activity_date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell className={cellClass("distance_km")}>
                                {log.distance_km ? `${log.distance_km} km` : "—"}
                              </TableCell>
                              <TableCell className={cellClass("duration_seconds")}>
                                {formatDuration(log.duration_seconds)}
                              </TableCell>
                              <TableCell className={cellClass("pace")}>
                                {pace ? formatPace(pace) : "—"}
                              </TableCell>
                              <TableCell className={cellClass("avg_heart_rate")}>
                                {log.avg_heart_rate ? `${log.avg_heart_rate} bpm` : "—"}
                              </TableCell>
                              <TableCell className={cellClass("max_heart_rate")}>
                                {log.max_heart_rate ? `${log.max_heart_rate} bpm` : "—"}
                              </TableCell>
                              <TableCell className={cellClass("tss")}>
                                {log.tss ? Math.round(log.tss) : "—"}
                              </TableCell>
                              <TableCell className={cellClass("avg_cadence")}>
                                {log.avg_cadence ? `${Math.round(log.avg_cadence)} spm` : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Comparison — Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {selectedForComparison.map((id, idx) => {
                      const log = logs.find((l) => l.id === id);
                      if (!log) return null;
                      const isBest = (key: string) => bestValues[key] === id;
                      const pace =
                        log.avg_pace_min_km ||
                        (log.avg_speed_kmh > 0 ? 60 / log.avg_speed_kmh : null);
                      const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];
                      const Cell = ({ label, value, best }: { label: string; value: string; best: boolean }) => (
                        <div className={best ? "rounded px-1.5 py-1 bg-green-50" : "px-1.5 py-1"}>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                          <p className={`text-xs ${best ? "font-semibold text-green-800" : "font-medium"}`}>
                            {value}
                          </p>
                        </div>
                      );
                      return (
                        <div key={id} className="rounded-md border p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-semibold">
                              {format(parseISO(log.activity_date), "dd 'de' MMM yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <Cell
                              label="Distância"
                              value={log.distance_km ? `${log.distance_km} km` : "—"}
                              best={isBest("distance_km")}
                            />
                            <Cell
                              label="Duração"
                              value={formatDuration(log.duration_seconds)}
                              best={isBest("duration_seconds")}
                            />
                            <Cell
                              label="Pace médio"
                              value={pace ? formatPace(pace) : "—"}
                              best={isBest("pace")}
                            />
                            <Cell
                              label="FC média"
                              value={log.avg_heart_rate ? `${log.avg_heart_rate} bpm` : "—"}
                              best={isBest("avg_heart_rate")}
                            />
                            <Cell
                              label="FC máx"
                              value={log.max_heart_rate ? `${log.max_heart_rate} bpm` : "—"}
                              best={isBest("max_heart_rate")}
                            />
                            <Cell
                              label="TSS"
                              value={log.tss ? `${Math.round(log.tss)}` : "—"}
                              best={isBest("tss")}
                            />
                            <Cell
                              label="Cadência"
                              value={log.avg_cadence ? `${Math.round(log.avg_cadence)} spm` : "—"}
                              best={isBest("avg_cadence")}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Aerobic efficiency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Índice de eficiência aeróbica</span>
            <TrendBadge trend={efficiencyTrend} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aerobicEfficiency.length < 3 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Dados insuficientes — mínimo 3 atividades com FC média e pace registrados.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-3">
                Pace médio ÷ FC média. Tendência descendente indica melhora do condicionamento aeróbico
                (mesmo pace com FC menor).
              </p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={aerobicEfficiency}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.toFixed(3)}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    formatter={(value: any) =>
                      typeof value === "number" ? value.toFixed(3) : value
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#085041"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Eficiência"
                  />
                </LineChart>
              </ResponsiveContainer>
              {efficiencyTrend && (
                <p className="text-xs text-muted-foreground mt-3">
                  {efficiencyTrend === "improving" &&
                    "Tendência de melhora — você está conseguindo o mesmo pace com menor frequência cardíaca."}
                  {efficiencyTrend === "plateau" &&
                    "Eficiência estável nas últimas semanas. Considere variar estímulos para evolução."}
                  {efficiencyTrend === "declining" &&
                    "Atenção — a relação pace/FC piorou. Pode indicar fadiga acumulada ou necessidade de recuperação."}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
