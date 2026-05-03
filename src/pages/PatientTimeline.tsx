import { useState, useEffect, useCallback } from "react";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  Clock,
  FileText,
  Pill,
  TestTube,
  FolderOpen,
  Plus,
  ArrowLeft,
  Menu,
  Stethoscope,
  ClipboardList,
  Activity,
  Upload,
  ChevronDown,
  ChevronUp,
  Calendar,
  Edit,
  MessageSquarePlus,
  Trash2,
  Lock,
  FlaskConical,
  ImageIcon,
  List,
  LayoutList,
} from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type EventType =
  | "consultation"
  | "diagnosis_new"
  | "diagnosis_update"
  | "treatment_start"
  | "treatment_modify"
  | "exam_result"
  | "document_upload";

interface ConsultationDetails {
  diagnoses: Array<{ id: string; name: string; isNew: boolean; changeReason?: string | null }>;
  treatments: Array<{ id: string; name: string; dosage?: string | null; frequency?: string | null; isNew: boolean; changeReason?: string | null }>;
  exams: Array<{ id: string; name: string; examType?: string | null }>;
}

interface TimelineEvent {
  id: string;
  type: EventType;
  date: string;
  title: string;
  summary: string;
  details?: string;
  professional?: string;
  publicNotes?: string;
  privateNotes?: string[];
  sourceId?: string;
  sourceTable?: string;
  consultationDetails?: ConsultationDetails;
}

interface PatientData {
  id: string;
  users: {
    name: string;
  } | null;
}

const navItems = [
  { title: "Resumo do paciente", path: "", icon: User },
  { title: "Timeline completa", path: "/timeline", icon: Clock },
  { title: "Diagnósticos", path: "/diagnosticos", icon: FileText },
  { title: "Tratamentos", path: "/tratamentos", icon: Pill },
  { title: "Exames", path: "/exames", icon: TestTube },
  { title: "Documentos", path: "/documentos", icon: FolderOpen },
];

const eventTypeLabels: Record<EventType, string> = {
  consultation: "Nova consulta",
  diagnosis_new: "Novo diagnóstico",
  diagnosis_update: "Alteração de diagnóstico",
  treatment_start: "Início de tratamento",
  treatment_modify: "Alteração de tratamento",
  exam_result: "Resultado de exame",
  document_upload: "Documentos importantes",
};

const eventTypeColors: Record<EventType, string> = {
  consultation: "bg-accent/10 text-accent",
  diagnosis_new: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  diagnosis_update: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  treatment_start: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  treatment_modify: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
  exam_result: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  document_upload: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const getEventIcon = (type: EventType) => {
  switch (type) {
    case "consultation":
      return <Stethoscope className="w-5 h-5" />;
    case "diagnosis_new":
    case "diagnosis_update":
      return <ClipboardList className="w-5 h-5" />;
    case "treatment_start":
    case "treatment_modify":
      return <Pill className="w-5 h-5" />;
    case "exam_result":
      return <Activity className="w-5 h-5" />;
    case "document_upload":
      return <Upload className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
  }
};

const PatientTimeline = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { role, isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | "all">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");

  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"compact" | "expanded">("expanded");

  // Edit dialogs
  const [editingPublicNotes, setEditingPublicNotes] = useState<TimelineEvent | null>(null);
  const [publicNotesValue, setPublicNotesValue] = useState("");
  const [addingPrivateNote, setAddingPrivateNote] = useState<TimelineEvent | null>(null);
  const [privateNoteValue, setPrivateNoteValue] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && role !== null && !isProfessional && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  const fetchTimelineData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Fetch patient data
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, users (name)")
        .eq("id", id)
        .maybeSingle();

      setPatient(patientData);

      // Fetch all timeline data in parallel
      const [consultationsRes, diagnosesRes, treatmentsRes, examsRes, documentsRes] = await Promise.all([
        supabase.from("consultations").select("*").eq("patient_id", id).order("consultation_date", { ascending: false }),
        supabase.from("diagnoses").select("*, previous_diagnosis_id, change_reason").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("treatments").select("*, previous_treatment_id, change_reason").eq("patient_id", id).order("created_at", { ascending: false }),
        supabase.from("exams").select("*").eq("patient_id", id).order("requested_date", { ascending: false }),
        supabase.from("documents").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      ]);

      const timelineEvents: TimelineEvent[] = [];

      // Process consultations with their related data
      consultationsRes.data?.forEach((c) => {
        // Get related data for this consultation
        const relatedDiagnoses = diagnosesRes.data?.filter((d: any) => d.consultation_id === c.id) || [];
        const relatedTreatments = treatmentsRes.data?.filter((t: any) => t.consultation_id === c.id) || [];
        const relatedExams = examsRes.data?.filter((e: any) => e.consultation_id === c.id) || [];

        const consultationDetails: ConsultationDetails = {
          diagnoses: relatedDiagnoses.map((d: any) => ({
            id: d.id,
            name: d.name,
            isNew: !d.previous_diagnosis_id,
            changeReason: d.change_reason,
          })),
          treatments: relatedTreatments.map((t: any) => ({
            id: t.id,
            name: t.name,
            dosage: t.dosage,
            frequency: t.frequency,
            isNew: !t.previous_treatment_id,
            changeReason: t.change_reason,
          })),
          exams: relatedExams.map((e: any) => ({
            id: e.id,
            name: e.name,
            examType: e.exam_type,
          })),
        };

        timelineEvents.push({
          id: `consultation-${c.id}`,
          type: "consultation",
          date: c.consultation_date,
          title: c.chief_complaint || "Consulta realizada",
          summary: c.notes ? c.notes.substring(0, 150) + (c.notes.length > 150 ? "..." : "") : "Consulta registrada.",
          details: c.notes || undefined,
          publicNotes: c.plan || "",
          sourceId: c.id,
          sourceTable: "consultations",
          consultationDetails,
        });
      });

      // Process diagnoses
      diagnosesRes.data?.forEach((d) => {
        const isNew = new Date(d.created_at).getTime() === new Date(d.updated_at).getTime();
        timelineEvents.push({
          id: `diagnosis-${d.id}`,
          type: isNew ? "diagnosis_new" : "diagnosis_update",
          date: d.diagnosed_date || d.created_at,
          title: d.name,
          summary: `Status: ${d.status}${d.severity ? ` | Severidade: ${d.severity}` : ""}`,
          details: d.explanation_text || undefined,
          sourceId: d.id,
          sourceTable: "diagnoses",
        });
      });

      // Process treatments
      treatmentsRes.data?.forEach((t) => {
        const isStart = new Date(t.created_at).getTime() === new Date(t.updated_at).getTime();
        timelineEvents.push({
          id: `treatment-${t.id}`,
          type: isStart ? "treatment_start" : "treatment_modify",
          date: t.start_date || t.created_at,
          title: t.name,
          summary: `${t.dosage || ""} ${t.frequency || ""}`.trim() || "Tratamento registrado",
          details: t.description || t.explanation_text || undefined,
          sourceId: t.id,
          sourceTable: "treatments",
        });
      });

      // Process exams
      examsRes.data?.forEach((e) => {
        if (e.completed_date) {
          timelineEvents.push({
            id: `exam-${e.id}`,
            type: "exam_result",
            date: e.completed_date,
            title: e.name,
            summary: e.result || "Resultado disponível",
            details: e.interpretation || e.findings || undefined,
            sourceId: e.id,
            sourceTable: "exams",
          });
        }
      });

      // Process documents
      documentsRes.data?.forEach((doc) => {
        timelineEvents.push({
          id: `document-${doc.id}`,
          type: "document_upload",
          date: doc.created_at,
          title: doc.file_name,
          summary: doc.description || `Documento ${doc.category}`,
          sourceId: doc.id,
          sourceTable: "documents",
        });
      });

      // Sort by date descending
      timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setEvents(timelineEvents);
    } catch (error) {
      console.error("Error fetching timeline:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a timeline.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (user && (isProfessional || isAdmin)) {
      fetchTimelineData();
    }
  }, [user, isProfessional, isAdmin, fetchTimelineData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...events];

    // Filter by event type
    if (eventTypeFilter !== "all") {
      filtered = filtered.filter((e) => e.type === eventTypeFilter);
    }

    // Filter by date range
    if (dateRangeFilter !== "all") {
      const now = new Date();
      let cutoffDate: Date;

      switch (dateRangeFilter) {
        case "week":
          cutoffDate = subDays(now, 7);
          break;
        case "month":
          cutoffDate = subMonths(now, 1);
          break;
        case "quarter":
          cutoffDate = subMonths(now, 3);
          break;
        case "year":
          cutoffDate = subYears(now, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter((e) => isAfter(parseISO(e.date), cutoffDate));
    }

    setFilteredEvents(filtered);
  }, [events, eventTypeFilter, dateRangeFilter]);

  const toggleExpanded = (eventId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleEditPublicNotes = (event: TimelineEvent) => {
    setEditingPublicNotes(event);
    setPublicNotesValue(event.publicNotes || "");
  };

  const handleSavePublicNotes = async () => {
    if (!editingPublicNotes) return;

    try {
      // In a real app, this would update the database
      toast({
        title: "Sucesso",
        description: "Anotações públicas atualizadas.",
      });
      setEditingPublicNotes(null);
      setPublicNotesValue("");
      fetchTimelineData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as anotações.",
        variant: "destructive",
      });
    }
  };

  const handleAddPrivateNote = (event: TimelineEvent) => {
    setAddingPrivateNote(event);
    setPrivateNoteValue("");
  };

  const handleSavePrivateNote = async () => {
    if (!addingPrivateNote || !privateNoteValue.trim()) return;

    try {
      // In a real app, this would save to a private notes table
      toast({
        title: "Sucesso",
        description: "Nota privada adicionada.",
      });
      setAddingPrivateNote(null);
      setPrivateNoteValue("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a nota.",
        variant: "destructive",
      });
    }
  };

  const formatEventDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const currentPath = location.pathname;
  const basePath = `/prof/paciente/${id}`;

  if (authLoading || roleLoading || isLoading) {
    return <FullPageLoading />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar Navigation */}
        <Sidebar className="border-r">
          <SidebarContent className="pt-4">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const fullPath = `${basePath}${item.path}`;
                    const isActive = currentPath === fullPath || (item.path === "/timeline" && currentPath === `${basePath}/timeline`);

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={isActive ? "bg-accent text-accent-foreground" : ""}
                        >
                          <button
                            onClick={() => navigate(fullPath)}
                            className="flex items-center gap-3 w-full px-3 py-2"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {/* Nova consulta */}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => navigate(`/consultation?patient=${id}`)}
                        className="flex items-center gap-3 w-full px-3 py-2 text-primary"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Nova consulta</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Voltar */}
                  <SidebarMenuItem className="mt-4 border-t pt-4">
                    <SidebarMenuButton asChild>
                      <button
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-3 w-full px-3 py-2 text-muted-foreground"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Voltar para pacientes</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Header */}
          <header className="border-b bg-card px-6 py-4">
            <div className="flex items-center gap-4 mb-4">
              <SidebarTrigger>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Timeline Completa</h1>
                <p className="text-sm text-muted-foreground">
                  {patient?.users?.name || "Paciente"}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Select value={eventTypeFilter} onValueChange={(v) => setEventTypeFilter(v as EventType | "all")}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Eventos</SelectItem>
                  <SelectItem value="consultation">Nova consulta</SelectItem>
                  <SelectItem value="diagnosis_new">Novo diagnóstico</SelectItem>
                  <SelectItem value="diagnosis_update">Alteração de diagnóstico</SelectItem>
                  <SelectItem value="treatment_start">Início de tratamento</SelectItem>
                  <SelectItem value="treatment_modify">Alteração de tratamento</SelectItem>
                  <SelectItem value="exam_result">Resultado de exame</SelectItem>
                  <SelectItem value="document_upload">Documentos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o Período</SelectItem>
                  <SelectItem value="week">Últimos 7 Dias</SelectItem>
                  <SelectItem value="month">Últimos 30 Dias</SelectItem>
                  <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
                  <SelectItem value="year">Último Ano</SelectItem>
                </SelectContent>
              </Select>

              {/* View mode toggle */}
              <div className="flex items-center gap-1 border rounded-md p-0.5 ml-auto">
                <Button
                  variant={viewMode === "compact" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("compact")}
                  className="h-8 px-2"
                  title="Modo compacto"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "expanded" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("expanded")}
                  className="h-8 px-2"
                  title="Modo expandido"
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Timeline Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-3xl mx-auto">
              {filteredEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhum evento encontrado.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                  {/* Timeline events */}
                  <div className={`${viewMode === "compact" ? "space-y-2" : "space-y-6"} pl-6`}>
                    {filteredEvents.map((event, index) => {
                      const isExpanded = expandedCards.has(event.id);

                      if (viewMode === "compact") {
                        return (
                          <div
                            key={event.id}
                            className="relative animate-fade-in cursor-pointer"
                            style={{ animationDelay: `${index * 0.02}s` }}
                            onClick={() => toggleExpanded(event.id)}
                          >
                            <div className="absolute left-0 top-3 w-2 h-2 rounded-full bg-primary border-2 border-background -translate-x-1/2" />
                            <div className="ml-6 flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                              <div className={`p-1.5 rounded-md shrink-0 ${eventTypeColors[event.type]}`}>
                                {getEventIcon(event.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {format(parseISO(event.date), "dd/MM/yy")}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={event.id}
                          className="relative animate-fade-in"
                          style={{ animationDelay: `${index * 0.03}s` }}
                        >
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-6 w-3 h-3 rounded-full bg-primary border-4 border-background -translate-x-1/2" />

                          {/* Event Card */}
                          <Card className="ml-8">
                            <CardContent className="p-4">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className={`p-2 rounded-lg shrink-0 ${eventTypeColors[event.type]}`}>
                                    {getEventIcon(event.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <Badge variant="outline" className="text-xs mb-1">
                                      {eventTypeLabels[event.type]}
                                    </Badge>
                                    <h3 className="font-semibold text-foreground">
                                      {event.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatEventDate(event.date)}
                                      {event.professional && ` • ${event.professional}`}
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpanded(event.id)}
                                  className="shrink-0"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                  <span className="ml-1 text-xs">
                                    {isExpanded ? "Fechar" : "Ver detalhes"}
                                  </span>
                                </Button>
                              </div>

                              {/* Summary */}
                              <p className="text-sm text-muted-foreground ml-12">
                                {event.summary}
                              </p>

                              {/* Expanded Content */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-border ml-12 space-y-4">
                                  {/* Consultation Details */}
                                  {event.type === "consultation" && event.consultationDetails && (
                                    <>
                                      {event.consultationDetails.diagnoses.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <ClipboardList className="h-4 w-4" />
                                            Diagnósticos
                                          </h4>
                                          <ul className="space-y-1">
                                            {event.consultationDetails.diagnoses.map((d) => (
                                              <li key={d.id} className="text-sm text-muted-foreground">
                                                <Badge variant={d.isNew ? "default" : "secondary"} className="mr-2 text-xs">
                                                  {d.isNew ? "Novo" : "Alteração"}
                                                </Badge>
                                                {d.name}
                                                {d.changeReason && <span className="text-xs ml-2">({d.changeReason})</span>}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {event.consultationDetails.treatments.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <Pill className="h-4 w-4" />
                                            Tratamentos
                                          </h4>
                                          <ul className="space-y-1">
                                            {event.consultationDetails.treatments.map((t) => (
                                              <li key={t.id} className="text-sm text-muted-foreground">
                                                <Badge variant={t.isNew ? "default" : "secondary"} className="mr-2 text-xs">
                                                  {t.isNew ? "Novo" : "Alteração"}
                                                </Badge>
                                                {t.name}
                                                {t.dosage && <span className="text-xs ml-1">({t.dosage})</span>}
                                                {t.frequency && <span className="text-xs ml-1">- {t.frequency}</span>}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {event.consultationDetails.exams.length > 0 && (
                                        <div>
                                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <TestTube className="h-4 w-4" />
                                            Exames solicitados
                                          </h4>
                                          <ul className="space-y-1">
                                            {event.consultationDetails.exams.map((e) => (
                                              <li key={e.id} className="text-sm text-muted-foreground flex items-center gap-2">
                                                {e.examType === "imagem" ? <ImageIcon className="h-3 w-3" /> : <FlaskConical className="h-3 w-3" />}
                                                {e.name}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {/* Details */}
                                  {event.details && (
                                    <div>
                                      <h4 className="text-sm font-medium mb-2">Notas clínicas</h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {event.details}
                                      </p>
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex flex-wrap gap-2 pt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditPublicNotes(event)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Editar anotações
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAddPrivateNote(event)}
                                    >
                                      <MessageSquarePlus className="h-4 w-4 mr-1" />
                                      Adicionar nota privada
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Edit Public Notes Dialog */}
      <Dialog open={!!editingPublicNotes} onOpenChange={() => setEditingPublicNotes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar anotações públicas</DialogTitle>
            <DialogDescription>
              Estas anotações serão visíveis para o paciente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={publicNotesValue}
            onChange={(e) => setPublicNotesValue(e.target.value)}
            placeholder="Digite as anotações públicas..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPublicNotes(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePublicNotes}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Private Note Dialog */}
      <Dialog open={!!addingPrivateNote} onOpenChange={() => setAddingPrivateNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Adicionar nota privada
            </DialogTitle>
            <DialogDescription>
              Esta nota será visível apenas para profissionais de saúde.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={privateNoteValue}
            onChange={(e) => setPrivateNoteValue(e.target.value)}
            placeholder="Digite sua nota privada..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingPrivateNote(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePrivateNote}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default PatientTimeline;
