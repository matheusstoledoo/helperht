import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Route, MessageCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const weekday = (d: string) => format(new Date(d), "EEEE", { locale: ptBR });

interface ActiveTrail {
  name: string;
  duration_days: number;
  current_day: number;
  started_at: string;
  expected_end_date: string | null;
}

interface TeamItem {
  id: string;
  tipo: "consulta" | "comentario_treino";
  created_at: string;
  texto: string;
  profissional: string | null;
  specialty: string | null;
  workout_date?: string | null;
}

const specialtyColor = (specialty: string | null): string => {
  const s = (specialty || "").toLowerCase();
  if (s.includes("médic") || s.includes("medic")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  if (s.includes("nutric")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (s.includes("educad") || s.includes("físic") || s.includes("fisic")) return "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100";
  if (s.includes("fisioter")) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  if (s.includes("psic")) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  return "bg-muted text-foreground";
};

export const PatientHomeExtras = () => {
  const { user } = useAuth();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [trail, setTrail] = useState<ActiveTrail | null>(null);
  const [items, setItems] = useState<TeamItem[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: pat } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const pid = pat?.id;
      if (!pid || cancelled) return;
      setPatientId(pid);

      // Active trail
      const { data: enrollment } = await supabase
        .from("trail_enrollments")
        .select("current_day, started_at, expected_end_date, trail_id, care_trails:trail_id(name, duration_days)")
        .eq("patient_id", pid)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (!cancelled && enrollment && (enrollment as any).care_trails) {
        const ct: any = (enrollment as any).care_trails;
        setTrail({
          name: ct.name,
          duration_days: ct.duration_days ?? 0,
          current_day: enrollment.current_day ?? 0,
          started_at: enrollment.started_at,
          expected_end_date: enrollment.expected_end_date,
        });
      }

      // Team activity (last 14 days) — consultations only (workout_log_comments table not present)
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data: consults } = await supabase
        .from("consultations")
        .select("id, created_at, patient_summary, professional_id")
        .eq("patient_id", pid)
        .eq("visible_to_patient", true)
        .not("patient_summary", "is", null)
        .gt("created_at", since)
        .order("created_at", { ascending: false })
        .limit(7);

      const list = consults || [];
      let enriched: TeamItem[] = [];
      if (list.length > 0) {
        const ids = Array.from(new Set(list.map((c: any) => c.professional_id)));
        const { data: users } = await supabase
          .from("users")
          .select("id, name, specialty")
          .in("id", ids);
        const map = new Map((users || []).map((u: any) => [u.id, u]));
        enriched = list.map((c: any) => ({
          id: c.id,
          tipo: "consulta" as const,
          created_at: c.created_at,
          texto: c.patient_summary,
          profissional: map.get(c.professional_id)?.name ?? null,
          specialty: map.get(c.professional_id)?.specialty ?? null,
        }));
      }
      if (!cancelled) setItems(enriched);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const showTrail = !!trail;
  const showItems = items.length > 0;
  if (!showTrail && !showItems) return null;

  const progress = trail && trail.duration_days > 0
    ? Math.min(100, Math.round((trail.current_day / trail.duration_days) * 100))
    : 0;

  return (
    <div className="mt-6 sm:mt-8 space-y-6">
      {showTrail && trail && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Route className="h-5 w-5" />
              Sua trilha ativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base sm:text-lg font-semibold">{trail.name}</h3>
              <span className="text-sm text-muted-foreground">
                Dia {trail.current_day} de {trail.duration_days}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs sm:text-sm text-muted-foreground">
              <span>Início: {format(new Date(trail.started_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}</span>
              {trail.expected_end_date && (
                <span>
                  Previsão de término: {format(new Date(trail.expected_end_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {showItems && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MessageCircle className="h-5 w-5" />
              O que sua equipe registrou
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((it) => (
              <div key={`${it.tipo}-${it.id}`} className="flex flex-col gap-1 border-l-2 border-primary/40 pl-3">
                <div className="flex flex-wrap items-center gap-2">
                  {it.specialty && (
                    <Badge className={specialtyColor(it.specialty)} variant="outline">
                      {it.specialty}
                    </Badge>
                  )}
                  <span className="text-sm font-medium">{it.profissional || "Profissional"}</span>
                  <span className="text-xs text-muted-foreground">
                    · há {formatDistanceToNow(new Date(it.created_at), { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{it.texto}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      it.tipo === "consulta" ? "bg-muted-foreground/50" : "bg-green-500"
                    }`}
                  />
                  <span>
                    {it.tipo === "consulta" ? "Registrado em consulta" : "Comentário no treino"}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
