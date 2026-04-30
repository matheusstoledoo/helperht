import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Trophy, Calendar } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, differenceInCalendarDays, subDays, subWeeks, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StrengthEvolutionDashboardProps {
  userId: string;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
}

interface PR {
  exercise_name: string;
  one_rep_max: number;
  weight_kg: number;
  reps: number;
  recorded_at: string;
}

interface WeekTonnage {
  weekLabel: string;
  tonnage: number;
}

export default function StrengthEvolutionDashboard({ userId }: StrengthEvolutionDashboardProps) {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [weekTonnage, setWeekTonnage] = useState<WeekTonnage[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [workoutCounts, setWorkoutCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);

      // 1. Streak
      const { data: streakData } = await supabase
        .from("training_streaks")
        .select("current_streak, longest_streak, last_workout_date")
        .eq("user_id", userId)
        .maybeSingle();
      setStreak(streakData as StreakData | null);

      // 2. Tonnage semanal — últimas 12 semanas
      const twelveWeeksAgo = format(subWeeks(new Date(), 12), "yyyy-MM-dd");
      const { data: setsData } = await supabase
        .from("workout_sets")
        .select("load_kg, reps, workout_log_id, workout_logs!inner(user_id, activity_date)")
        .eq("workout_logs.user_id", userId)
        .gte("workout_logs.activity_date", twelveWeeksAgo);

      const tonnageByWeek = new Map<string, number>();
      // inicializar 12 semanas
      for (let i = 11; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const key = format(weekStart, "yyyy-MM-dd");
        tonnageByWeek.set(key, 0);
      }
      (setsData ?? []).forEach((s: any) => {
        const date = parseISO(s.workout_logs.activity_date);
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const key = format(weekStart, "yyyy-MM-dd");
        const w = Number(s.load_kg) || 0;
        const r = Number(s.reps) || 0;
        tonnageByWeek.set(key, (tonnageByWeek.get(key) ?? 0) + w * r);
      });
      const weekArr: WeekTonnage[] = Array.from(tonnageByWeek.entries()).map(([key, tonnage]) => ({
        weekLabel: format(parseISO(key), "dd/MM"),
        tonnage: Math.round(tonnage),
      }));
      setWeekTonnage(weekArr);

      // 3. PRs
      const { data: prData } = await supabase
        .from("personal_records")
        .select("exercise_name, one_rep_max, weight_kg, reps, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(200);
      const seen = new Map<string, PR>();
      (prData ?? []).forEach((p: any) => {
        if (!seen.has(p.exercise_name)) {
          seen.set(p.exercise_name, p as PR);
        }
      });
      setPrs(Array.from(seen.values()).slice(0, 10));

      // 4. Contribution graph — últimos 84 dias
      const eightyFourAgo = format(subDays(new Date(), 84), "yyyy-MM-dd");
      const { data: logsData } = await supabase
        .from("workout_logs")
        .select("activity_date")
        .eq("user_id", userId)
        .eq("sport", "musculacao")
        .gte("activity_date", eightyFourAgo);
      const counts: Record<string, number> = {};
      const dates = new Set<string>();
      (logsData ?? []).forEach((l: any) => {
        dates.add(l.activity_date);
        counts[l.activity_date] = (counts[l.activity_date] ?? 0) + 1;
      });
      setWorkoutDates(dates);
      setWorkoutCounts(counts);

      setLoading(false);
    })();
  }, [userId]);

  // Grid de contribuição: 12 colunas × 7 linhas (seg-dom)
  const contributionGrid = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(subWeeks(today, 11), { weekStartsOn: 1 });
    const cols: { weekStart: Date; days: Date[] }[] = [];
    for (let w = 0; w < 12; w++) {
      const weekStart = addWeeks(start, w);
      const days: Date[] = [];
      for (let d = 0; d < 7; d++) {
        days.push(addDays(weekStart, d));
      }
      cols.push({ weekStart, days });
    }
    return cols;
  }, []);

  const monthLabels = useMemo(() => {
    let lastMonth = -1;
    return contributionGrid.map((col) => {
      const m = col.weekStart.getMonth();
      if (m !== lastMonth) {
        lastMonth = m;
        return format(col.weekStart, "MMM", { locale: ptBR });
      }
      return "";
    });
  }, [contributionGrid]);

  const weeksWithData = weekTonnage.filter((w) => w.tonnage > 0).length;

  return (
    <div className="space-y-4">
      {/* Seção 1: Streak */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Sequência de treinos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!streak || streak.current_streak === 0 ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-2">🔥</p>
              <p className="text-sm text-muted-foreground">Comece hoje!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-3xl font-bold">{streak.current_streak}</span>
                  <span className="text-2xl">🔥</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Sequência atual</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span className="text-3xl font-bold">{streak.longest_streak}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Recorde</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium">
                    {streak.last_workout_date
                      ? format(parseISO(streak.last_workout_date), "dd/MM", { locale: ptBR })
                      : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Último treino</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção 2: Tonnage semanal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tonelagem semanal (kg)</CardTitle>
        </CardHeader>
        <CardContent>
          {weeksWithData < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Registre mais treinos para ver sua evolução
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekTonnage} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: any) => [`${v} kg`, "Tonelagem"]}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="tonnage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Seção 3: PRs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Recordes pessoais (1RM estimado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum PR registrado ainda
            </p>
          ) : (
            <div className="space-y-2">
              {prs.map((pr) => (
                <div key={pr.exercise_name} className="flex items-center justify-between border-b last:border-b-0 pb-2 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{pr.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pr.weight_kg}kg × {pr.reps} reps · {format(parseISO(pr.recorded_at), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{Math.round(Number(pr.one_rep_max))}<span className="text-xs font-normal text-muted-foreground ml-1">kg</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção 4: Contribution graph */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Atividade dos últimos 84 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto">
              <div className="inline-block">
                {/* Month labels */}
                <div className="flex gap-1 mb-1 ml-6">
                  {monthLabels.map((label, i) => (
                    <div key={i} className="w-[14px] text-[10px] text-muted-foreground capitalize">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  {/* Day labels */}
                  <div className="flex flex-col gap-1 mr-1 text-[10px] text-muted-foreground">
                    {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
                      <div key={i} className="h-[14px] leading-[14px]">{i % 2 === 0 ? d : ""}</div>
                    ))}
                  </div>
                  {/* Grid */}
                  {contributionGrid.map((col, ci) => (
                    <div key={ci} className="flex flex-col gap-1">
                      {col.days.map((day, di) => {
                        const dateStr = format(day, "yyyy-MM-dd");
                        const has = workoutDates.has(dateStr);
                        const count = workoutCounts[dateStr] ?? 0;
                        const isFuture = day > new Date();
                        return (
                          <UITooltip key={di}>
                            <TooltipTrigger asChild>
                              <div
                                className={`h-[14px] w-[14px] rounded-sm ${
                                  isFuture ? "bg-transparent" : has ? "bg-primary" : "bg-muted"
                                }`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              {format(day, "dd/MM/yyyy")} — {count} treino{count !== 1 ? "s" : ""}
                            </TooltipContent>
                          </UITooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
}
