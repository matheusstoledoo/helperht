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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
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
  Calendar,
  ChevronDown,
  ChevronUp,
  UserCircle,
  FlaskConical,
  ImageIcon,
  FileDown,
  ExternalLink,
  Upload,
  Loader2,
} from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExamData {
  id: string;
  name: string;
  exam_type: string | null;
  requested_date: string;
  scheduled_date: string | null;
  completed_date: string | null;
  status: "requested" | "in_progress" | "completed" | "cancelled";
  result: string | null;
  result_file_path: string | null;
  findings: string | null;
  interpretation: string | null;
  requested_by: string | null;
  performed_by: string | null;
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

const statusLabels: Record<string, string> = {
  requested: "Solicitado",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  requested: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

// Exam type categorization
const labExamTypes = ["laboratorial", "sangue", "urina", "fezes", "bioquímica", "hemograma", "hormonal"];
const imagingExamTypes = ["imagem", "raio-x", "tomografia", "ressonância", "ultrassom", "mamografia", "densitometria"];

const isLabExam = (examType: string | null): boolean => {
  if (!examType) return true; // Default to lab if no type specified
  const type = examType.toLowerCase();
  return labExamTypes.some(t => type.includes(t)) || !imagingExamTypes.some(t => type.includes(t));
};

const isImagingExam = (examType: string | null): boolean => {
  if (!examType) return false;
  const type = examType.toLowerCase();
  return imagingExamTypes.some(t => type.includes(t));
};

const PatientExams = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [exams, setExams] = useState<ExamData[]>([]);
  const [filteredExams, setFilteredExams] = useState<ExamData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"lab" | "imaging">("lab");

  // Filters
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [examTypeFilter, setExamTypeFilter] = useState("all");

  // Expanded cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadExamName, setUploadExamName] = useState("");
  const [uploadExamCategory, setUploadExamCategory] = useState<"laboratorial" | "imagem">("laboratorial");
  const [uploadResult, setUploadResult] = useState("");
  const [uploadFindings, setUploadFindings] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!roleLoading && !isProfessional && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isProfessional, isAdmin, roleLoading, navigate]);

  const fetchExamsData = useCallback(async () => {
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

      // Fetch exams
      const { data: examsData, error } = await supabase
        .from("exams")
        .select("*")
        .eq("patient_id", id)
        .order("requested_date", { ascending: false });

      if (error) throw error;

      setExams(examsData || []);
    } catch (error) {
      console.error("Error fetching exams:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os exames.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (user && (isProfessional || isAdmin)) {
      fetchExamsData();
    }
  }, [user, isProfessional, isAdmin, fetchExamsData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...exams];

    // Filter by exam category (tab)
    if (activeTab === "lab") {
      filtered = filtered.filter((e) => isLabExam(e.exam_type));
    } else {
      filtered = filtered.filter((e) => isImagingExam(e.exam_type));
    }

    // Filter by exam type
    if (examTypeFilter !== "all") {
      filtered = filtered.filter((e) => e.status === examTypeFilter);
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

      filtered = filtered.filter((e) => isAfter(parseISO(e.requested_date), cutoffDate));
    }

    setFilteredExams(filtered);
  }, [exams, activeTab, dateRangeFilter, examTypeFilter]);

  const toggleExpanded = (examId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(examId)) {
        newSet.delete(examId);
      } else {
        newSet.add(examId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const isOtherProfessional = (exam: ExamData) => {
    return exam.requested_by && user && exam.requested_by !== user.id;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!uploadFile || !user || !id || !uploadExamName) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${id}/exams/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("patient-documents")
        .getPublicUrl(fileName);

      // Insert exam record
      const { error: insertError } = await supabase.from("exams").insert({
        patient_id: id,
        name: uploadExamName,
        exam_type: uploadExamCategory,
        requested_by: user.id,
        requested_date: new Date().toISOString(),
        completed_date: new Date().toISOString(),
        status: "completed",
        result: uploadResult || null,
        findings: uploadFindings || null,
        result_file_path: urlData.publicUrl,
      });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Exame enviado com sucesso.",
      });

      // Reset form and refresh
      setUploadFile(null);
      setUploadExamName("");
      setUploadExamCategory("laboratorial");
      setUploadResult("");
      setUploadFindings("");
      setIsUploadOpen(false);
      fetchExamsData();
    } catch (error) {
      console.error("Error uploading exam:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o exame.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const currentPath = location.pathname;
  const basePath = `/prof/paciente/${id}`;

  // Get unique exam types for filter
  const uniqueExamStatuses = Array.from(new Set(exams.map(e => e.status)));

  if (authLoading || roleLoading || isLoading) {
    return <FullPageLoading />;
  }

  const renderExamCard = (exam: ExamData, index: number) => {
    const isExpanded = expandedCards.has(exam.id);
    const otherProfessional = isOtherProfessional(exam);

    return (
      <div
        key={exam.id}
        className="relative animate-fade-in"
        style={{ animationDelay: `${index * 0.03}s` }}
      >
        {/* Timeline dot */}
        <div className={`absolute left-0 top-6 w-3 h-3 rounded-full border-4 border-background -translate-x-1/2 ${
          exam.status === "completed" ? "bg-green-500" : 
          exam.status === "in_progress" ? "bg-yellow-500" : 
          exam.status === "cancelled" ? "bg-muted-foreground" : "bg-blue-500"
        }`} />

        {/* Exam Card */}
        <Card className="ml-8">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-3 flex-1">
                <div className={`p-2 rounded-lg shrink-0 ${
                  activeTab === "lab" 
                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                    : "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400"
                }`}>
                  {activeTab === "lab" ? <FlaskConical className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={statusColors[exam.status]}>
                      {statusLabels[exam.status]}
                    </Badge>
                    {exam.exam_type && (
                      <Badge variant="outline" className="text-xs">
                        {exam.exam_type}
                      </Badge>
                    )}
                    {otherProfessional && (
                      <Badge variant="secondary" className="text-xs">
                        <UserCircle className="w-3 h-3 mr-1" />
                        Pedido por outro profissional
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground">
                    {exam.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Solicitado em: {formatDate(exam.requested_date)}
                    {exam.completed_date && ` • Concluído em: ${formatDate(exam.completed_date)}`}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpanded(exam.id)}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Result Summary (always visible if completed) */}
            {exam.status === "completed" && exam.result && !isExpanded && (
              <div className="mt-2 text-sm text-muted-foreground line-clamp-2 pl-12">
                <span className="font-medium">Resultado:</span> {exam.result}
              </div>
            )}

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                {/* Result */}
                {exam.result && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Resultado
                    </p>
                    <p className="text-sm">{exam.result}</p>
                  </div>
                )}

                {/* Findings */}
                {exam.findings && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Achados
                    </p>
                    <p className="text-sm">{exam.findings}</p>
                  </div>
                )}

                {/* Interpretation */}
                {exam.interpretation && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Interpretação
                    </p>
                    <p className="text-sm">{exam.interpretation}</p>
                  </div>
                )}

                {/* File link */}
                {exam.result_file_path && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      const { data } = supabase.storage
                        .from("patient-documents")
                        .getPublicUrl(exam.result_file_path!);
                      window.open(data.publicUrl, "_blank");
                    }}>
                      <FileDown className="w-4 h-4 mr-2" />
                      Ver documento
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}

                {/* Dates info */}
                <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                  {exam.scheduled_date && (
                    <p>Agendado para: {formatDate(exam.scheduled_date)}</p>
                  )}
                  {exam.performed_by && (
                    <p className="mt-1">Realizado por: {exam.performed_by}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

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
                    const isActive = currentPath === fullPath || (item.path === "/exames" && currentPath.includes("/exames"));

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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Exames do paciente</h1>
                  <p className="text-sm text-muted-foreground">
                    {patient?.users?.name || "Paciente"}
                  </p>
                </div>
              </div>

              {/* Upload Button */}
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar exame
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Enviar resultado de exame</DialogTitle>
                    <DialogDescription>
                      Faça upload de um resultado de exame para o prontuário do paciente.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {/* Exam Name */}
                    <div className="space-y-2">
                      <Label htmlFor="examName">Nome do exame *</Label>
                      <Input
                        id="examName"
                        value={uploadExamName}
                        onChange={(e) => setUploadExamName(e.target.value)}
                        placeholder="Ex: Hemograma, Raio-X de Tórax..."
                      />
                    </div>

                    {/* Exam Category */}
                    <div className="space-y-2">
                      <Label>Tipo de exame *</Label>
                      <Select value={uploadExamCategory} onValueChange={(v) => setUploadExamCategory(v as "laboratorial" | "imagem")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="laboratorial">
                            <div className="flex items-center gap-2">
                              <FlaskConical className="w-4 h-4" />
                              Laboratorial
                            </div>
                          </SelectItem>
                          <SelectItem value="imagem">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="w-4 h-4" />
                              Imagem
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* File input */}
                    <div className="space-y-2">
                      <Label htmlFor="file">Arquivo do resultado *</Label>
                      <Input
                        id="file"
                        type="file"
                        onChange={handleFileChange}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      {uploadFile && (
                        <p className="text-xs text-muted-foreground">
                          {uploadFile.name} ({formatFileSize(uploadFile.size)})
                        </p>
                      )}
                    </div>

                    {/* Result summary */}
                    <div className="space-y-2">
                      <Label htmlFor="result">Resumo do resultado (opcional)</Label>
                      <Textarea
                        id="result"
                        value={uploadResult}
                        onChange={(e) => setUploadResult(e.target.value)}
                        placeholder="Breve resumo do resultado..."
                        className="min-h-[80px]"
                      />
                    </div>

                    {/* Findings */}
                    <div className="space-y-2">
                      <Label htmlFor="findings">Achados (opcional)</Label>
                      <Textarea
                        id="findings"
                        value={uploadFindings}
                        onChange={(e) => setUploadFindings(e.target.value)}
                        placeholder="Achados relevantes..."
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsUploadOpen(false)}
                      disabled={uploading}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleUpload} disabled={!uploadFile || !uploadExamName || uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Últimos 30 dias</SelectItem>
                  <SelectItem value="quarter">Últimos 3 meses</SelectItem>
                  <SelectItem value="year">Último ano</SelectItem>
                </SelectContent>
              </Select>

              <Select value={examTypeFilter} onValueChange={setExamTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <TestTube className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {uniqueExamStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </header>

          {/* Tabs Content */}
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-3xl mx-auto">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "lab" | "imaging")} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="lab" className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4" />
                    Exames laboratoriais
                  </TabsTrigger>
                  <TabsTrigger value="imaging" className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Exames de imagem
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lab" className="mt-0">
                  {filteredExams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <FlaskConical className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Nenhum exame laboratorial encontrado.</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Vertical timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                      {/* Timeline events */}
                      <div className="space-y-6 pl-6">
                        {filteredExams.map((exam, index) => renderExamCard(exam, index))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="imaging" className="mt-0">
                  {filteredExams.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Nenhum exame de imagem encontrado.</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Vertical timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                      {/* Timeline events */}
                      <div className="space-y-6 pl-6">
                        {filteredExams.map((exam, index) => renderExamCard(exam, index))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default PatientExams;
