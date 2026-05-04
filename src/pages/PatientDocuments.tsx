import { useState, useEffect, useCallback } from "react";
import { FullPageLoading } from "@/components/ui/loading-spinner";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  Eye,
  EyeOff,
  ExternalLink,
  Download,
  Receipt,
  File,
  ImageIcon,
  FlaskConical,
  Calendar,
  UserCircle,
  Loader2,
} from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentData {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  category: string;
  document_type: string | null;
  description: string | null;
  uploaded_by: string;
  uploaded_by_role: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  patient_id: string;
  consultation_id: string | null;
}

interface PatientData {
  id: string;
  users: {
    id: string;
    name: string;
  } | null;
}

interface ProfessionalData {
  id: string;
  name: string;
}

// Mock professionals for demonstration
const mockProfessionals: ProfessionalData[] = [
  { id: "prof-1", name: "Dr. Carlos Mendes" },
  { id: "prof-2", name: "Dra. Ana Silva" },
  { id: "prof-3", name: "Dr. Roberto Almeida" },
];

// Mock documents for demonstration
const mockDocuments: DocumentData[] = [
  {
    id: "doc-1",
    file_name: "Hemograma_Completo_2024.pdf",
    file_path: "/mock/hemograma.pdf",
    file_type: "application/pdf",
    file_size: 245000,
    category: "laboratorial",
    document_type: "exame",
    description: "Hemograma completo com contagem diferencial",
    uploaded_by: "prof-1",
    uploaded_by_role: "professional",
    is_public: true,
    created_at: "2024-12-20T10:30:00Z",
    updated_at: "2024-12-20T10:30:00Z",
    patient_id: "mock-patient",
    consultation_id: null,
  },
  {
    id: "doc-2",
    file_name: "Raio_X_Torax.jpg",
    file_path: "/mock/raiox.jpg",
    file_type: "image/jpeg",
    file_size: 1250000,
    category: "imagem",
    document_type: "exame",
    description: "Radiografia de tórax PA e perfil",
    uploaded_by: "prof-2",
    uploaded_by_role: "professional",
    is_public: true,
    created_at: "2024-12-18T14:00:00Z",
    updated_at: "2024-12-18T14:00:00Z",
    patient_id: "mock-patient",
    consultation_id: null,
  },
  {
    id: "doc-3",
    file_name: "Receita_Losartana_50mg.pdf",
    file_path: "/mock/receita1.pdf",
    file_type: "application/pdf",
    file_size: 85000,
    category: "receita",
    document_type: "receita",
    description: "Receita de Losartana 50mg - uso contínuo",
    uploaded_by: "prof-1",
    uploaded_by_role: "professional",
    is_public: true,
    created_at: "2024-12-15T09:00:00Z",
    updated_at: "2024-12-15T09:00:00Z",
    patient_id: "mock-patient",
    consultation_id: null,
  },
  {
    id: "doc-4",
    file_name: "Ultrassom_Abdome.pdf",
    file_path: "/mock/ultrassom.pdf",
    file_type: "application/pdf",
    file_size: 3500000,
    category: "imagem",
    document_type: "exame",
    description: "Ultrassonografia de abdome total",
    uploaded_by: "prof-3",
    uploaded_by_role: "professional",
    is_public: false,
    created_at: "2024-12-10T11:30:00Z",
    updated_at: "2024-12-10T11:30:00Z",
    patient_id: "mock-patient",
    consultation_id: null,
  },
  {
    id: "doc-5",
    file_name: "Glicemia_Jejum.pdf",
    file_path: "/mock/glicemia.pdf",
    file_type: "application/pdf",
    file_size: 120000,
    category: "laboratorial",
    document_type: "exame",
    description: "Exame de glicemia em jejum",
    uploaded_by: "mock-patient-user",
    uploaded_by_role: "patient",
    is_public: true,
    created_at: "2024-12-08T08:00:00Z",
    updated_at: "2024-12-08T08:00:00Z",
    patient_id: "mock-patient",
    consultation_id: null,
  },
  {
    id: "doc-6",
    file_name: "Atestado_Medico.pdf",
    file_path: "/mock/atestado.pdf",
    file_type: "application/pdf",
    file_size: 65000,
    category: "outros",
    document_type: "atestado",
    description: "Atestado médico - 3 dias de repouso",
    uploaded_by: "prof-2",
    uploaded_by_role: "professional",
    is_public: true,
    created_at: "2024-11-28T16:00:00Z",
    updated_at: "2024-11-28T16:00:00Z",
    patient_id: "mock-patient",
    consultation_id: null,
  },
  {
    id: "doc-7",
    file_name: "Receita_Omeprazol.pdf",
    file_path: "/mock/receita2.pdf",
    file_type: "application/pdf",
    file_size: 78000,
    category: "receita",
    document_type: "receita",
    description: "Receita de Omeprazol 20mg",
    uploaded_by: "prof-3",
    uploaded_by_role: "professional",
    is_public: true,
    created_at: "2024-11-20T10:00:00Z",
    updated_at: "2024-11-20T10:00:00Z",
    patient_id: "mock-patient",
    consultation_id: null,
  },
];

const documentCategories = [
  { value: "imagem", label: "Exame de Imagem" },
  { value: "laboratorial", label: "Exame Laboratorial" },
  { value: "receita", label: "Receita" },
  { value: "outros", label: "Outros" },
];

const PatientDocuments = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"imagem" | "laboratorial" | "receita" | "outros">("imagem");

  // Filters
  const [periodFilter, setPeriodFilter] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState("all");

  // Upload dialog
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("laboratorial");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadIsPublic, setUploadIsPublic] = useState(true);

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

  const fetchDocumentsData = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Fetch patient data
      const { data: patientData } = await supabase
        .from("patients")
        .select("id, user_id, users (id, name)")
        .eq("id", id)
        .maybeSingle();

      setPatient(patientData);
      const patientUserId = (patientData as any)?.user_id;

      // Fetch documents
      let { data: documentsData, error } = await supabase
        .from("documents")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fallback por user_id se não retornou dados
      if ((!documentsData || documentsData.length === 0) && patientUserId) {
        const fb = await supabase
          .from("documents")
          .select("*")
          .eq("uploaded_by", patientUserId)
          .order("created_at", { ascending: false });
        if (fb.data && fb.data.length > 0) documentsData = fb.data;
      }

      // Use mock data if no real documents exist
      if (!documentsData || documentsData.length === 0) {
        setDocuments(mockDocuments);
      } else {
        setDocuments(documentsData);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
      // Use mock data on error
      setDocuments(mockDocuments);
      toast({
        title: "Aviso",
        description: "Usando dados de demonstração.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    if (user && (isProfessional || isAdmin)) {
      fetchDocumentsData();
    }
  }, [user, isProfessional, isAdmin, fetchDocumentsData]);

  // Apply filters
  useEffect(() => {
    let filtered = [...documents];

    // Filter by category (tab)
    filtered = filtered.filter((doc) => doc.category === activeTab);

    // Filter by period
    if (periodFilter !== "all") {
      const now = new Date();
      let cutoffDate: Date;

      switch (periodFilter) {
        case "7days":
          cutoffDate = subDays(now, 7);
          break;
        case "14days":
          cutoffDate = subDays(now, 14);
          break;
        case "1month":
          cutoffDate = subMonths(now, 1);
          break;
        case "6months":
          cutoffDate = subMonths(now, 6);
          break;
        case "1year":
          cutoffDate = subYears(now, 1);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter((doc) => isAfter(parseISO(doc.created_at), cutoffDate));
    }

    // Filter by uploader
    if (uploaderFilter !== "all") {
      if (uploaderFilter === "patient") {
        filtered = filtered.filter((doc) => doc.uploaded_by_role === "patient");
      } else {
        filtered = filtered.filter((doc) => doc.uploaded_by === uploaderFilter);
      }
    }

    setFilteredDocs(filtered);
  }, [documents, activeTab, periodFilter, uploaderFilter]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !user || !id) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("patient-documents")
        .getPublicUrl(fileName);

      // Get user's role
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      // Insert document record
      const { error: insertError } = await supabase.from("documents").insert({
        patient_id: id,
        file_name: uploadDocName.trim() || uploadFile.name,
        file_path: urlData.publicUrl,
        file_type: uploadFile.type,
        file_size: uploadFile.size,
        category: uploadCategory,
        description: uploadDescription || null,
        uploaded_by: user.id,
        uploaded_by_role: userData?.role || "professional",
        is_public: uploadIsPublic,
      });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso.",
      });

      // Reset form and refresh
      setUploadFile(null);
      setUploadCategory("laboratorial");
      setUploadDocName("");
      setUploadDescription("");
      setUploadIsPublic(true);
      setIsUploadOpen(false);
      fetchDocumentsData();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o documento.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleToggleVisibility = async (doc: DocumentData) => {
    try {
      const { error } = await supabase
        .from("documents")
        .update({ is_public: !doc.is_public })
        .eq("id", doc.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Documento agora é ${!doc.is_public ? "visível" : "oculto"} para o paciente.`,
      });

      // Update local state
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_public: !d.is_public } : d))
      );
    } catch (error) {
      console.error("Error updating document visibility:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a visibilidade.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (doc: DocumentData) => {
    try {
      // For mock data or direct URLs
      const link = document.createElement("a");
      link.href = doc.file_path;
      link.download = doc.file_name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o documento.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getUploaderName = (doc: DocumentData): string => {
    if (doc.uploaded_by_role === "patient") {
      return "Paciente";
    }
    const professional = mockProfessionals.find((p) => p.id === doc.uploaded_by);
    return professional?.name || "Profissional";
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "imagem":
        return <ImageIcon className="w-5 h-5" />;
      case "laboratorial":
        return <FlaskConical className="w-5 h-5" />;
      case "receita":
        return <Receipt className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "imagem":
        return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400";
      case "laboratorial":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
      case "receita":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      default:
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
    }
  };

  // Get unique uploaders for filter
  const getUploaderOptions = () => {
    const options: { value: string; label: string }[] = [
      { value: "all", label: "Todos" },
    ];

    const professionalIds = new Set<string>();
    let hasPatientUploads = false;

    documents.forEach((doc) => {
      if (doc.uploaded_by_role === "patient") {
        hasPatientUploads = true;
      } else {
        professionalIds.add(doc.uploaded_by);
      }
    });

    mockProfessionals.forEach((prof) => {
      if (professionalIds.has(prof.id)) {
        options.push({ value: prof.id, label: prof.name });
      }
    });

    // Add all professionals option
    if (professionalIds.size > 0) {
      options.push({ value: "all-professionals", label: "Todos os profissionais" });
    }

    if (hasPatientUploads) {
      options.push({ value: "patient", label: "Paciente" });
    }

    return options;
  };

  if (authLoading || roleLoading || isLoading) {
    return <FullPageLoading />;
  }

  const patientName = patient?.users?.name || "Teste";

  const renderDocumentCard = (doc: DocumentData, index: number) => {
    return (
      <Card
        key={doc.id}
        className="animate-fade-in"
        style={{ animationDelay: `${index * 0.03}s` }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-lg shrink-0 ${getCategoryColor(doc.category)}`}>
                {getCategoryIcon(doc.category)}
              </div>
              <div className="flex-1 min-w-0">
                {/* Document name */}
                <h3 className="font-semibold text-foreground truncate mb-1">
                  {doc.file_name}
                </h3>

                {/* Info grid */}
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    <span>Upload: {formatDate(doc.created_at)}</span>
                  </div>
                </div>

                {/* File size */}
                {doc.file_size && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(doc.file_size)}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {/* Visibility toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleVisibility(doc)}
                title={doc.is_public ? "Ocultar do paciente" : "Tornar visível para o paciente"}
                className={doc.is_public ? "text-green-600" : "text-muted-foreground"}
              >
                {doc.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>

              {/* Open in new tab */}
              <Button
                variant="ghost"
                size="icon"
                title="Abrir em nova guia"
                onClick={() => {
                   const { data } = supabase.storage
                    .from("documents")
                    .getPublicUrl(doc.file_path);
                  window.open(data.publicUrl, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>

              {/* Download */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(doc)}
                title="Baixar documento"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Página inicial</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/prof/paciente/${id}`}>{patientName}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Documentos</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">Documentos do paciente</h1>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => navigate(`/prof/paciente/${id}/graficos-exames`)}
            >
              <FlaskConical className="w-4 h-4 mr-2" />
              Gráficos de Exames
            </Button>

          {/* Upload Button */}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Enviar documento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar novo documento</DialogTitle>
                <DialogDescription>
                  Faça upload de um documento para o prontuário do paciente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* File input */}
                <div className="space-y-2">
                  <Label htmlFor="file">Escolher arquivo *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  {uploadFile && (
                    <p className="text-xs text-muted-foreground">
                      {uploadFile.name} ({formatFileSize(uploadFile.size)})
                    </p>
                  )}
                </div>

                {/* Document type / Category */}
                <div className="space-y-2">
                  <Label>Tipo de documento *</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laboratorial">Exame laboratorial</SelectItem>
                      <SelectItem value="imagem">Exame de imagem</SelectItem>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="outros">Outro documento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Document name */}
                <div className="space-y-2">
                  <Label htmlFor="docName">Nome do documento</Label>
                  <Input
                    id="docName"
                    value={uploadDocName}
                    onChange={(e) => setUploadDocName(e.target.value)}
                    placeholder="Ex: Hemograma Completo - Janeiro 2024"
                    disabled={uploading}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição do documento</Label>
                  <Input
                    id="description"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Ex: Exame de rotina solicitado na consulta"
                    disabled={uploading}
                  />
                </div>



                {/* Auto upload date info */}
                <p className="text-xs text-muted-foreground text-center">
                  A data de upload será registrada automaticamente.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleUpload} disabled={uploading || !uploadFile}>
                  {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Period filter */}
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7days">7 dias</SelectItem>
              <SelectItem value="14days">14 dias</SelectItem>
              <SelectItem value="1month">1 mês</SelectItem>
              <SelectItem value="6months">6 meses</SelectItem>
              <SelectItem value="1year">1 ano</SelectItem>
            </SelectContent>
          </Select>

          {/* Uploader filter */}
          <Select value={uploaderFilter} onValueChange={setUploaderFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Quem registrou" />
            </SelectTrigger>
            <SelectContent>
              {getUploaderOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="imagem" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Exames de imagem</span>
              <span className="sm:hidden">Imagem</span>
            </TabsTrigger>
            <TabsTrigger value="laboratorial" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              <span className="hidden sm:inline">Exames laboratoriais</span>
              <span className="sm:hidden">Lab</span>
            </TabsTrigger>
            <TabsTrigger value="receita" className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <span className="hidden sm:inline">Receitas</span>
              <span className="sm:hidden">Receitas</span>
            </TabsTrigger>
            <TabsTrigger value="outros" className="flex items-center gap-2">
              <File className="w-4 h-4" />
              <span className="hidden sm:inline">Outros documentos</span>
              <span className="sm:hidden">Outros</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab contents */}
          {["imagem", "laboratorial", "receita", "outros"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-6">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <File className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhum documento encontrado nesta categoria</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredDocs.map((doc, index) => renderDocumentCard(doc, index))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default PatientDocuments;
