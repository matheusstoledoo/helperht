import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Heart, Droplets, Weight, Stethoscope, ChevronDown, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, isWithinInterval, getWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

// Classification helpers
const getPaBadge = (sys: number, dia: number) => {
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

const typeIcon = (type: string) => {
  if (type === "pressao") return <Heart className="h-4 w-4 text-red-500" />;
  if (type === "glicemia") return <Droplets className="h-4 w-4 text-blue-500" />;
  if (type === "peso") return <Weight className="h-4 w-4 text-amber-500" />;
  return <Stethoscope className="h-4 w-4 text-purple-500" />;
};

const typeLabel = (type: string) => {
  if (type === "pressao") return "Pressão";
  if (type === "glicemia") return "Glicemia";
  if (type === "peso") return "Peso";
  return "Sintomas";
};

const formatRecordValue = (r: any) => {
  if (r.type === "pressao") return `${r.systolic}/${r.diastolic} mmHg`;
  if (r.type === "glicemia") return `${r.glucose} mg/dL`;
  if (r.type === "peso") return `${Number(r.weight).toFixed(1)} kg`;
  if (r.type === "sintomas") return `${(r.symptoms || []).length} sintoma(s)`;
  return "";
};

export default function ProfPatientVitals() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const [isLoading, setIsLoading] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [records, setRecords] = useState<any[]>([]);
  const [monthOffset, setMonthOffset] = useState(0);

  const selectedMonth = useMemo(() => subMonths(new Date(), monthOffset), [monthOffset]);
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) navigate("/dashboard");
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (!id || !user || (!isProfessional && !isAdmin)) return;
    (async () => {
      setIsLoading(true);
      const [patientRes, vitalsRes] = await Promise.all([
        supabase.from("patients").select("users(name)").eq("id", id).maybeSingle(),
        supabase.from("vital_signs").select("*").eq("patient_id", id)
          .gte("recorded_at", monthStart.toISOString())
          .lte("recorded_at", monthEnd.toISOString())
          .order("recorded_at", { ascending: false }),
      ]);
      setPatientName((patientRes.data as any)?.users?.name || "Paciente");
      setRecords(vitalsRes.data || []);
      setIsLoading(false);
    })();
  }, [id, user, isProfessional, isAdmin, monthOffset]);

  // Summary calculations
  const paRecords = records.filter(r => r.type === "pressao" && r.systolic && r.diastolic);
  const avgSys = paRecords.length ? Math.round(paRecords.reduce((s, r) => s + r.systolic, 0) / paRecords.length) : null;
  const avgDia = paRecords.length ? Math.round(paRecords.reduce((s, r) => s + r.diastolic, 0) / paRecords.length) : null;
  const lastGlucose = records.find(r => r.type === "glicemia");
  const lastWeight = records.find(r => r.type === "peso");
  const allSymptoms = [...new Set(records.filter(r => r.type === "sintomas").flatMap(r => r.symptoms || []))];

  // Group by week (Monday start)
  const weeklyGroups = useMemo(() => {
    const groups: { start: Date; end: Date; records: any[] }[] = [];
    const seen = new Set<string>();
    records.forEach(r => {
      const d = new Date(r.recorded_at);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const we = endOfWeek(d, { weekStartsOn: 1 });
      const key = ws.toISOString();
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ start: ws, end: we, records: [] });
      }
      groups.find(g => g.start.toISOString() === key)?.records.push(r);
    });
    groups.sort((a, b) => b.start.getTime() - a.start.getTime());
    return groups;
  }, [records]);

  if (authLoading || roleLoading || isLoading) return <FullPageLoading />;

  const months = [0, 1, 2].map(i => {
    const d = subMonths(new Date(), i);
    return { offset: i, label: format(d, i === 0 ? "MMMM yyyy" : "MMM. yyyy", { locale: ptBR }) };
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/dashboard">Pacientes</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href={`/prof/paciente/${id}`}>{patientName}</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Sinais Vitais</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sinais Vitais — {patientName}</h1>
      </header>

      <main className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        {/* Month selector */}
        <div className="flex gap-2 flex-wrap">
          {months.map(m => (
            <button key={m.offset} onClick={() => setMonthOffset(m.offset)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${monthOffset === m.offset ? "text-white" : "bg-muted/60 text-foreground"}`}
              style={monthOffset === m.offset ? { backgroundColor: "#1E2D4E" } : {}}
            >{m.label}</button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pressão Média</p>
              {avgSys !== null ? (
                <>
                  <p className="text-2xl font-bold text-foreground mt-1">{avgSys}/{avgDia} <span className="text-sm font-normal text-muted-foreground">mmHg</span></p>
                  {(() => { const b = getPaBadge(avgSys!, avgDia!); return <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: b.bg, color: b.color }}>{b.label}</span>; })()}
                </>
              ) : <p className="text-sm text-muted-foreground mt-1">Sem registros</p>}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Última Glicemia</p>
              {lastGlucose ? (
                <>
                  <p className="text-2xl font-bold text-foreground mt-1">{lastGlucose.glucose} <span className="text-sm font-normal text-muted-foreground">mg/dL</span></p>
                  <p className="text-xs text-muted-foreground">{lastGlucose.glucose_moment === "jejum" ? "Jejum" : lastGlucose.glucose_moment === "pos_prandial" ? "Pós-prandial" : lastGlucose.glucose_moment === "antes_dormir" ? "Antes de dormir" : "Aleatório"}</p>
                  {(() => { const b = getGlucoseBadge(Number(lastGlucose.glucose), lastGlucose.glucose_moment || ""); return <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: b.bg, color: b.color }}>{b.label}</span>; })()}
                </>
              ) : <p className="text-sm text-muted-foreground mt-1">Sem registros</p>}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Último Peso</p>
              {lastWeight ? (
                <>
                  <p className="text-2xl font-bold text-foreground mt-1">{Number(lastWeight.weight).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">kg</span></p>
                  <p className="text-xs text-muted-foreground">{format(new Date(lastWeight.recorded_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                </>
              ) : <p className="text-sm text-muted-foreground mt-1">Sem registros</p>}
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sintomas</p>
              {allSymptoms.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {allSymptoms.slice(0, 3).map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}>{s}</span>
                  ))}
                  {allSymptoms.length > 3 && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">+{allSymptoms.length - 3}</span>}
                </div>
              ) : <p className="text-sm text-muted-foreground mt-1">Nenhum</p>}
            </CardContent>
          </Card>
        </div>

        {/* Weekly feed */}
        {weeklyGroups.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">Nenhum registro neste mês.</p>
        )}
        {weeklyGroups.map((week, idx) => {
          const weekPa = week.records.filter(r => r.type === "pressao" && r.systolic);
          const weekAvgSys = weekPa.length ? Math.round(weekPa.reduce((s, r) => s + r.systolic, 0) / weekPa.length) : null;
          const weekAvgDia = weekPa.length ? Math.round(weekPa.reduce((s, r) => s + r.diastolic, 0) / weekPa.length) : null;
          const weekBadge = weekAvgSys ? getPaBadge(weekAvgSys, weekAvgDia!) : null;
          const weekSymptoms = [...new Set(week.records.filter(r => r.type === "sintomas").flatMap(r => r.symptoms || []))];
          const wellbeings = week.records.filter(r => r.type === "sintomas" && r.wellbeing).map(r => r.wellbeing);
          const avgWellbeing = wellbeings.length ? (wellbeings.reduce((s, v) => s + v, 0) / wellbeings.length).toFixed(1) : null;

          return (
            <Collapsible key={idx} defaultOpen={idx === 0}>
              <Card className="rounded-2xl border-border overflow-hidden">
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 hover:bg-accent/5 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground text-left">
                          Semana {format(week.start, "dd/MM")} – {format(week.end, "dd/MM")}
                        </p>
                        <p className="text-xs text-muted-foreground text-left">
                          {week.records.length} registro{week.records.length !== 1 ? "s" : ""}
                          {weekAvgSys ? ` · Pressão média ${weekAvgSys}/${weekAvgDia} mmHg` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {weekBadge && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full hidden sm:inline-block" style={{ backgroundColor: weekBadge.bg, color: weekBadge.color }}>{weekBadge.label}</span>
                      )}
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t px-4 pb-4 pt-3 space-y-4">
                    {/* Week mini-summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {weekAvgSys && (
                        <div className="text-center p-2 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground">PA média</p>
                          <p className="text-sm font-bold text-foreground">{weekAvgSys}/{weekAvgDia}</p>
                        </div>
                      )}
                      {(() => { const g = week.records.find(r => r.type === "glicemia"); return g ? (
                        <div className="text-center p-2 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground">Últ. glicemia</p>
                          <p className="text-sm font-bold text-foreground">{g.glucose} mg/dL</p>
                        </div>
                      ) : null; })()}
                      {(() => { const w = week.records.find(r => r.type === "peso"); return w ? (
                        <div className="text-center p-2 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground">Últ. peso</p>
                          <p className="text-sm font-bold text-foreground">{Number(w.weight).toFixed(1)} kg</p>
                        </div>
                      ) : null; })()}
                      {avgWellbeing && (
                        <div className="text-center p-2 rounded-xl bg-muted/30">
                          <p className="text-xs text-muted-foreground">Bem-estar</p>
                          <p className="text-sm font-bold text-foreground">{avgWellbeing}/10</p>
                        </div>
                      )}
                    </div>
                    {weekSymptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {weekSymptoms.map(s => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#EDE9FE", color: "#7C3AED" }}>{s}</span>
                        ))}
                      </div>
                    )}
                    {/* Individual records */}
                    <div className="space-y-2">
                      {week.records.map(r => {
                        let badge: any = null;
                        if (r.type === "pressao" && r.systolic) badge = getPaBadge(r.systolic, r.diastolic);
                        if (r.type === "glicemia" && r.glucose) badge = getGlucoseBadge(Number(r.glucose), r.glucose_moment || "");
                        return (
                          <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                            <div className="flex items-center gap-3">
                              {typeIcon(r.type)}
                              <div>
                                <p className="text-sm font-medium text-foreground">{typeLabel(r.type)} · {formatRecordValue(r)}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(r.recorded_at), "dd/MM/yyyy · HH:mm", { locale: ptBR })}</p>
                              </div>
                            </div>
                            {badge && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: badge.bg, color: badge.color }}>{badge.label}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </main>
    </div>
  );
}
