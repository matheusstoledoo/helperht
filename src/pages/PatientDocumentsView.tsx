import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  FileText,
  Calendar,
  Plus,
  Download,
  Upload,
  FlaskConical,
  ImageIcon,
  Receipt,
  File,
  Loader2,
  ExternalLink,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { format, parseISO, subDays, subMonths, subYears, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import PatientLayout from "@/components/patient/PatientLayout";

interface Document {
  id: string;
  patient_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number | null;
  category: string;
  description: string | null;
  uploaded_by: string;
  uploaded_by_role: string;
  is_public: boolean;
  created_at: string;
}

const PatientDocumentsView = () => {
  const { user, loading: authLoading } = useAuth();
  const { professionalId } = useParams<{ professionalId?: string }>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // File input ref - placed outside dialog to avoid mobile reload issues
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("exame_laboratorial");
  const [uploadDocName, setUploadDocName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadHideFromProfessional, setUploadHideFromProfessional] = useState(false);

  // Get professional name if filtering by professional
  const { data: filterProfessional } = useQuery({
    queryKey: ['professional-name', professionalId],
    queryFn: async () => {
      if (!professionalId) return null;
      const { data } = await supabase
        .from('users')
        .select('id, name')
        .eq('id', professionalId)
        .maybeSingle();
      return data;
    },
    enabled: !!professionalId,
  });

  // Tabs
  const [activeTab, setActiveTab] = useState<"imagem" | "laboratorial" | "receita" | "outros">("imagem");

  // Filters
  const [periodFilter, setPeriodFilter] = useState("all");
  const [uploaderFilter, setUploaderFilter] = useState("all");

  useEffect(() => {
    const fetchDocuments = async () => {
      if (authLoading) return;
      if (!user) { setLoading(false); return; }

      try {
        const [patientResult, userResult] = await Promise.all([
          supabase
            .from("patients")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("users")
            .select("name")
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (!patientResult.data) {
          setLoading(false);
          return;
        }

        setPatientId(patientResult.data.id);
        setUserName(userResult.data?.name || "Paciente");

        const { data: docsData, error: docsError } = await supabase
          .from("documents")
          .select("*")
          .eq("patient_id", patientResult.data.id)
          .order("created_at", { ascending: false });

        if (docsError) {
          console.error("Error fetching documents:", docsError);
          setLoading(false);
          return;
        }

        setDocuments(docsData || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user, authLoading]);

  useRealtimeSubscription<Document>({
    table: "documents",
    filter: patientId ? `patient_id=eq.${patientId}` : undefined,
    onInsert: (newDoc) => {
      setDocuments((prev) => [newDoc, ...prev]);
    },
    onUpdate: (updatedDoc) => {
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
      );
    },
    onDelete: (deletedDoc) => {
      setDocuments((prev) => prev.filter((doc) => doc.id !== deletedDoc.id));
    },
  });

  // Map category keys for consistency with tabs
  const getCategoryKey = (category: string) => {
    if (category === "lab_results" || category === "exame_laboratorial") return "laboratorial";
    if (category === "imaging" || category === "exame_imagem") return "imagem";
    if (category === "prescriptions" || category === "receita") return "receita";
    if (category === "other" || category === "reports" || category === "outros" || category === "laudo" || category === "resumo_internacao" || category === "prescricao_nutricional" || category === "prescricao_treino" || category === "prescricao_suplementacao") return "outros";
    return category;
  };

  // Get unique uploaders for filter
  const uploaderOptions = useMemo(() => {
    const professionalUploaders = new Map<string, string>();
    let hasPatientUploads = false;

    documents.forEach((doc) => {
      if (doc.uploaded_by_role === "patient") {
        hasPatientUploads = true;
      } else {
        // Professional upload - use uploaded_by as both key and name
        professionalUploaders.set(doc.uploaded_by, doc.uploaded_by);
      }
    });

    const options: { value: string; label: string }[] = [
      { value: "all", label: "Todos" },
    ];

    // Add individual professionals
    professionalUploaders.forEach((name, key) => {
      options.push({ value: `prof:${key}`, label: name });
    });

    // Add "all professionals" option if there are any
    if (professionalUploaders.size > 0) {
      options.push({ value: "all-professionals", label: "Todos os profissionais" });
    }

    // Add patient option if there are patient uploads
    if (hasPatientUploads) {
      options.push({ value: "patient", label: "Paciente" });
    }

    return options;
  }, [documents]);

  // Filter documents by tab, period, uploader and professional (from URL)
  const filteredDocs = useMemo(() => {
    let filtered = documents.filter((doc) => getCategoryKey(doc.category) === activeTab);

    // If we have a professionalId from URL, filter by that professional
    if (professionalId && filterProfessional) {
      filtered = filtered.filter((doc) => 
        doc.uploaded_by === filterProfessional.name || doc.uploaded_by_role === "patient"
      );
    }

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

    // Filter by uploader (only if not already filtered by URL professional)
    if (uploaderFilter !== "all" && !professionalId) {
      if (uploaderFilter === "patient") {
        filtered = filtered.filter((doc) => doc.uploaded_by_role === "patient");
      } else if (uploaderFilter === "all-professionals") {
        filtered = filtered.filter((doc) => doc.uploaded_by_role !== "patient");
      } else if (uploaderFilter.startsWith("prof:")) {
        const profName = uploaderFilter.replace("prof:", "");
        filtered = filtered.filter((doc) => doc.uploaded_by === profName && doc.uploaded_by_role !== "patient");
      }
    }

    return filtered;
  }, [documents, activeTab, periodFilter, uploaderFilter, professionalId, filterProfessional]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      // Open dialog after file is selected (mobile-safe: file picker happens BEFORE dialog opens)
      setUploadDialogOpen(true);
    }
    // Reset input so the same file can be re-selected
    if (e.target) e.target.value = "";
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!uploadFile || !patientId || !user) {
      toast.error("Dados insuficientes para upload. Tente recarregar a página.");
      return;
    }

    // File size check (max 20MB)
    if (uploadFile.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande. O tamanho máximo é 20MB.");
      return;
    }

    setUploading(true);
    try {
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${patientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(filePath, uploadFile);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(`Erro no envio do arquivo: ${uploadError.message}`);
      }

      const { data: docData, error: dbError } = await supabase.from("documents").insert({
        patient_id: patientId,
        file_name: uploadDocName.trim() || uploadFile.name,
        file_path: filePath,
        file_type: uploadFile.type,
        file_size: uploadFile.size,
        category: uploadCategory,
        description: uploadDescription || null,
        uploaded_by: user.id,
        uploaded_by_role: "patient",
        is_public: true,
      }).select("id").single();

      if (dbError) {
        console.error("DB insert error:", dbError);
        throw new Error(`Erro ao salvar documento: ${dbError.message}`);
      }

      toast.success("Documento enviado! Processando extração...");
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadCategory("exame_laboratorial");
      setUploadDocName("");
      setUploadDescription("");
      setUploadHideFromProfessional(false);

      // Trigger AI extraction in background
      const documentId = docData.id;
      try {
        // Create extraction record
        await supabase.from("document_extractions").insert({
          document_id: documentId,
          user_id: user.id,
          extraction_status: "pending",
          suggested_category: uploadCategory,
        });

        // Get file URL for extraction
        const { data: urlData } = supabase.storage
          .from("patient-documents")
          .getPublicUrl(filePath);

        // If bucket is private, use signed URL instead
        let fileUrl = urlData.publicUrl;
        const { data: signedData } = await supabase.storage
          .from("patient-documents")
          .createSignedUrl(filePath, 600);
        if (signedData?.signedUrl) {
          fileUrl = signedData.signedUrl;
        }

        // Call extraction edge function
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "extract-document",
          {
            body: {
              document_id: documentId,
              file_path: filePath,
              file_type: uploadFile.type,
              category_hint: uploadCategory,
            },
          }
        );

        if (fnError) {
          console.error("Extraction function error:", fnError);
          toast.error("Erro na extração automática. Verifique o documento manualmente.");
        } else {
          // Fetch extraction result and save lab results
          const { data: extractionResult } = await supabase
            .from("document_extractions")
            .select("*")
            .eq("document_id", documentId)
            .single();

          if (extractionResult?.extraction_status === "completed" && extractionResult.extracted_data) {
            const extracted = extractionResult.extracted_data as any;

            // Save lab results if present
            if (extracted.lab_results && extracted.lab_results.length > 0) {
              const collectionDate = extracted.document_date || new Date().toISOString().split("T")[0];
              const labRows = extracted.lab_results.map((lr: any) => ({
                user_id: user.id,
                patient_id: patientId,
                document_id: documentId,
                marker_name: lr.marker_name,
                marker_category: lr.category || "other",
                value: typeof lr.value === "number" ? lr.value : parseFloat(lr.value) || null,
                value_text: typeof lr.value === "string" ? lr.value : null,
                unit: lr.unit,
                reference_min: lr.reference_min,
                reference_max: lr.reference_max,
                reference_text: lr.reference_text,
                collection_date: collectionDate,
                status: getLabStatus(lr.value, lr.reference_min, lr.reference_max),
              }));

              const { error: labError } = await supabase.from("lab_results").insert(labRows);
              if (labError) {
                console.error("Lab results insert error:", labError);
              } else {
                toast.success(`${labRows.length} marcador(es) laboratorial(is) extraído(s) e salvo(s) nos gráficos! 🎉`);
              }
            }

            // Save nutrition plan if present
            if (extracted.nutrition_data && (extracted.nutrition_data.total_calories || extracted.nutrition_data.meals?.length)) {
              await supabase.from("nutrition_plans").insert({
                user_id: user.id,
                patient_id: patientId,
                document_id: documentId,
                professional_name: extracted.professional_name,
                professional_registry: extracted.professional_registry,
                total_calories: extracted.nutrition_data.total_calories,
                carbs_grams: extracted.nutrition_data.carbs_grams,
                carbs_percent: extracted.nutrition_data.carbs_percent,
                protein_grams: extracted.nutrition_data.protein_grams,
                protein_percent: extracted.nutrition_data.protein_percent,
                fat_grams: extracted.nutrition_data.fat_grams,
                fat_percent: extracted.nutrition_data.fat_percent,
                meals: extracted.nutrition_data.meals,
                restrictions: extracted.nutrition_data.restrictions,
                supplements: extracted.nutrition_data.supplements,
              });
            }

            // Save training plan if present
            if (extracted.training_data && extracted.training_data.sessions?.length) {
              await supabase.from("training_plans").insert({
                user_id: user.id,
                patient_id: patientId,
                document_id: documentId,
                professional_name: extracted.professional_name,
                professional_registry: extracted.professional_registry,
                sport: extracted.training_data.sport,
                frequency_per_week: extracted.training_data.frequency_per_week,
                sessions: extracted.training_data.sessions,
              });
            }

            if (!extracted.lab_results?.length) {
              toast.success("Documento processado com sucesso!");
            }
          } else if (extractionResult?.extraction_status === "failed") {
            toast.error(extractionResult.error_message || "Não foi possível interpretar o documento.");
          }
        }
      } catch (extractError: any) {
        console.error("Background extraction error:", extractError);
        // Don't show error toast here - document was saved successfully
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Erro ao enviar documento");
    } finally {
      setUploading(false);
    }
  };

  // Helper to determine lab result status
  const getLabStatus = (value: any, refMin: number | null, refMax: number | null): string => {
    const numVal = typeof value === "number" ? value : parseFloat(value);
    if (isNaN(numVal) || (refMin === null && refMax === null)) return "normal";
    if (refMin !== null && numVal < refMin) return "abnormal";
    if (refMax !== null && numVal > refMax) return "abnormal";
    if (refMin !== null && numVal < refMin * 1.1) return "attention";
    if (refMax !== null && numVal > refMax * 0.9) return "attention";
    return "normal";
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("patient-documents")
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Erro ao baixar documento");
    }
  };

  const handleOpenInNewTab = (doc: Document) => {
    const { data } = supabase.storage
      .from("patient-documents")
      .getPublicUrl(doc.file_path);
    window.open(data.publicUrl, "_blank");
  };

  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const handleDeleteDocument = async (doc: Document) => {
    try {
      await supabase.storage
        .from("patient-documents")
        .remove([doc.file_path]);

      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (error) throw error;
      toast.success("Documento excluído");
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erro ao excluir documento");
    }
  };

  const handleView = async (doc: Document) => {
    setViewingDoc(doc);
    setLoadingPreview(true);
    setPreviewUrl(null);

    try {
      const { data, error } = await supabase.storage
        .from("patient-documents")
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;
      setPreviewUrl(data.signedUrl);
    } catch (error) {
      console.error("View error:", error);
      toast.error("Erro ao visualizar documento");
    } finally {
      setLoadingPreview(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const key = getCategoryKey(category);
    switch (key) {
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
    const key = getCategoryKey(category);
    switch (key) {
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

  const renderDocumentCard = (doc: Document, index: number) => {
    return (
      <Card
        key={doc.id}
        className="animate-fade-in hover:shadow-md transition-shadow"
        style={{ animationDelay: `${index * 0.03}s` }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-lg shrink-0 ${getCategoryColor(doc.category)}`}>
                {getCategoryIcon(doc.category)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate mb-1">
                  {doc.file_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Open in new tab */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleOpenInNewTab(doc)}
                title="Abrir em nova guia"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              {/* Download */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDownload(doc)}
                title="Baixar documento"
              >
                <Download className="h-4 w-4" />
              </Button>
              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(doc)}
                title="Excluir documento"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const breadcrumbContent = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/pac/dashboard">Página inicial</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {professionalId && filterProfessional ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/pac/profissionais">Profissionais</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/pac/profissional/${professionalId}`}>{filterProfessional.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Exames e documentos</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>Exames e documentos</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );

  return (
    <PatientLayout 
      title="Exames e Documentos" 
      subtitle="Gerencie seus exames e documentos médicos"
      breadcrumb={breadcrumbContent}
    >
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        {/* Header with filters and upload button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
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

            {/* Uploader filter - hidden when filtering by professional from URL */}
            {!professionalId && (
              <Select value={uploaderFilter} onValueChange={setUploaderFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Quem registrou" />
                </SelectTrigger>
                <SelectContent>
                  {uploaderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Hidden file input - OUTSIDE dialog to prevent mobile reload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Upload Button - triggers file picker first, then opens dialog */}
          <Button onClick={triggerFilePicker}>
            <Upload className="w-4 h-4 mr-2" />
            Enviar documento
          </Button>

          {/* Upload Dialog - opens AFTER file is selected */}
          <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
            setUploadDialogOpen(open);
            if (!open) {
              // Reset form when closing
              setUploadFile(null);
              setUploadCategory("exame_laboratorial");
              setUploadDocName("");
              setUploadDescription("");
              setUploadHideFromProfessional(false);
            }
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Enviar novo documento</DialogTitle>
                <DialogDescription>
                  Preencha as informações do documento antes de enviar.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Selected file info */}
                {uploadFile && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={triggerFilePicker}
                      disabled={uploading}
                    >
                      Trocar
                    </Button>
                  </div>
                )}

                {/* Document type / Category */}
                <div className="space-y-2">
                  <Label>Tipo de documento *</Label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="exame_imagem">Exame de imagem</SelectItem>
                      <SelectItem value="exame_laboratorial">Exame laboratorial</SelectItem>
                      <SelectItem value="laudo">Laudo / Relatório</SelectItem>
                      <SelectItem value="receita">Receita Médica</SelectItem>
                      <SelectItem value="resumo_internacao">Resumo de Internação</SelectItem>
                      <SelectItem value="prescricao_nutricional">Prescrição Nutricional</SelectItem>
                      <SelectItem value="prescricao_treino">Prescrição de Treino</SelectItem>
                      <SelectItem value="prescricao_suplementacao">Suplementação</SelectItem>
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
                  <Label htmlFor="description">Observações</Label>
                  <Input
                    id="description"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Ex: Exame de rotina"
                    disabled={uploading}
                  />
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  A data de upload será registrada automaticamente.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setUploadDialogOpen(false)}
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

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
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

              {/* Link to lab charts */}
              <Link
                to="/pac/exames-lab"
                className="mt-4 flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Gráficos de Exames</p>
                    <p className="text-xs text-muted-foreground">Veja a evolução dos seus marcadores laboratoriais</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>

              {/* Tab contents */}
              {["imagem", "laboratorial", "receita", "outros"].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-6">
                  {filteredDocs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
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
          </>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{viewingDoc?.file_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewUrl ? (
              viewingDoc?.file_type.startsWith("image/") ? (
                <img
                  src={previewUrl}
                  alt={viewingDoc?.file_name}
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <iframe
                  src={previewUrl}
                  title={viewingDoc?.file_name}
                  className="w-full h-[70vh] rounded-lg"
                />
              )
            ) : (
              <p className="text-center text-muted-foreground py-12">
                Não foi possível carregar a visualização.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PatientLayout>
  );
};

export default PatientDocumentsView;
