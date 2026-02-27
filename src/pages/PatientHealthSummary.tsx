import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Heart,
  Stethoscope,
  Pill,
  FlaskConical,
  FileText,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import PatientLayout from "@/components/patient/PatientLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SummaryData {
  activeDiagnoses: number;
  activeTreatments: number;
  totalDocuments: number;
  recentLabResults: { marker_name: string; value: number | null; unit: string | null; status: string | null; collection_date: string }[];
  pendingExams: number;
  lastConsultation: string | null;
  allergies: string[] | null;
  bloodType: string | null;
}

export default function PatientHealthSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const patientRes = await supabase
        .from("patients")
        .select("id, allergies, blood_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!patientRes.data) {
        setLoading(false);
        return;
      }

      const pid = patientRes.data.id;

      const [diagRes, treatRes, docRes, labRes, examRes, consultRes] = await Promise.all([
        supabase.from("diagnoses").select("id", { count: "exact", head: true }).eq("patient_id", pid).eq("status", "active"),
        supabase.from("treatments").select("id", { count: "exact", head: true }).eq("patient_id", pid).eq("status", "active"),
        supabase.from("documents").select("id", { count: "exact", head: true }).eq("patient_id", pid),
        supabase.from("lab_results").select("marker_name, value, unit, status, collection_date").eq("user_id", user.id).order("collection_date", { ascending: false }).limit(6),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("patient_id", pid).in("status", ["requested", "in_progress"]),
        supabase.from("consultations").select("consultation_date").eq("patient_id", pid).order("consultation_date", { ascending: false }).limit(1),
      ]);

      setData({
        activeDiagnoses: diagRes.count || 0,
        activeTreatments: treatRes.count || 0,
        totalDocuments: docRes.count || 0,
        recentLabResults: (labRes.data || []) as any,
        pendingExams: examRes.count || 0,
        lastConsultation: consultRes.data?.[0]?.consultation_date || null,
        allergies: patientRes.data.allergies,
        bloodType: patientRes.data.blood_type,
      });
      setLoading(false);
    };

    fetch();
  }, [user]);

  const statusIcon = (status: string | null) => {
    if (status === "high") return <TrendingUp className="h-3 w-3 text-destructive" />;
    if (status === "low") return <TrendingDown className="h-3 w-3 text-amber-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const statCards = data
    ? [
        { label: "Diagnósticos ativos", value: data.activeDiagnoses, icon: <Stethoscope className="h-5 w-5" />, color: "text-purple-600", route: "/pac/diagnosticos" },
        { label: "Tratamentos ativos", value: data.activeTreatments, icon: <Pill className="h-5 w-5" />, color: "text-green-600", route: "/pac/tratamentos" },
        { label: "Exames pendentes", value: data.pendingExams, icon: <FlaskConical className="h-5 w-5" />, color: "text-amber-600", route: "/pac/documentos" },
        { label: "Documentos", value: data.totalDocuments, icon: <FileText className="h-5 w-5" />, color: "text-blue-600", route: "/pac/documentos" },
      ]
    : [];

  return (
    <PatientLayout
      title="Resumo de Saúde"
      subtitle="Visão geral do seu estado clínico"
      showHeader={false}
      breadcrumb={
        <Button variant="ghost" size="sm" onClick={() => navigate("/pac/dashboard")} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      }
    >
      <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : !data ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum dado encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              {statCards.map((s) => (
                <Card
                  key={s.label}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(s.route)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`${s.color}`}>{s.icon}</div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Patient info */}
            {(data.bloodType || (data.allergies && data.allergies.length > 0)) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Informações Gerais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.bloodType && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tipo sanguíneo</span>
                      <Badge variant="outline">{data.bloodType}</Badge>
                    </div>
                  )}
                  {data.allergies && data.allergies.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Alergias</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.allergies.map((a, i) => (
                          <Badge key={i} variant="destructive" className="text-xs">
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.lastConsultation && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Última consulta</span>
                      <span className="text-sm font-medium">
                        {new Date(data.lastConsultation).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent lab results */}
            {data.recentLabResults.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Últimos Resultados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.recentLabResults.map((lab, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          {statusIcon(lab.status)}
                          <span className="text-sm">{lab.marker_name}</span>
                        </div>
                        <span className="text-sm font-medium">
                          {lab.value ?? "—"} {lab.unit || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => navigate("/pac/exames-lab")}
                  >
                    Ver gráficos completos
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PatientLayout>
  );
}
