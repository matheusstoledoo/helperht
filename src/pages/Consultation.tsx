import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  Pill,
   Target,
  Plus,
  X,
  Save,
  Pencil,
  Trash2,
  ChevronRight,
  Loader2,
   Flag,
   Calendar as CalendarIcon,
  Route,
  Check,
} from "lucide-react";
import { CidCombobox } from "@/components/diagnosis/CidCombobox";
import { CidEntry } from "@/hooks/useCidSearch";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { usePublishedTrails, useEnrollPatient, CareTrail } from "@/hooks/useCareTrails";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Auto-resize textarea handler
const handleTextareaAutoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  const textarea = e.target;
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
};

interface PatientData {
  id: string;
  user_id: string;
  users: {
    name: string;
  } | null;
}

interface DiagnosisData {
  id: string;
  name: string;
  status: string;
  diagnosed_date: string;
  explanation_text: string | null;
  public_notes: string | null;
  private_notes: string | null;
  justification: string | null;
}

interface TreatmentData {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  description: string | null;
  status: string;
  public_notes: string | null;
  private_notes: string | null;
}


 interface GoalData {
   id: string;
   title: string;
   description: string | null;
   category: string | null;
   priority: string | null;
   status: string;
   target_date: string | null;
   progress: number | null;
   public_notes: string | null;
   private_notes: string | null;
 }

const Consultation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get("patient");
  
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();

  // Patient data
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);

  // Existing data from patient
  const [currentDiagnoses, setCurrentDiagnoses] = useState<DiagnosisData[]>([]);
  const [currentTreatments, setCurrentTreatments] = useState<TreatmentData[]>([]);

  // Private and patient notes
  const [privateNotes, setPrivateNotes] = useState("");
  const [patientNotes, setPatientNotes] = useState("");

  // Diagnosis section
  const [showNewDiagnosis, setShowNewDiagnosis] = useState(false);
  const [newDiagnosisName, setNewDiagnosisName] = useState("");
  const [newDiagnosisSearchValue, setNewDiagnosisSearchValue] = useState("");
  const [newDiagnosisIcdCode, setNewDiagnosisIcdCode] = useState("");
  const [newDiagnosisJustification, setNewDiagnosisJustification] = useState("");
  const [newDiagnosisDescription, setNewDiagnosisDescription] = useState("");
  const [newDiagnosisPublicNotes, setNewDiagnosisPublicNotes] = useState("");
  const [newDiagnosisPrivateNotes, setNewDiagnosisPrivateNotes] = useState("");

  // Editing diagnosis
  const [editingDiagnosis, setEditingDiagnosis] = useState<string | null>(null);
  const [editingDiagnosisDescription, setEditingDiagnosisDescription] = useState("");
  const [editingDiagnosisPublicNotes, setEditingDiagnosisPublicNotes] = useState("");
  const [editingDiagnosisPrivateNotes, setEditingDiagnosisPrivateNotes] = useState("");

  // Treatment section
  const [showNewTreatment, setShowNewTreatment] = useState(false);
  const [newTreatmentName, setNewTreatmentName] = useState("");
  const [newTreatmentDosage, setNewTreatmentDosage] = useState("");
  const [newTreatmentFrequency, setNewTreatmentFrequency] = useState("");
  const [newTreatmentDescription, setNewTreatmentDescription] = useState("");
  const [newTreatmentPublicNotes, setNewTreatmentPublicNotes] = useState("");
  const [newTreatmentPrivateNotes, setNewTreatmentPrivateNotes] = useState("");

  // Editing treatment
  const [editingTreatment, setEditingTreatment] = useState<string | null>(null);
  const [editingTreatmentDosage, setEditingTreatmentDosage] = useState("");
  const [editingTreatmentFrequency, setEditingTreatmentFrequency] = useState("");
  const [editingTreatmentDescription, setEditingTreatmentDescription] = useState("");
  const [editingTreatmentPublicNotes, setEditingTreatmentPublicNotes] = useState("");
  const [editingTreatmentPrivateNotes, setEditingTreatmentPrivateNotes] = useState("");

   // Goals section
   const [currentGoals, setCurrentGoals] = useState<GoalData[]>([]);
   const [showNewGoal, setShowNewGoal] = useState(false);
   const [newGoalTitle, setNewGoalTitle] = useState("");
   const [newGoalDescription, setNewGoalDescription] = useState("");
   const [newGoalCategory, setNewGoalCategory] = useState("general");
   const [newGoalPriority, setNewGoalPriority] = useState("medium");
   const [newGoalTargetDate, setNewGoalTargetDate] = useState("");
   const [newGoalPublicNotes, setNewGoalPublicNotes] = useState("");
   const [newGoalPrivateNotes, setNewGoalPrivateNotes] = useState("");

   // Editing goal
   const [editingGoal, setEditingGoal] = useState<string | null>(null);
   const [editingGoalDescription, setEditingGoalDescription] = useState("");
   const [editingGoalPriority, setEditingGoalPriority] = useState("");
   const [editingGoalTargetDate, setEditingGoalTargetDate] = useState("");
   const [editingGoalPublicNotes, setEditingGoalPublicNotes] = useState("");
   const [editingGoalPrivateNotes, setEditingGoalPrivateNotes] = useState("");
   const [editingGoalProgress, setEditingGoalProgress] = useState(0);

  // Trail selection
  const [selectedTrailId, setSelectedTrailId] = useState<string>("");
  const { data: publishedTrails = [] } = usePublishedTrails();
  const enrollPatient = useEnrollPatient();

  // Form state
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Redirect if not professional
  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  // Fetch patient data when patientId is available
  const fetchPatientData = useCallback(async () => {
    if (!patientIdFromUrl) return;

    setIsLoadingPatient(true);
    try {
      // Fetch patient info
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, user_id, users (name)")
        .eq("id", patientIdFromUrl)
        .maybeSingle();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch current diagnoses
      const { data: diagnosesData } = await supabase
        .from("diagnoses")
        .select("id, name, status, diagnosed_date, explanation_text, public_notes, private_notes, justification")
        .eq("patient_id", patientIdFromUrl)
        .eq("status", "active")
        .order("diagnosed_date", { ascending: false });

      setCurrentDiagnoses(diagnosesData || []);

      // Fetch current treatments
      const { data: treatmentsData } = await supabase
        .from("treatments")
        .select("id, name, dosage, frequency, description, status, public_notes, private_notes")
        .eq("patient_id", patientIdFromUrl)
        .eq("status", "active")
        .order("start_date", { ascending: false });

      setCurrentTreatments(treatmentsData || []);

       // Fetch current goals
       const { data: goalsData } = await supabase
         .from("goals")
         .select("id, title, description, category, priority, status, target_date, progress, public_notes, private_notes")
         .eq("patient_id", patientIdFromUrl)
         .eq("status", "active")
         .order("created_at", { ascending: false });

       setCurrentGoals(goalsData || []);

    } catch (error) {
      console.error("Error fetching patient data:", error);
      toast.error("Não foi possível carregar os dados do paciente");
    } finally {
      setIsLoadingPatient(false);
    }
  }, [patientIdFromUrl]);

  useEffect(() => {
    if (user && (isProfessional || isAdmin) && patientIdFromUrl) {
      fetchPatientData();
    }
  }, [user, isProfessional, isAdmin, patientIdFromUrl, fetchPatientData]);

  // Start editing a diagnosis
  const startEditingDiagnosis = (diagnosis: DiagnosisData) => {
    setEditingDiagnosis(diagnosis.id);
    setEditingDiagnosisDescription(diagnosis.explanation_text || "");
    setEditingDiagnosisPublicNotes(diagnosis.public_notes || "");
    setEditingDiagnosisPrivateNotes(diagnosis.private_notes || "");
  };

  // Save edited diagnosis
  const saveEditedDiagnosis = async (diagnosisId: string) => {
    try {
      await supabase
        .from("diagnoses")
        .update({
          explanation_text: editingDiagnosisDescription || null,
          public_notes: editingDiagnosisPublicNotes || null,
          private_notes: editingDiagnosisPrivateNotes || null,
        })
        .eq("id", diagnosisId);
      
      setCurrentDiagnoses(prev =>
        prev.map(d => d.id === diagnosisId ? {
          ...d,
          explanation_text: editingDiagnosisDescription || null,
          public_notes: editingDiagnosisPublicNotes || null,
          private_notes: editingDiagnosisPrivateNotes || null,
        } : d)
      );
      setEditingDiagnosis(null);
      toast.success("Diagnóstico atualizado");
    } catch (error) {
      console.error("Error updating diagnosis:", error);
      toast.error("Erro ao atualizar diagnóstico");
    }
  };

  // Delete diagnosis
  const deleteDiagnosis = async (diagnosisId: string) => {
    try {
      await supabase
        .from("diagnoses")
        .update({ status: "resolved", resolved_date: new Date().toISOString().split("T")[0] })
        .eq("id", diagnosisId);
      
      setCurrentDiagnoses(prev => prev.filter(d => d.id !== diagnosisId));
      toast.success("Diagnóstico removido");
    } catch (error) {
      console.error("Error deleting diagnosis:", error);
      toast.error("Erro ao remover diagnóstico");
    }
  };

  // Start editing a treatment
  const startEditingTreatment = (treatment: TreatmentData) => {
    setEditingTreatment(treatment.id);
    setEditingTreatmentDosage(treatment.dosage || "");
    setEditingTreatmentFrequency(treatment.frequency || "");
    setEditingTreatmentDescription(treatment.description || "");
    setEditingTreatmentPublicNotes(treatment.public_notes || "");
    setEditingTreatmentPrivateNotes(treatment.private_notes || "");
  };

  // Save edited treatment
  const saveEditedTreatment = async (treatmentId: string) => {
    try {
      await supabase
        .from("treatments")
        .update({
          dosage: editingTreatmentDosage || null,
          frequency: editingTreatmentFrequency || null,
          description: editingTreatmentDescription || null,
          public_notes: editingTreatmentPublicNotes || null,
          private_notes: editingTreatmentPrivateNotes || null,
        })
        .eq("id", treatmentId);
      
      setCurrentTreatments(prev =>
        prev.map(t => t.id === treatmentId ? {
          ...t,
          dosage: editingTreatmentDosage || null,
          frequency: editingTreatmentFrequency || null,
          description: editingTreatmentDescription || null,
          public_notes: editingTreatmentPublicNotes || null,
          private_notes: editingTreatmentPrivateNotes || null,
        } : t)
      );
      setEditingTreatment(null);
      toast.success("Tratamento atualizado");
    } catch (error) {
      console.error("Error updating treatment:", error);
      toast.error("Erro ao atualizar tratamento");
    }
  };

  // Delete treatment
  const deleteTreatment = async (treatmentId: string) => {
    try {
      await supabase
        .from("treatments")
        .update({ status: "discontinued", end_date: new Date().toISOString().split("T")[0] })
        .eq("id", treatmentId);
      
      setCurrentTreatments(prev => prev.filter(t => t.id !== treatmentId));
      toast.success("Tratamento removido");
    } catch (error) {
      console.error("Error deleting treatment:", error);
      toast.error("Erro ao remover tratamento");
    }
  };

  // Add new diagnosis locally
  const addNewDiagnosis = async () => {
    if (!newDiagnosisName.trim() || !patient || !user) return;
    
    try {
      const { data, error } = await supabase
        .from("diagnoses")
        .insert({
          patient_id: patient.id,
          name: newDiagnosisName.trim(),
          icd_code: newDiagnosisIcdCode || null,
          justification: newDiagnosisJustification || null,
          explanation_text: newDiagnosisDescription || null,
          public_notes: newDiagnosisPublicNotes || null,
          private_notes: newDiagnosisPrivateNotes || null,
          status: "active",
        })
        .select("id, name, status, diagnosed_date, explanation_text, public_notes, private_notes, justification")
        .single();

      if (error) throw error;

      setCurrentDiagnoses(prev => [data, ...prev]);
      setShowNewDiagnosis(false);
      setNewDiagnosisName("");
      setNewDiagnosisSearchValue("");
      setNewDiagnosisIcdCode("");
      setNewDiagnosisJustification("");
      setNewDiagnosisDescription("");
      setNewDiagnosisPublicNotes("");
      setNewDiagnosisPrivateNotes("");
      toast.success("Diagnóstico adicionado");
    } catch (error) {
      console.error("Error adding diagnosis:", error);
      toast.error("Erro ao adicionar diagnóstico");
    }
  };

  // Add new treatment locally
  const addNewTreatment = async () => {
    if (!newTreatmentName.trim() || !patient || !user) return;
    
    try {
      const { data, error } = await supabase
        .from("treatments")
        .insert({
          patient_id: patient.id,
          name: newTreatmentName.trim(),
          dosage: newTreatmentDosage || null,
          frequency: newTreatmentFrequency || null,
          description: newTreatmentDescription || null,
          public_notes: newTreatmentPublicNotes || null,
          private_notes: newTreatmentPrivateNotes || null,
          status: "active",
          prescribed_by: user.id,
        })
        .select("id, name, dosage, frequency, description, status, public_notes, private_notes")
        .single();

      if (error) throw error;

      setCurrentTreatments(prev => [data, ...prev]);
      setShowNewTreatment(false);
      setNewTreatmentName("");
      setNewTreatmentDosage("");
      setNewTreatmentFrequency("");
      setNewTreatmentDescription("");
      setNewTreatmentPublicNotes("");
      setNewTreatmentPrivateNotes("");
      toast.success("Tratamento adicionado");
    } catch (error) {
      console.error("Error adding treatment:", error);
      toast.error("Erro ao adicionar tratamento");
    }
  };

   // Start editing a goal
   const startEditingGoal = (goal: GoalData) => {
     setEditingGoal(goal.id);
     setEditingGoalDescription(goal.description || "");
     setEditingGoalPriority(goal.priority || "medium");
     setEditingGoalTargetDate(goal.target_date || "");
     setEditingGoalPublicNotes(goal.public_notes || "");
     setEditingGoalPrivateNotes(goal.private_notes || "");
     setEditingGoalProgress(goal.progress || 0);
   };

   // Save edited goal
   const saveEditedGoal = async (goalId: string) => {
     try {
       await supabase
         .from("goals")
         .update({
           description: editingGoalDescription || null,
           priority: editingGoalPriority || null,
           target_date: editingGoalTargetDate || null,
           public_notes: editingGoalPublicNotes || null,
           private_notes: editingGoalPrivateNotes || null,
           progress: editingGoalProgress,
         })
         .eq("id", goalId);
       
       setCurrentGoals(prev =>
         prev.map(g => g.id === goalId ? {
           ...g,
           description: editingGoalDescription || null,
           priority: editingGoalPriority || null,
           target_date: editingGoalTargetDate || null,
           public_notes: editingGoalPublicNotes || null,
           private_notes: editingGoalPrivateNotes || null,
           progress: editingGoalProgress,
         } : g)
       );
       setEditingGoal(null);
       toast.success("Meta atualizada");
     } catch (error) {
       console.error("Error updating goal:", error);
       toast.error("Erro ao atualizar meta");
     }
   };

   // Delete goal
   const deleteGoal = async (goalId: string) => {
     try {
       await supabase
         .from("goals")
         .update({ status: "cancelled" })
         .eq("id", goalId);
       
       setCurrentGoals(prev => prev.filter(g => g.id !== goalId));
       toast.success("Meta removida");
     } catch (error) {
       console.error("Error deleting goal:", error);
       toast.error("Erro ao remover meta");
     }
   };

   // Complete goal
   const completeGoal = async (goalId: string) => {
     try {
       await supabase
         .from("goals")
         .update({ 
           status: "completed", 
           completed_date: new Date().toISOString().split("T")[0],
           progress: 100
         })
         .eq("id", goalId);
       
       setCurrentGoals(prev => prev.filter(g => g.id !== goalId));
       toast.success("Meta concluída!");
     } catch (error) {
       console.error("Error completing goal:", error);
       toast.error("Erro ao concluir meta");
     }
   };

   // Add new goal
   const addNewGoal = async () => {
     if (!newGoalTitle.trim() || !patient || !user) return;
     
     try {
       const { data, error } = await supabase
         .from("goals")
         .insert({
           patient_id: patient.id,
           title: newGoalTitle.trim(),
           description: newGoalDescription || null,
           category: newGoalCategory || "general",
           priority: newGoalPriority || "medium",
           target_date: newGoalTargetDate || null,
           public_notes: newGoalPublicNotes || null,
           private_notes: newGoalPrivateNotes || null,
           status: "active",
           progress: 0,
           created_by: user.id,
         })
         .select("id, title, description, category, priority, status, target_date, progress, public_notes, private_notes")
         .single();

       if (error) throw error;

       setCurrentGoals(prev => [data, ...prev]);
       setShowNewGoal(false);
       setNewGoalTitle("");
       setNewGoalDescription("");
       setNewGoalCategory("general");
       setNewGoalPriority("medium");
       setNewGoalTargetDate("");
       setNewGoalPublicNotes("");
       setNewGoalPrivateNotes("");
       toast.success("Meta adicionada");
     } catch (error) {
       console.error("Error adding goal:", error);
       toast.error("Erro ao adicionar meta");
     }
   };

   const getPriorityLabel = (priority: string | null) => {
     switch (priority) {
       case "high": return "Alta";
       case "medium": return "Média";
       case "low": return "Baixa";
       default: return "Média";
     }
   };

  // Handle form submission
  const handleSubmit = async () => {
    if (!patient || !user) {
      toast.error("Dados do paciente não encontrados");
      return;
    }

    setIsSaving(true);
    try {
      // Create consultation record with notes
      const { error: consultationError } = await supabase
        .from("consultations")
        .insert({
          patient_id: patient.id,
          professional_id: user.id,
          notes: privateNotes || null,
          plan: patientNotes || null,
        });

      if (consultationError) throw consultationError;

      // Enroll patient in selected trail
      if (selectedTrailId) {
        await enrollPatient.mutateAsync({
          trail_id: selectedTrailId,
          patient_id: patient.id,
        });
      }

      toast.success("Consulta registrada com sucesso!");
      navigate(`/prof/paciente/${patient.id}`);
    } catch (error) {
      console.error("Error saving consultation:", error);
      toast.error("Erro ao salvar a consulta. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state
  if (authLoading || roleLoading) {
    return <FullPageLoading />;
  }

  // Show patient not found if no patient ID
  if (!patientIdFromUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Paciente não especificado</p>
          <Button onClick={() => navigate("/dashboard")}>Voltar ao painel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Breadcrumbs */}
          <Breadcrumb className="mb-2 sm:mb-3">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">
                  Início
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink href={`/prof/paciente/${patientIdFromUrl}`}>
                  Paciente
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Novo Acompanhamento</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Title */}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Novo Acompanhamento</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isLoadingPatient ? "Carregando..." : patient?.users?.name || "Paciente"}
              {" • "}
              {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Private Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anotações privadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Anotações visíveis apenas para o profissional..."
                className="min-h-[120px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Patient Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Anotações paciente</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sugestão: anote orientações, metas e planejamento para o paciente
              </p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="Anotações visíveis para o paciente (orientações, metas, planejamento)..."
                className="min-h-[120px] resize-none"
              />
            </CardContent>
          </Card>

          {/* Diagnosis Block */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                Diagnósticos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Diagnoses */}
              <div>
                <Label className="text-sm font-medium">Diagnósticos Atuais</Label>
                {currentDiagnoses.length > 0 ? (
                  <div className="mt-2 space-y-3">
                    {currentDiagnoses.map((d) => (
                      <div key={d.id} className="border border-border rounded-lg p-3">
                        {editingDiagnosis === d.id ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-sm">
                                {d.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                (nome e justificativa não editáveis)
                              </span>
                            </div>
                            <div>
                              <Label className="text-xs">Descrição:</Label>
                              <Textarea
                                value={editingDiagnosisDescription}
                                onChange={(e) => {
                                  setEditingDiagnosisDescription(e.target.value);
                                  handleTextareaAutoResize(e);
                                }}
                                placeholder="Descrição do diagnóstico..."
                                className="mt-1 min-h-[60px] resize-y overflow-hidden"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEditedDiagnosis(d.id)}>
                                <Save className="h-4 w-4 mr-1" />
                                Salvar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingDiagnosis(null)}>
                                Cancelar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="ml-auto"
                                onClick={() => {
                                  setEditingDiagnosis(null);
                                  deleteDiagnosis(d.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-sm">
                                {d.name}
                              </Badge>
                              {d.explanation_text && (
                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {d.explanation_text}
                                </span>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => startEditingDiagnosis(d)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhum diagnóstico ativo registrado para este paciente.
                  </p>
                )}
              </div>

              <Separator />

              {/* New Diagnosis */}
              {showNewDiagnosis ? (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Novo Diagnóstico</Label>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => setShowNewDiagnosis(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Diagnóstico:</Label>
                    <div className="mt-1">
                      <CidCombobox
                        value={newDiagnosisSearchValue}
                        selectedCode={newDiagnosisIcdCode}
                        onChange={setNewDiagnosisSearchValue}
                        onSelect={(entry: CidEntry) => {
                          setNewDiagnosisName(entry.description);
                          setNewDiagnosisSearchValue(entry.description);
                          setNewDiagnosisIcdCode(entry.code);
                        }}
                        placeholder="Digite o nome da doença ou código CID..."
                      />
                    </div>
                  </div>
                  <Button onClick={addNewDiagnosis} disabled={!newDiagnosisName.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar novo diagnóstico
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowNewDiagnosis(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo diagnóstico
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Treatment Block */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pill className="h-5 w-5 text-primary" />
                Tratamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Treatments */}
              <div>
                <Label className="text-sm font-medium">Tratamentos Atuais</Label>
                {currentTreatments.length > 0 ? (
                  <div className="mt-2 space-y-3">
                    {currentTreatments.map((t) => (
                      <div key={t.id} className="border border-border rounded-lg p-3">
                        {editingTreatment === t.id ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="text-sm">
                                {t.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                (nome não editável)
                              </span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <Label className="text-xs">Quantidade:</Label>
                                <Input
                                  value={editingTreatmentDosage}
                                  onChange={(e) => setEditingTreatmentDosage(e.target.value)}
                                  placeholder="Ex: 500mg"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Frequência:</Label>
                                <Input
                                  value={editingTreatmentFrequency}
                                  onChange={(e) => setEditingTreatmentFrequency(e.target.value)}
                                  placeholder="Ex: 2x ao dia"
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">Orientações:</Label>
                              <Textarea
                                value={editingTreatmentDescription}
                                onChange={(e) => {
                                  setEditingTreatmentDescription(e.target.value);
                                  handleTextareaAutoResize(e);
                                }}
                                placeholder="Orientações sobre o tratamento para o paciente..."
                                className="mt-1 min-h-[60px] resize-y overflow-hidden"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveEditedTreatment(t.id)}>
                                <Save className="h-4 w-4 mr-1" />
                                Salvar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingTreatment(null)}>
                                Cancelar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="ml-auto"
                                onClick={() => {
                                  setEditingTreatment(null);
                                  deleteTreatment(t.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-sm">
                                {t.name}
                              </Badge>
                              {t.dosage && (
                                <span className="text-xs text-muted-foreground">{t.dosage}</span>
                              )}
                              {t.frequency && (
                                <span className="text-xs text-muted-foreground">• {t.frequency}</span>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => startEditingTreatment(t)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhum tratamento ativo registrado para este paciente.
                  </p>
                )}
              </div>

              <Separator />

              {/* New Treatment */}
              {showNewTreatment ? (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Novo Tratamento</Label>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6"
                      onClick={() => setShowNewTreatment(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-xs">Medicamento/Tratamento:</Label>
                    <Input
                      value={newTreatmentName}
                      onChange={(e) => setNewTreatmentName(e.target.value)}
                      placeholder="Ex: Metformina, Fisioterapia..."
                      className="mt-1"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Quantidade:</Label>
                      <Input
                        value={newTreatmentDosage}
                        onChange={(e) => setNewTreatmentDosage(e.target.value)}
                        placeholder="Ex: 500mg"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Frequência:</Label>
                      <Input
                        value={newTreatmentFrequency}
                        onChange={(e) => setNewTreatmentFrequency(e.target.value)}
                        placeholder="Ex: 2x ao dia"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Orientações:</Label>
                    <Textarea
                      value={newTreatmentDescription}
                      onChange={(e) => {
                        setNewTreatmentDescription(e.target.value);
                        handleTextareaAutoResize(e);
                      }}
                      placeholder="Orientações sobre o tratamento para o paciente..."
                      className="mt-1 min-h-[60px] resize-y overflow-hidden"
                    />
                  </div>
                  <Button onClick={addNewTreatment} disabled={!newTreatmentName.trim()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar novo tratamento
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setShowNewTreatment(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo tratamento
                </Button>
              )}
            </CardContent>
          </Card>

           {/* Trail Selection */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2 text-lg">
                 <Route className="h-5 w-5" />
                 Trilha de Acompanhamento
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <p className="text-sm text-muted-foreground">
                 Selecione uma trilha publicada para vincular a este paciente (opcional)
               </p>
               <Select value={selectedTrailId} onValueChange={setSelectedTrailId}>
                 <SelectTrigger>
                   <SelectValue placeholder="Nenhuma trilha selecionada" />
                 </SelectTrigger>
                 <SelectContent>
                   {publishedTrails.map((trail) => (
                     <SelectItem key={trail.id} value={trail.id}>
                       <div className="flex items-center gap-2">
                         <span>{trail.name}</span>
                         {trail.specialty && (
                           <span className="text-xs text-muted-foreground">— {trail.specialty}</span>
                         )}
                       </div>
                     </SelectItem>
                   ))}
                   {publishedTrails.length === 0 && (
                     <div className="px-3 py-2 text-sm text-muted-foreground">
                       Nenhuma trilha publicada disponível
                     </div>
                   )}
                 </SelectContent>
               </Select>
               {selectedTrailId && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setSelectedTrailId("")}
                   className="text-xs text-muted-foreground"
                 >
                   <X className="h-3 w-3 mr-1" />
                   Remover seleção
                 </Button>
               )}
             </CardContent>
           </Card>

          {/* Submit Button */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/prof/paciente/${patientIdFromUrl}`)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="gap-2 w-full sm:w-auto">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Acompanhamento
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Consultation;
