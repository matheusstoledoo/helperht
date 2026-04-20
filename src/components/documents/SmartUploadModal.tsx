import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  ImageIcon,
  FileUp,
  FlaskConical,
  ScanLine,
  FileText,
  Pill,
  Building2,
  Apple,
  Dumbbell,
  Sparkles,
  File,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentExtraction, ExtractedData } from "@/hooks/useDocumentExtraction";
import { ExtractionReview } from "./ExtractionReview";

interface SmartUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  userId: string;
  userRole: string;
  userName: string;
  onSuccess?: () => void;
  categoryHint?: string;
}

const DOCUMENT_CATEGORIES = [
  { id: "exame_laboratorial", label: "Exame Laboratorial", icon: FlaskConical, color: "text-emerald-600" },
  { id: "exame_imagem", label: "Exame de Imagem", icon: ScanLine, color: "text-blue-600" },
  { id: "laudo", label: "Laudo / Relatório", icon: FileText, color: "text-indigo-600" },
  { id: "receita", label: "Receita Médica", icon: Pill, color: "text-red-600" },
  { id: "resumo_internacao", label: "Resumo de Internação", icon: Building2, color: "text-orange-600" },
  { id: "prescricao_nutricional", label: "Prescrição Nutricional", icon: Apple, color: "text-green-600" },
  { id: "prescricao_treino", label: "Prescrição de Treino", icon: Dumbbell, color: "text-purple-600" },
  { id: "prescricao_suplementacao", label: "Suplementação", icon: Sparkles, color: "text-amber-600" },
  { id: "outros", label: "Outros", icon: File, color: "text-muted-foreground" },
];

type Step = "source" | "category" | "processing" | "review";

export const SmartUploadModal = ({
  open,
  onOpenChange,
  patientId,
  userId,
  userRole,
  userName,
  onSuccess,
  categoryHint,
}: SmartUploadModalProps) => {
  const [step, setStep] = useState<Step>("source");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    isExtracting,
    extractedData,
    setExtractedData,
    uploadAndExtract,
    confirmExtraction,
    reset,
  } = useDocumentExtraction();

  const handleClose = () => {
    setStep("source");
    setSelectedFile(null);
    setSelectedCategory(null);
    setDocumentId(null);
    reset();
    onOpenChange(false);
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setStep("category");
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.webp";
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = "";
  };

  const handleCategorySelected = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setStep("processing");

    const result = await uploadAndExtract(
      selectedFile!,
      patientId,
      userId,
      userRole,
      userName,
      categoryId
    );

    if (result) {
      setDocumentId(result.documentId);
      setStep("review");
    } else {
      setStep("category");
    }
  };

  const handleConfirm = async (editedData: ExtractedData, finalCategory: string) => {
    if (!documentId) return;
    const success = await confirmExtraction(documentId, userId, patientId, editedData, finalCategory);
    if (success) {
      onSuccess?.();
      handleClose();
    }
  };

  const handleSkipExtraction = async () => {
    // Save without AI extraction
    onSuccess?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "source" && "Adicionar Documento"}
            {step === "category" && "Tipo de Documento"}
            {step === "processing" && "Processando..."}
            {step === "review" && "Revisar Dados Extraídos"}
          </DialogTitle>
          <DialogDescription>
            {step === "source" && "Escolha como deseja enviar seu documento"}
            {step === "category" && `Arquivo: ${selectedFile?.name}`}
            {step === "processing" && "Lendo seu documento... ✨"}
            {step === "review" && "Confira os dados extraídos e corrija se necessário"}
          </DialogDescription>
        </DialogHeader>

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleInputChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* Step: Source Selection */}
        {step === "source" && (
          <div className="grid grid-cols-3 gap-4 py-4">
            <button
              onClick={handleCameraCapture}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted hover:border-accent hover:bg-accent/5 transition-all group"
            >
              <Camera className="h-10 w-10 text-accent group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Câmera</span>
            </button>
            <button
              onClick={handleGallerySelect}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted hover:border-accent hover:bg-accent/5 transition-all group"
            >
              <ImageIcon className="h-10 w-10 text-accent group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Galeria</span>
            </button>
            <button
              onClick={handleFileSelect}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-dashed border-muted hover:border-accent hover:bg-accent/5 transition-all group"
            >
              <FileUp className="h-10 w-10 text-accent group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Arquivo</span>
            </button>
          </div>
        )}

        {/* Step: Category Selection */}
        {step === "category" && (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOCUMENT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelected(cat.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                      "hover:border-accent hover:bg-accent/5"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", cat.color)} />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                );
              })}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setStep("source")}>
              Voltar
            </Button>
          </div>
        )}

        {/* Step: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-accent animate-spin" />
              <Sparkles className="h-5 w-5 text-accent absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              {isUploading && (
                <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
              )}
              {isExtracting && (
                <>
                  <p className="text-sm font-medium">Analisando documento com IA...</p>
                  <p className="text-xs text-muted-foreground">
                    Extraindo dados, identificando marcadores e categorias
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && extractedData && (
          <ExtractionReview
            data={extractedData}
            suggestedCategory={selectedCategory || "outros"}
            onConfirm={handleConfirm}
            onSkip={handleSkipExtraction}
            onBack={() => setStep("category")}
          />
        )}

        {/* Fallback: extraction failed */}
        {step === "review" && !extractedData && (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="h-10 w-10 text-amber-500" />
            <p className="text-sm text-center text-muted-foreground">
              Não foi possível extrair dados automaticamente. O documento foi salvo, 
              mas você pode preencher os dados manualmente.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkipExtraction}>
                Salvar sem extração
              </Button>
              <Button onClick={() => { setStep("category"); }}>
                Tentar novamente
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
