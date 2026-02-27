import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Pill, Info, Sparkles, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusIndicator } from "@/components/professional/StatusIndicator";
import { NewBadge } from "@/components/professional/NewBadge";
import { DiagnosisForm } from "@/components/diagnosis/DiagnosisForm";
import { TreatmentForm } from "@/components/treatment/TreatmentForm";
import { Button } from "@/components/ui/button";

interface Diagnosis {
  id: string;
  name: string;
  icd_code?: string;
  status: string;
  severity?: string;
  explanation_text?: string;
  diagnosed_date: string;
}

interface Treatment {
  id: string;
  name: string;
  dosage?: string;
  frequency?: string;
  status: string;
  explanation_text?: string;
  start_date: string;
}

interface RealClinicalSummaryProps {
  patientId: string;
  canEdit?: boolean;
}

export const RealClinicalSummary = ({ patientId, canEdit = true }: RealClinicalSummaryProps) => {
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<Diagnosis | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar diagnósticos ativos
        const { data: diagnosesData, error: diagnosesError } = await supabase
          .from("diagnoses")
          .select("*")
          .eq("patient_id", patientId)
          .eq("status", "active")
          .order("diagnosed_date", { ascending: false });

        if (diagnosesError) throw diagnosesError;
        setDiagnoses(diagnosesData || []);

        // Buscar tratamentos ativos
        const { data: treatmentsData, error: treatmentsError } = await supabase
          .from("treatments")
          .select("*")
          .eq("patient_id", patientId)
          .eq("status", "active")
          .order("start_date", { ascending: false });

        if (treatmentsError) throw treatmentsError;
        setTreatments(treatmentsData || []);
      } catch (error) {
        console.error("Erro ao buscar dados clínicos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Real-time subscription para atualizações
    const diagnosesChannel = supabase
      .channel(`diagnoses-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diagnoses',
          filter: `patient_id=eq.${patientId}`
        },
        () => fetchData()
      )
      .subscribe();

    const treatmentsChannel = supabase
      .channel(`treatments-${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'treatments',
          filter: `patient_id=eq.${patientId}`
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(diagnosesChannel);
      supabase.removeChannel(treatmentsChannel);
    };
  }, [patientId]);

  const handleEditDiagnosis = (diagnosis: Diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowDiagnosisForm(true);
  };

  const handleEditTreatment = (treatment: Treatment) => {
    setSelectedTreatment(treatment);
    setShowTreatmentForm(true);
  };

  const handleCloseDiagnosisForm = () => {
    setShowDiagnosisForm(false);
    setSelectedDiagnosis(null);
  };

  const handleCloseTreatmentForm = () => {
    setShowTreatmentForm(false);
    setSelectedTreatment(null);
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Active Diagnoses */}
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Activity className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
              </div>
              <CardTitle className="text-xl">Diagnósticos Ativos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {diagnoses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum diagnóstico ativo registrado</p>
            ) : (
              <div className="space-y-4">
                {diagnoses.map((diagnosis) => {
                const isRecent = (new Date().getTime() - new Date(diagnosis.diagnosed_date).getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 dias
                
                  return (
                    <div 
                      key={diagnosis.id}
                      className="pb-4 border-b border-border last:border-0 last:pb-0 transition-all duration-300 hover:bg-muted/30 rounded-lg p-3 -m-3 group"
                    >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">
                            {diagnosis.name}
                          </p>
                          {isRecent && <NewBadge />}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleEditDiagnosis(diagnosis)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        {diagnosis.icd_code && (
                          <p className="text-xs text-muted-foreground">
                            CID: {diagnosis.icd_code}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {diagnosis.severity && (
                          <Badge variant={
                            diagnosis.severity === "severe" ? "destructive" :
                            diagnosis.severity === "moderate" ? "default" : "secondary"
                          } className="text-xs">
                            {diagnosis.severity === "severe" ? "Grave" :
                             diagnosis.severity === "moderate" ? "Moderada" : "Leve"}
                          </Badge>
                        )}
                        <StatusIndicator 
                          status={diagnosis.status as any}
                          size="sm"
                          showLabel={false}
                          animate={diagnosis.status === "active"}
                        />
                      </div>
                    </div>
                    
                    {diagnosis.explanation_text && (
                      <Alert className="mt-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-sm text-blue-900 dark:text-blue-200">
                          {diagnosis.explanation_text}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Diagnosticado: {new Date(diagnosis.diagnosed_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Treatments */}
      <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Pill className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">Tratamentos Ativos</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {treatments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tratamento ativo registrado</p>
          ) : (
            <div className="space-y-4">
              {treatments.map((treatment) => {
                const isRecent = (new Date().getTime() - new Date(treatment.start_date).getTime()) < 7 * 24 * 60 * 60 * 1000; // 7 dias
                
                  return (
                    <div 
                      key={treatment.id}
                      className="pb-4 border-b border-border last:border-0 last:pb-0 transition-all duration-300 hover:bg-muted/30 rounded-lg p-3 -m-3 group"
                    >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">
                        {treatment.name}
                      </p>
                      {isRecent && <NewBadge />}
                      <StatusIndicator 
                        status={treatment.status as any}
                        size="sm"
                        showLabel={false}
                        animate={treatment.status === "active"}
                      />
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditTreatment(treatment)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    {(treatment.dosage || treatment.frequency) && (
                      <div className="flex gap-2 mb-2">
                        {treatment.dosage && (
                          <Badge variant="outline" className="text-xs">
                            {treatment.dosage}
                          </Badge>
                        )}
                        {treatment.frequency && (
                          <Badge variant="outline" className="text-xs">
                            {treatment.frequency}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {treatment.explanation_text && (
                      <Alert className="mt-3 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        <Sparkles className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-sm text-green-900 dark:text-green-200">
                          {treatment.explanation_text}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      Iniciado: {new Date(treatment.start_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Diagnosis Edit Form */}
    {showDiagnosisForm && (
      <DiagnosisForm
        open={showDiagnosisForm}
        onOpenChange={handleCloseDiagnosisForm}
        patientId={patientId}
        existingDiagnosis={selectedDiagnosis || undefined}
      />
    )}

    {/* Treatment Edit Form */}
    {showTreatmentForm && (
      <TreatmentForm
        open={showTreatmentForm}
        onOpenChange={handleCloseTreatmentForm}
        patientId={patientId}
        existingTreatment={selectedTreatment || undefined}
      />
    )}
  </>
  );
};