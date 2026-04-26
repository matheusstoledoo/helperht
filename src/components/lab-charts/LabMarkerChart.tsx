import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ResponsiveContainer, Dot,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface LabDataPoint {
  id: string;
  collection_date: string;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  reference_min: number | null;
  reference_max: number | null;
  reference_text: string | null;
  lab_name: string | null;
  status: string | null;
  marker_category?: string | null;
}

interface LabMarkerChartProps {
  markerName: string;
  dataPoints: LabDataPoint[];
}

// Marcadores onde SUBIR é bom (verde) e DESCER é ruim (vermelho)
const HIGHER_IS_BETTER = ["hdl", "vitamina d", "hemoglobina", "hematócrito",
  "vitamina b12", "ácido fólico", "ferritina", "albumina"]

function isTrendGood(markerName: string, variation: number): boolean {
  const lower = markerName.toLowerCase()
  const higherIsBetter = HIGHER_IS_BETTER.some(m => lower.includes(m))
  return higherIsBetter ? variation > 0 : variation < 0
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const out =
    payload.reference_min != null &&
    payload.reference_max != null &&
    payload.value != null &&
    (payload.value < payload.reference_min || payload.value > payload.reference_max);
  return (
    <Dot
      cx={cx} cy={cy} r={5}
      fill={out ? "hsl(0 84% 60%)" : "hsl(177 94% 38%)"}
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null;
  const data = payload[0].payload;
  const isOut =
    data.value != null && data.reference_min != null && data.reference_max != null &&
    (data.value < data.reference_min || data.value > data.reference_max);
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-sm space-y-1">
      <p className="font-semibold text-foreground">
        {format(parseISO(data.collection_date), "dd/MM/yyyy", { locale: ptBR })}
      </p>
      <p className="text-foreground">
        <span className="font-medium">{data.value}</span>{" "}
        <span className="text-muted-foreground">{data.unit || ""}</span>
      </p>
      {data.reference_min != null && data.reference_max != null && (
        <p className="text-xs text-muted-foreground">
          Ref: {data.reference_min} – {data.reference_max} {data.unit || ""}
        </p>
      )}
      {data.lab_name && (
        <p className="text-xs text-muted-foreground">Lab: {data.lab_name}</p>
      )}
      <Badge className={`text-xs mt-1 ${
        data.reference_min == null ? "bg-muted text-muted-foreground"
        : isOut ? "bg-destructive/10 text-destructive"
        : "bg-green-500/10 text-green-700 dark:text-green-400"
      }`}>
        {data.reference_min == null ? "Sem referência" : isOut ? "Fora do intervalo" : "Normal"}
      </Badge>
    </div>
  );
};

export const LabMarkerChart = ({ markerName, dataPoints }: LabMarkerChartProps) => {
  const sortedData = useMemo(
    () => [...dataPoints]
      .filter((d) => d.value != null)
      .sort((a, b) => new Date(a.collection_date).getTime() - new Date(b.collection_date).getTime()),
    [dataPoints]
  );

  if (sortedData.length === 0) return null;

  const unit = sortedData[sortedData.length - 1]?.unit || "";

  // FIX 1: pega referência do exame mais recente que tiver referência definida
  const withRef = [...sortedData].reverse().find(
    d => d.reference_min != null && d.reference_max != null
  );
  const refMin = withRef?.reference_min ?? null;
  const refMax = withRef?.reference_max ?? null;

  const latestValue = sortedData[sortedData.length - 1]?.value;
  const previousValue = sortedData.length > 1
    ? sortedData[sortedData.length - 2]?.value : null;
  const variation =
    latestValue != null && previousValue != null && previousValue !== 0
      ? ((latestValue - previousValue) / Math.abs(previousValue)) * 100
      : null;

  const isLatestOutOfRange =
    latestValue != null && refMin != null && refMax != null &&
    (latestValue < refMin || latestValue > refMax);

  // Usar apenas valores reais dos dados para calcular o domínio
  const allValues = sortedData.map((d) => d.value!);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);

  // Só usar referências se forem valores razoáveis (não placeholders como 999999)
  const validRefMin = refMin !== null && refMin >= 0 && refMin < 100000 ? refMin : null;
  const validRefMax = refMax !== null && refMax >= 0 && refMax < 100000 ? refMax : null;

  const rangeMin = validRefMin !== null ? Math.min(dataMin, validRefMin) : dataMin;
  const rangeMax = validRefMax !== null ? Math.max(dataMax, validRefMax) : dataMax;

  const range = rangeMax - rangeMin;
  const padding = range > 0 ? range * 0.25 : rangeMax * 0.2 || 5;
  const yMin = Math.max(0, rangeMin - padding);
  const yMax = rangeMax + padding;

  return (
    <div className="helper-card p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="font-semibold text-foreground text-sm">{markerName}</h4>
          <p className="text-xs text-muted-foreground">
            {sortedData.length} resultado{sortedData.length > 1 ? "s" : ""} • Último:{" "}
            {format(parseISO(sortedData[sortedData.length - 1].collection_date), "dd/MM/yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${
            isLatestOutOfRange
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30"
          }`}>
            {latestValue} {unit}
          </Badge>

          {/* FIX 3: cor da tendência baseada no marcador, não só na direção */}
          {variation != null && (
            <Badge variant="outline" className="text-xs gap-1">
              {variation === 0 ? (
                <Minus className="w-3 h-3" />
              ) : variation > 0 ? (
                <TrendingUp className={`w-3 h-3 ${
                  isTrendGood(markerName, variation)
                    ? "text-green-600" : "text-destructive"
                }`} />
              ) : (
                <TrendingDown className={`w-3 h-3 ${
                  isTrendGood(markerName, variation)
                    ? "text-green-600" : "text-destructive"
                }`} />
              )}
              {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={sortedData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          {validRefMin !== null && validRefMax !== null && (
            <ReferenceArea
              y1={validRefMin} y2={validRefMax}
              fill="hsl(142 76% 36% / 0.08)"
              stroke="none"
            />
          )}
          <XAxis
            dataKey="collection_date"
            tickFormatter={(v) => format(parseISO(v), "dd/MM/yy")}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
            width={45}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(177 94% 38%)"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {validRefMin !== null && validRefMax !== null && (
        <p className="text-xs text-muted-foreground text-center">
          Faixa de referência: {validRefMin} – {validRefMax} {unit}
        </p>
      )}
    </div>
  );
};
