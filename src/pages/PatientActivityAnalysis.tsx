import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceArea,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import PatientLayout from "@/components/patient/PatientLayout";
import { PatientBreadcrumb } from "@/components/patient/PatientBreadcrumb";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Heart, Zap, TrendingUp, ChevronLeft } from "lucide-react";

// ===== Cores por intensidade =====
const INTENSITY_BG: Record<string, string> = {
  warmup: "#E6F1FB",
  active: "#E1F5EE",
  rest: "#F1EFE8",
  cooldown: "#EEEDFE",
};
const INTENSITY_FG: Record<string, string> = {
  warmup: "#378ADD",
  active: "#22A06B",
  rest: "#7A7468",
  cooldown: "#7C5AE0",
};
const INTENSITY_LABEL: Record<string, string> = {
  warmup: "Aquecimento",
  active: "Ativo",
  rest: "Descanso",
  cooldown: "Resfriamento",
};

// ===== Helpers =====
const formatPace = (minKm: number | null | undefined): string => {
  if (!minKm || !isFinite(minKm) || minKm <= 0) return "—";
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatSeconds = (sec: number): string => {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const paceFromSpeed = (kmh: number | null | undefined): number | null => {
  if (!kmh || kmh <= 0) return null;
  return 60 / kmh;
};

// Regressão linear simples
const linearRegression = (points: { x: number; y: number }[]) => {
  if (points.length < 2) return null;
  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

export default function PatientActivityAnalysis() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [log, setLog] = useState<any>(null);
  const [laps, setLaps] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHr, setShowHr] = useState(true);
  const [showSpeed, setShowSpeed] = useState(true);
  const [showCadence, setShowCadence] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      const [logRes, lapsRes, recordsRes] = await Promise.all([
        supabase.from("workout_logs").select("*").eq("id", id).single(),
        (supabase.from("workout_laps" as any) as any)
          .select("*")
          .eq("workout_log_id", id)
          .order("lap_index"),
        (supabase.from("workout_records" as any) as any)
          .select("*")
          .eq("workout_log_id", id)
          .order("elapsed_seconds"),
      ]);
      if (cancelled) return;
      setLog(logRes.data);
      setLaps(lapsRes.data || []);
      setRecords(recordsRes.data || []);
      setLoading(false);
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  // Dados para o gráfico de laps
  const lapsChartData = useMemo(
    () =>
      laps.map((l, i) => {
        const pace = paceFromSpeed(Number(l.avg_speed_kmh));
        return {
          x: i + 1,
          lap_index: i,
          intensity: l.intensity || "active",
          hr: l.avg_heart_rate ?? null,
          maxHr: l.max_heart_rate ?? null,
          pace,
          paceLabel: formatPace(pace),
          cadence: l.avg_cadence ?? null,
          distance_km: l.distance_km != null ? Number(l.distance_km) : null,
          duration_seconds:
            l.duration_seconds != null ? Number(l.duration_seconds) : null,
          elevation: l.elevation_gain_m ?? null,
        };
      }),
    [laps]
  );

  // Dados para gráfico contínuo
  const recordsChartData = useMemo(
    () =>
      records.map((r) => ({
        x: r.elapsed_seconds,
        time: formatSeconds(r.elapsed_seconds),
        hr: r.heart_rate ?? null,
        speed: r.speed_kmh != null ? Number(r.speed_kmh) : null,
        cadence: r.cadence ?? null,
      })),
    [records]
  );

  // Faixas de intensidade ao longo do tempo (para aba contínuo)
  const recordIntensityBands = useMemo(() => {
    const bands: { x1: number; x2: number; intensity: string }[] = [];
    let cursor = 0;
    for (const l of laps) {
      const dur = Number(l.duration_seconds || 0);
      if (dur <= 0) continue;
      bands.push({
        x1: cursor,
        x2: cursor + dur,
        intensity: l.intensity || "active",
      });
      cursor += dur;
    }
    return bands;
  }, [laps]);

  // Métricas de eficiência
  const metrics = useMemo(() => {
    const activeLaps = laps.filter((l) => l.intensity === "active");

    // Aerobic Decoupling
    let decoupling: number | null = null;
    if (activeLaps.length >= 2) {
      const half = Math.floor(activeLaps.length / 2);
      const firstHalf = activeLaps.slice(0, half);
      const secondHalf = activeLaps.slice(half);
      const avgHrFirst =
        firstHalf.reduce((s, l) => s + (l.avg_heart_rate || 0), 0) /
        (firstHalf.length || 1);
      const avgHrSecond =
        secondHalf.reduce((s, l) => s + (l.avg_heart_rate || 0), 0) /
        (secondHalf.length || 1);
      decoupling =
        avgHrFirst > 0
          ? Math.round(((avgHrSecond - avgHrFirst) / avgHrFirst) * 100)
          : null;
    }

    // Cardiac Drift
    const firstRecord = records[0]?.heart_rate;
    const lastRecord = records[records.length - 1]?.heart_rate;
    const cardiacDrift =
      firstRecord && lastRecord ? lastRecord - firstRecord : null;

    // Cadência média (ativos)
    const cadenceVals = activeLaps
      .map((l) => l.avg_cadence)
      .filter((c) => c != null && c > 0) as number[];
    const avgCadence =
      cadenceVals.length > 0
        ? Math.round(
            cadenceVals.reduce((a, b) => a + b, 0) / cadenceVals.length
          )
        : null;

    // Pace médio dos ativos e variação
    const paces = activeLaps
      .map((l) => paceFromSpeed(Number(l.avg_speed_kmh)))
      .filter((p): p is number => p != null);
    const avgPace =
      paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : null;
    const paceDelta =
      paces.length >= 2 ? paces[paces.length - 1] - paces[0] : null;

    return { decoupling, cardiacDrift, avgCadence, avgPace, paceDelta };
  }, [laps, records]);

  // Scatter data
  const hrPaceScatter = useMemo(
    () =>
      lapsChartData
        .filter((l) => l.hr && l.pace)
        .map((l) => ({
          x: l.pace as number,
          y: l.hr as number,
          z: l.distance_km || 1,
          intensity: l.intensity,
        })),
    [lapsChartData]
  );
  const cadencePaceScatter = useMemo(
    () =>
      lapsChartData
        .filter((l) => l.cadence && l.pace)
        .map((l) => ({
          x: l.cadence as number,
          y: l.pace as number,
          z: l.distance_km || 1,
          intensity: l.intensity,
        })),
    [lapsChartData]
  );

  const hrPaceTrend = useMemo(
    () =>
      linearRegression(hrPaceScatter.map((p) => ({ x: p.x, y: p.y }))),
    [hrPaceScatter]
  );

  // === Renderização ===
  if (loading) {
    return (
      <PatientLayout>
        <div className="space-y-4 p-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </PatientLayout>
    );
  }

  if (!log) {
    return (
      <PatientLayout>
        <div className="p-6 space-y-3">
          <PatientBreadcrumb
            currentPage="Atividade não encontrada"
            intermediatePages={[{ label: "Treinos", href: "/pac/treinos" }]}
          />
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Atividade não encontrada ou você não tem acesso.
            </CardContent>
          </Card>
        </div>
      </PatientLayout>
    );
  }

  const title =
    log.activity_name || log.sport || "Atividade";
  const dateLabel = log.activity_date
    ? format(parseISO(log.activity_date), "dd 'de' MMMM 'de' yyyy", {
        locale: ptBR,
      })
    : "";

  const summary = [
    {
      label: "Distância",
      value: log.distance_km != null ? `${log.distance_km} km` : "—",
    },
    {
      label: "Duração",
      value: log.duration_minutes != null ? `${log.duration_minutes} min` : "—",
    },
    {
      label: "Pace médio",
      value: log.avg_pace_min_km
        ? `${formatPace(Number(log.avg_pace_min_km))} min/km`
        : "—",
    },
    {
      label: "FC média",
      value: log.avg_heart_rate != null ? `${log.avg_heart_rate} bpm` : "—",
    },
    {
      label: "FC máxima",
      value: log.max_heart_rate != null ? `${log.max_heart_rate} bpm` : "—",
    },
    {
      label: log.tss != null ? "TSS" : "sRPE",
      value:
        log.tss != null
          ? `${log.tss}`
          : log.srpe != null
          ? `${log.srpe}`
          : "—",
    },
  ];

  const hasDetailedData = laps.length > 0 || records.length > 0;

  // Tooltip customizado para o gráfico de laps
  const LapTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
        <p className="font-semibold">
          Trecho {d.x} —{" "}
          <span style={{ color: INTENSITY_FG[d.intensity] }}>
            {INTENSITY_LABEL[d.intensity] || d.intensity}
          </span>
        </p>
        {d.hr != null && (
          <p>
            FC média: <strong>{d.hr} bpm</strong>
            {d.maxHr != null && ` · FC máx: ${d.maxHr} bpm`}
          </p>
        )}
        {d.pace != null && (
          <p>
            Pace: <strong>{d.paceLabel} min/km</strong>
          </p>
        )}
        {d.cadence != null && (
          <p>
            Cadência: <strong>{d.cadence} spm</strong>
          </p>
        )}
        {(d.distance_km != null || d.duration_seconds != null) && (
          <p>
            {d.distance_km != null && `Distância: ${d.distance_km} km`}
            {d.distance_km != null && d.duration_seconds != null && " · "}
            {d.duration_seconds != null &&
              `Duração: ${formatSeconds(d.duration_seconds)}`}
          </p>
        )}
        {d.elevation != null && d.elevation > 0 && (
          <p>Elevação: +{d.elevation}m</p>
        )}
      </div>
    );
  };

  return (
    <PatientLayout>
      <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
        <PatientBreadcrumb
          currentPage={title}
          intermediatePages={[{ label: "Treinos", href: "/pac/treinos" }]}
        />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground capitalize">
              {dateLabel}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pac/treinos")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar para treinos
          </Button>
        </div>

        {/* Card de resumo */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {summary.map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold">{s.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {!hasDetailedData ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground text-center">
              Dados detalhados não disponíveis — esta atividade foi registrada
              manualmente ou via CSV.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="laps" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="laps">Por trecho</TabsTrigger>
              <TabsTrigger value="continuous">Contínuo</TabsTrigger>
              <TabsTrigger value="scatter">Correlações</TabsTrigger>
            </TabsList>

            {/* ===== Aba 1 — Por trecho ===== */}
            <TabsContent value="laps" className="space-y-4">
              {laps.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground text-center">
                    Nenhum trecho disponível para esta atividade.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4" /> FC, Pace e Cadência
                        por trecho
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={lapsChartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          {lapsChartData.map((d, i) => (
                            <ReferenceArea
                              key={`area-${i}`}
                              x1={d.x - 0.5}
                              x2={d.x + 0.5}
                              fill={
                                INTENSITY_BG[d.intensity] || INTENSITY_BG.active
                              }
                              fillOpacity={0.6}
                            />
                          ))}
                          <XAxis
                            dataKey="x"
                            type="number"
                            domain={[0.5, lapsChartData.length + 0.5]}
                            tick={{ fontSize: 11 }}
                            label={{
                              value: "Trecho",
                              position: "insideBottom",
                              offset: -2,
                              fontSize: 11,
                            }}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 11 }}
                            label={{
                              value: "FC (bpm) / Cadência",
                              angle: -90,
                              position: "insideLeft",
                              fontSize: 11,
                            }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            reversed
                            tick={{ fontSize: 11 }}
                            label={{
                              value: "Pace (min/km)",
                              angle: 90,
                              position: "insideRight",
                              fontSize: 11,
                            }}
                            tickFormatter={(v) => formatPace(v)}
                          />
                          <Tooltip content={<LapTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="hr"
                            name="FC média"
                            stroke="#E24B4A"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="pace"
                            name="Pace"
                            stroke="#378ADD"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="cadence"
                            name="Cadência"
                            stroke="#D85A30"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        Tabela de trechos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Trecho</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">
                              Distância
                            </TableHead>
                            <TableHead className="text-right">
                              Duração
                            </TableHead>
                            <TableHead className="text-right">Pace</TableHead>
                            <TableHead className="text-right">
                              FC méd.
                            </TableHead>
                            <TableHead className="text-right">
                              FC máx.
                            </TableHead>
                            <TableHead className="text-right">
                              Cadência
                            </TableHead>
                            <TableHead className="text-right">
                              Elevação
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lapsChartData.map((l) => (
                            <TableRow
                              key={l.x}
                              style={{
                                backgroundColor:
                                  l.intensity === "active"
                                    ? INTENSITY_BG.active
                                    : l.intensity === "rest"
                                    ? INTENSITY_BG.rest
                                    : undefined,
                              }}
                            >
                              <TableCell>{l.x}</TableCell>
                              <TableCell className="capitalize">
                                {INTENSITY_LABEL[l.intensity] || l.intensity}
                              </TableCell>
                              <TableCell className="text-right">
                                {l.distance_km != null
                                  ? `${l.distance_km} km`
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {l.duration_seconds != null
                                  ? formatSeconds(l.duration_seconds)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {l.pace ? `${l.paceLabel}` : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {l.hr != null ? `${l.hr}` : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {l.maxHr != null ? `${l.maxHr}` : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {l.cadence != null ? `${l.cadence}` : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {l.elevation != null && l.elevation > 0
                                  ? `+${l.elevation}m`
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ===== Aba 2 — Contínuo ===== */}
            <TabsContent value="continuous" className="space-y-4">
              {records.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground text-center">
                    Dados contínuos disponíveis apenas para atividades
                    importadas via arquivo .FIT do Garmin.
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Heart className="h-4 w-4" /> Dados contínuos
                    </CardTitle>
                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 text-xs">
                        <Switch checked={showHr} onCheckedChange={setShowHr} />
                        FC
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={showSpeed}
                          onCheckedChange={setShowSpeed}
                        />
                        Velocidade
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={showCadence}
                          onCheckedChange={setShowCadence}
                        />
                        Cadência
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={recordsChartData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        {recordIntensityBands.map((b, i) => (
                          <ReferenceArea
                            key={`band-${i}`}
                            x1={b.x1}
                            x2={b.x2}
                            fill={
                              INTENSITY_BG[b.intensity] || INTENSITY_BG.active
                            }
                            fillOpacity={0.4}
                          />
                        ))}
                        <XAxis
                          dataKey="x"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => formatSeconds(v)}
                        />
                        <YAxis
                          yAxisId="left"
                          tick={{ fontSize: 11 }}
                          label={{
                            value: "FC / Cadência",
                            angle: -90,
                            position: "insideLeft",
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 11 }}
                          label={{
                            value: "km/h",
                            angle: 90,
                            position: "insideRight",
                            fontSize: 11,
                          }}
                        />
                        <Tooltip
                          labelFormatter={(v) => `Tempo: ${formatSeconds(Number(v))}`}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {showHr && (
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="hr"
                            name="FC"
                            stroke="#E24B4A"
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls
                          />
                        )}
                        {showSpeed && (
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="speed"
                            name="Velocidade"
                            stroke="#378ADD"
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls
                          />
                        )}
                        {showCadence && (
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="cadence"
                            name="Cadência"
                            stroke="#D85A30"
                            strokeWidth={1.5}
                            dot={false}
                            connectNulls
                          />
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ===== Aba 3 — Correlações ===== */}
            <TabsContent value="scatter" className="space-y-4">
              {laps.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground text-center">
                    Nenhum trecho disponível para correlações.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Heart className="h-4 w-4" /> FC × Pace
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <ScatterChart>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.3}
                            />
                            <XAxis
                              type="number"
                              dataKey="x"
                              name="Pace"
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) => formatPace(v)}
                              label={{
                                value: "Pace (min/km)",
                                position: "insideBottom",
                                offset: -2,
                                fontSize: 11,
                              }}
                            />
                            <YAxis
                              type="number"
                              dataKey="y"
                              name="FC"
                              tick={{ fontSize: 11 }}
                              label={{
                                value: "FC (bpm)",
                                angle: -90,
                                position: "insideLeft",
                                fontSize: 11,
                              }}
                            />
                            <ZAxis
                              type="number"
                              dataKey="z"
                              range={[40, 200]}
                            />
                            <Tooltip
                              cursor={{ strokeDasharray: "3 3" }}
                              formatter={(value: any, name: string) => {
                                if (name === "Pace")
                                  return [formatPace(Number(value)), "Pace"];
                                return [value, name];
                              }}
                              contentStyle={{ fontSize: 12 }}
                            />
                            {(["warmup", "active", "rest", "cooldown"] as const).map(
                              (intensity) => {
                                const data = hrPaceScatter.filter(
                                  (p) => p.intensity === intensity
                                );
                                if (data.length === 0) return null;
                                return (
                                  <Scatter
                                    key={intensity}
                                    name={INTENSITY_LABEL[intensity]}
                                    data={data}
                                    fill={INTENSITY_FG[intensity]}
                                  />
                                );
                              }
                            )}
                          </ScatterChart>
                        </ResponsiveContainer>
                        {hrPaceTrend && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {Math.abs(hrPaceTrend.slope) > 8
                              ? "FC sobe muito com o pace — possível fadiga cardiovascular ou calor."
                              : "Boa eficiência aeróbica neste treino."}
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Zap className="h-4 w-4" /> Cadência × Pace
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                          <ScatterChart>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.3}
                            />
                            <XAxis
                              type="number"
                              dataKey="x"
                              name="Cadência"
                              tick={{ fontSize: 11 }}
                              label={{
                                value: "Cadência (spm)",
                                position: "insideBottom",
                                offset: -2,
                                fontSize: 11,
                              }}
                            />
                            <YAxis
                              type="number"
                              dataKey="y"
                              name="Pace"
                              reversed
                              tick={{ fontSize: 11 }}
                              tickFormatter={(v) => formatPace(v)}
                              label={{
                                value: "Pace (min/km)",
                                angle: -90,
                                position: "insideLeft",
                                fontSize: 11,
                              }}
                            />
                            <ZAxis
                              type="number"
                              dataKey="z"
                              range={[40, 200]}
                            />
                            <Tooltip
                              cursor={{ strokeDasharray: "3 3" }}
                              formatter={(value: any, name: string) => {
                                if (name === "Pace")
                                  return [formatPace(Number(value)), "Pace"];
                                return [value, name];
                              }}
                              contentStyle={{ fontSize: 12 }}
                            />
                            {(["warmup", "active", "rest", "cooldown"] as const).map(
                              (intensity) => {
                                const data = cadencePaceScatter.filter(
                                  (p) => p.intensity === intensity
                                );
                                if (data.length === 0) return null;
                                return (
                                  <Scatter
                                    key={intensity}
                                    name={INTENSITY_LABEL[intensity]}
                                    data={data}
                                    fill={INTENSITY_FG[intensity]}
                                  />
                                );
                              }
                            )}
                          </ScatterChart>
                        </ResponsiveContainer>
                        {metrics.avgCadence != null && (
                          <div className="mt-2">
                            {metrics.avgCadence >= 170 &&
                            metrics.avgCadence <= 180 ? (
                              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                Cadência ideal ({metrics.avgCadence} spm)
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                Fora da faixa ideal ({metrics.avgCadence} spm —
                                ideal 170–180)
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Métricas de eficiência */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Eficiência
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Aerobic Decoupling
                          </p>
                          <p className="text-lg font-semibold">
                            {metrics.decoupling != null
                              ? `${metrics.decoupling}%`
                              : "—"}
                          </p>
                          {metrics.decoupling != null && (
                            <Badge
                              variant="outline"
                              className={
                                metrics.decoupling <= 5
                                  ? "bg-emerald-50 text-emerald-800"
                                  : metrics.decoupling <= 10
                                  ? "bg-amber-50 text-amber-800"
                                  : "bg-red-50 text-red-800"
                              }
                            >
                              {metrics.decoupling <= 5
                                ? "Boa resistência aeróbica"
                                : metrics.decoupling <= 10
                                ? "Atenção à base aeróbica"
                                : "Fadiga significativa"}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Cardiac Drift
                          </p>
                          <p className="text-lg font-semibold">
                            {metrics.cardiacDrift != null
                              ? `${metrics.cardiacDrift > 0 ? "+" : ""}${
                                  metrics.cardiacDrift
                                } bpm`
                              : "—"}
                          </p>
                          {metrics.cardiacDrift != null && (
                            <p className="text-xs text-muted-foreground">
                              {metrics.cardiacDrift > 15
                                ? "Aumento expressivo no fim"
                                : metrics.cardiacDrift > 5
                                ? "Leve aumento"
                                : "FC estável"}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Cadência média (ativos)
                          </p>
                          <p className="text-lg font-semibold">
                            {metrics.avgCadence != null
                              ? `${metrics.avgCadence} spm`
                              : "—"}
                          </p>
                          {metrics.avgCadence != null && (
                            <Badge
                              variant="outline"
                              className={
                                metrics.avgCadence >= 170 &&
                                metrics.avgCadence <= 180
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-amber-50 text-amber-800"
                              }
                            >
                              {metrics.avgCadence >= 170 &&
                              metrics.avgCadence <= 180
                                ? "Cadência ideal"
                                : "Fora da faixa ideal"}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Eficiência de pace (ativos)
                          </p>
                          <p className="text-lg font-semibold">
                            {metrics.avgPace
                              ? `${formatPace(metrics.avgPace)} min/km`
                              : "—"}
                          </p>
                          {metrics.paceDelta != null && (
                            <p className="text-xs text-muted-foreground">
                              Variação:{" "}
                              {metrics.paceDelta > 0 ? "+" : ""}
                              {Math.round(metrics.paceDelta * 60)}s do 1º ao
                              último
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </PatientLayout>
  );
}
