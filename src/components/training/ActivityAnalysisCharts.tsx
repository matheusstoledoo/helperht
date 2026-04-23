import { useMemo, useState } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Heart, Zap, TrendingUp } from "lucide-react";

// ===== Cores por intensidade =====
export const INTENSITY_BG: Record<string, string> = {
  warmup: "#E6F1FB",
  active: "#E1F5EE",
  rest: "#F1EFE8",
  cooldown: "#EEEDFE",
};
export const INTENSITY_FG: Record<string, string> = {
  warmup: "#378ADD",
  active: "#22A06B",
  rest: "#7A7468",
  cooldown: "#7C5AE0",
};
export const INTENSITY_LABEL: Record<string, string> = {
  warmup: "Aquecimento",
  active: "Ativo",
  rest: "Descanso",
  cooldown: "Resfriamento",
};

// ===== Helpers =====
export const formatPace = (minKm: number | null | undefined): string => {
  if (!minKm || !isFinite(minKm) || minKm <= 0) return "—";
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const formatSeconds = (sec: number): string => {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const paceFromSpeed = (kmh: number | null | undefined): number | null => {
  if (!kmh || kmh <= 0) return null;
  return 60 / kmh;
};

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

interface Props {
  laps: any[];
  records: any[];
}

export default function ActivityAnalysisCharts({ laps, records }: Props) {
  const [showHr, setShowHr] = useState(true);
  const [showSpeed, setShowSpeed] = useState(true);
  const [showCadence, setShowCadence] = useState(true);

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

  const metrics = useMemo(() => {
    const activeLaps = laps.filter((l) => l.intensity === "active");

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

    const firstRecord = records[0]?.heart_rate;
    const lastRecord = records[records.length - 1]?.heart_rate;
    const cardiacDrift =
      firstRecord && lastRecord ? lastRecord - firstRecord : null;

    const cadenceVals = activeLaps
      .map((l) => l.avg_cadence)
      .filter((c) => c != null && c > 0) as number[];
    const avgCadence =
      cadenceVals.length > 0
        ? Math.round(
            cadenceVals.reduce((a, b) => a + b, 0) / cadenceVals.length
          )
        : null;

    const paces = activeLaps
      .map((l) => paceFromSpeed(Number(l.avg_speed_kmh)))
      .filter((p): p is number => p != null);
    const avgPace =
      paces.length > 0 ? paces.reduce((a, b) => a + b, 0) / paces.length : null;
    const paceDelta =
      paces.length >= 2 ? paces[paces.length - 1] - paces[0] : null;

    return { decoupling, cardiacDrift, avgCadence, avgPace, paceDelta };
  }, [laps, records]);

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
    () => linearRegression(hrPaceScatter.map((p) => ({ x: p.x, y: p.y }))),
    [hrPaceScatter]
  );

  const hasDetailedData = laps.length > 0 || records.length > 0;

  if (!hasDetailedData) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          Dados detalhados não disponíveis — esta atividade foi registrada
          manualmente ou via CSV.
        </CardContent>
      </Card>
    );
  }

  // Tooltip customizado
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

  const cadenceBadge =
    metrics.avgCadence == null
      ? null
      : metrics.avgCadence >= 170 && metrics.avgCadence <= 180
      ? { label: "Cadência ideal", className: "bg-emerald-100 text-emerald-800" }
      : { label: "Fora da faixa ideal", className: "bg-amber-100 text-amber-800" };

  const decouplingBadge =
    metrics.decoupling == null
      ? null
      : metrics.decoupling <= 5
      ? { label: "Boa resistência aeróbica", className: "bg-emerald-100 text-emerald-800" }
      : metrics.decoupling <= 10
      ? { label: "Atenção à base aeróbica", className: "bg-amber-100 text-amber-800" }
      : { label: "Fadiga significativa", className: "bg-red-100 text-red-800" };

  return (
    <Tabs defaultValue="laps" className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-auto">
        <TabsTrigger value="laps" className="text-xs sm:text-sm px-1 sm:px-3 py-1.5">
          Por trecho
        </TabsTrigger>
        <TabsTrigger value="continuous" className="text-xs sm:text-sm px-1 sm:px-3 py-1.5">
          Contínuo
        </TabsTrigger>
        <TabsTrigger value="scatter" className="text-xs sm:text-sm px-1 sm:px-3 py-1.5">
          Correlações
        </TabsTrigger>
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
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" /> FC, Pace e Cadência por trecho
                </CardTitle>
              </CardHeader>
              <CardContent className="px-1 sm:px-6 pb-3 sm:pb-6">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={lapsChartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    {lapsChartData.map((d, i) => (
                      <ReferenceArea
                        key={`area-${i}`}
                        x1={d.x - 0.5}
                        x2={d.x + 0.5}
                        fill={INTENSITY_BG[d.intensity] || INTENSITY_BG.active}
                        fillOpacity={0.6}
                      />
                    ))}
                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={[0.5, lapsChartData.length + 0.5]}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={32} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      reversed
                      tick={{ fontSize: 10 }}
                      width={36}
                      tickFormatter={(v) => formatPace(v)}
                    />
                    <Tooltip content={<LapTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="hr"
                      name="FC"
                      stroke="#E24B4A"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pace"
                      name="Pace"
                      stroke="#378ADD"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="cadence"
                      name="Cadência"
                      stroke="#D85A30"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-sm sm:text-base">Trechos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile: cards empilhados */}
                <div className="md:hidden space-y-2 px-3 pb-3">
                  {lapsChartData.map((l) => (
                    <div
                      key={l.x}
                      className="rounded-md border p-3 space-y-2"
                      style={{
                        backgroundColor:
                          l.intensity === "active"
                            ? INTENSITY_BG.active
                            : l.intensity === "rest"
                            ? INTENSITY_BG.rest
                            : INTENSITY_BG[l.intensity] || undefined,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          Trecho {l.x}
                        </span>
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            color: INTENSITY_FG[l.intensity],
                            backgroundColor: "rgba(255,255,255,0.6)",
                          }}
                        >
                          {INTENSITY_LABEL[l.intensity] || l.intensity}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                        {l.distance_km != null && (
                          <div>
                            <span className="text-muted-foreground">Distância: </span>
                            <span className="font-medium">{l.distance_km} km</span>
                          </div>
                        )}
                        {l.duration_seconds != null && (
                          <div>
                            <span className="text-muted-foreground">Duração: </span>
                            <span className="font-medium">{formatSeconds(l.duration_seconds)}</span>
                          </div>
                        )}
                        {l.pace != null && (
                          <div>
                            <span className="text-muted-foreground">Pace: </span>
                            <span className="font-medium">{l.paceLabel}</span>
                          </div>
                        )}
                        {l.hr != null && (
                          <div>
                            <span className="text-muted-foreground">FC méd.: </span>
                            <span className="font-medium">{l.hr} bpm</span>
                          </div>
                        )}
                        {l.maxHr != null && (
                          <div>
                            <span className="text-muted-foreground">FC máx.: </span>
                            <span className="font-medium">{l.maxHr} bpm</span>
                          </div>
                        )}
                        {l.cadence != null && (
                          <div>
                            <span className="text-muted-foreground">Cadência: </span>
                            <span className="font-medium">{l.cadence}</span>
                          </div>
                        )}
                        {l.elevation != null && l.elevation > 0 && (
                          <div>
                            <span className="text-muted-foreground">Elevação: </span>
                            <span className="font-medium">+{l.elevation}m</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: tabela */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trecho</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Distância</TableHead>
                        <TableHead className="text-right">Duração</TableHead>
                        <TableHead className="text-right">Pace</TableHead>
                        <TableHead className="text-right">FC méd.</TableHead>
                        <TableHead className="text-right">FC máx.</TableHead>
                        <TableHead className="text-right">Cadência</TableHead>
                        <TableHead className="text-right">Elevação</TableHead>
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
                            {l.distance_km != null ? `${l.distance_km} km` : "—"}
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
                </div>
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
              Dados contínuos disponíveis apenas para atividades importadas via
              arquivo .FIT do Garmin.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Heart className="h-4 w-4" /> Dados contínuos
              </CardTitle>
              <div className="flex flex-wrap gap-3 sm:gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={showHr} onCheckedChange={setShowHr} />
                  FC
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={showSpeed} onCheckedChange={setShowSpeed} />
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
            <CardContent className="px-1 sm:px-6 pb-3 sm:pb-6">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={recordsChartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  {recordIntensityBands.map((b, i) => (
                    <ReferenceArea
                      key={`band-${i}`}
                      x1={b.x1}
                      x2={b.x2}
                      fill={INTENSITY_BG[b.intensity] || INTENSITY_BG.active}
                      fillOpacity={0.4}
                    />
                  ))}
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={["dataMin", "dataMax"]}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => formatSeconds(v)}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={32} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    width={32}
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
                <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Heart className="h-4 w-4" /> FC × Pace
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-1 sm:px-6 pb-3 sm:pb-6">
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Pace"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v) => formatPace(v)}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="FC"
                        tick={{ fontSize: 10 }}
                        width={32}
                      />
                      <ZAxis type="number" dataKey="z" range={[40, 200]} />
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
                <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Cadência × Pace
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-1 sm:px-6 pb-3 sm:pb-6">
                  <ResponsiveContainer width="100%" height={240}>
                    <ScatterChart margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="Cadência"
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="Pace"
                        reversed
                        tick={{ fontSize: 10 }}
                        width={36}
                        tickFormatter={(v) => formatPace(v)}
                      />
                      <ZAxis type="number" dataKey="z" range={[40, 200]} />
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
                  {cadenceBadge && (
                    <div className="mt-2">
                      <Badge className={cadenceBadge.className}>
                        {cadenceBadge.label} · média {metrics.avgCadence} spm
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Métricas de eficiência */}
            <Card>
              <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Métricas de eficiência
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      Aerobic Decoupling
                    </p>
                    <p className="text-base sm:text-lg font-semibold">
                      {metrics.decoupling != null
                        ? `${metrics.decoupling}%`
                        : "—"}
                    </p>
                    {decouplingBadge && (
                      <Badge
                        className={`${decouplingBadge.className} mt-1 text-[10px]`}
                      >
                        {decouplingBadge.label}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      Cardiac Drift
                    </p>
                    <p className="text-base sm:text-lg font-semibold">
                      {metrics.cardiacDrift != null
                        ? `${metrics.cardiacDrift > 0 ? "+" : ""}${
                            metrics.cardiacDrift
                          } bpm`
                        : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Diferença início → fim
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      Cadência média (ativos)
                    </p>
                    <p className="text-base sm:text-lg font-semibold">
                      {metrics.avgCadence != null
                        ? `${metrics.avgCadence} spm`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      Pace médio (ativos)
                    </p>
                    <p className="text-base sm:text-lg font-semibold">
                      {metrics.avgPace != null
                        ? `${formatPace(metrics.avgPace)} min/km`
                        : "—"}
                    </p>
                    {metrics.paceDelta != null && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Δ {metrics.paceDelta > 0 ? "+" : ""}
                        {metrics.paceDelta.toFixed(2)} entre 1º e último
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
  );
}
