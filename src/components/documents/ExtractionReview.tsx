import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  FlaskConical,
  Pill,
  Apple,
  Dumbbell,
  AlertTriangle,
  ChevronLeft,
  Save,
  Trash2,
} from "lucide-react";
import { ExtractedData } from "@/hooks/useDocumentExtraction";
import { cn } from "@/lib/utils";

interface ExtractionReviewProps {
  data: ExtractedData;
  suggestedCategory: string;
  onConfirm: (editedData: ExtractedData, finalCategory: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  exame_laboratorial: "Exame Laboratorial",
  exame_imagem: "Exame de Imagem",
  laudo: "Laudo / Relatório",
  receita: "Receita Médica",
  resumo_internacao: "Resumo de Internação",
  prescricao_nutricional: "Prescrição Nutricional",
  prescricao_treino: "Prescrição de Treino",
  prescricao_suplementacao: "Suplementação",
  outros: "Outros",
};

const STATUS_COLORS: Record<string, string> = {
  normal: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  attention: "bg-amber-500/10 text-amber-700 border-amber-200",
  abnormal: "bg-red-500/10 text-red-700 border-red-200",
};

export const ExtractionReview = ({
  data,
  suggestedCategory,
  onConfirm,
  onSkip,
  onBack,
}: ExtractionReviewProps) => {
  const [editedData, setEditedData] = useState<ExtractedData>({ ...data });
  const [category, setCategory] = useState(suggestedCategory);

  const updateField = (field: keyof ExtractedData, value: any) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const updateLabResult = (index: number, field: string, value: any) => {
    setEditedData((prev) => {
      const updated = [...prev.lab_results];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, lab_results: updated };
    });
  };

  const removeLabResult = (index: number) => {
    setEditedData((prev) => ({
      ...prev,
      lab_results: prev.lab_results.filter((_, i) => i !== index),
    }));
  };

  const confidencePercent = Math.round((data.confidence_score || 0) * 100);
  const isLowConfidence = confidencePercent < 60;

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      {/* Confidence indicator */}
      {isLowConfidence && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Confiança da extração: {confidencePercent}%. Revise os campos destacados com atenção.
          </span>
        </div>
      )}

      {/* Summary */}
      {data.raw_text_summary && (
        <p className="text-sm text-muted-foreground italic">"{data.raw_text_summary}"</p>
      )}

      {/* Category */}
      <div className="space-y-1.5">
        <Label>Categoria do Documento</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date missing prompt */}
      {!editedData.document_date && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 text-blue-700 border border-blue-200 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Data não identificada automaticamente.</strong> Por favor, informe a data do exame abaixo para manter seus resultados em ordem cronológica.
          </span>
        </div>
      )}

      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Data do Documento {!editedData.document_date && <span className="text-red-500">*</span>}</Label>
          <Input
            type="date"
            value={editedData.document_date || ""}
            onChange={(e) => updateField("document_date", e.target.value)}
            className={cn(!editedData.document_date && "border-red-400 ring-1 ring-red-300")}
            autoFocus={!editedData.document_date}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Profissional</Label>
          <Input
            value={editedData.professional_name || ""}
            onChange={(e) => updateField("professional_name", e.target.value)}
            placeholder="Nome do profissional"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Registro (CRM/CRN/CREF)</Label>
          <Input
            value={editedData.professional_registry || ""}
            onChange={(e) => updateField("professional_registry", e.target.value)}
            placeholder="Nº do conselho"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Instituição</Label>
          <Input
            value={editedData.institution || ""}
            onChange={(e) => updateField("institution", e.target.value)}
            placeholder="Laboratório / clínica"
          />
        </div>
      </div>

      {/* Lab Results */}
      {editedData.lab_results && editedData.lab_results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-emerald-600" />
              Resultados Laboratoriais ({editedData.lab_results.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {editedData.lab_results.map((lr, idx) => {
              const status = getStatus(lr.value, lr.reference_min, lr.reference_max);
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-sm",
                    STATUS_COLORS[status] || "border-border"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <Input
                      value={lr.marker_name}
                      onChange={(e) => updateLabResult(idx, "marker_name", e.target.value)}
                      className="h-7 text-xs font-medium bg-transparent border-none p-0"
                    />
                  </div>
                  <Input
                    value={String(lr.value ?? "")}
                    onChange={(e) =>
                      updateLabResult(idx, "value", isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))
                    }
                    className="h-7 w-20 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {lr.unit}
                  </span>
                  {lr.reference_text && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                      Ref: {lr.reference_text}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => removeLabResult(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Medications */}
      {editedData.medications && editedData.medications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Pill className="h-4 w-4 text-red-600" />
              Medicamentos ({editedData.medications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {editedData.medications.map((med, idx) => (
                <div key={idx} className="text-sm p-2 rounded bg-muted/50">
                  <span className="font-medium">{med.name}</span>
                  {med.dose && <span className="text-muted-foreground"> — {med.dose}</span>}
                  {med.posology && <span className="text-muted-foreground">, {med.posology}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nutrition */}
      {editedData.nutrition_data && editedData.nutrition_data.meals && editedData.nutrition_data.meals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Apple className="h-4 w-4 text-green-600" />
              Plano Nutricional
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {editedData.nutrition_data.total_calories && (
              <div className="flex gap-4 flex-wrap">
                <Badge variant="secondary">{editedData.nutrition_data.total_calories} kcal</Badge>
                {editedData.nutrition_data.carbs_grams && (
                  <Badge variant="outline">CHO: {editedData.nutrition_data.carbs_grams}g</Badge>
                )}
                {editedData.nutrition_data.protein_grams && (
                  <Badge variant="outline">PTN: {editedData.nutrition_data.protein_grams}g</Badge>
                )}
                {editedData.nutrition_data.fat_grams && (
                  <Badge variant="outline">LIP: {editedData.nutrition_data.fat_grams}g</Badge>
                )}
              </div>
            )}
            <p className="text-muted-foreground">
              {editedData.nutrition_data.meals.length} refeições identificadas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Training */}
      {editedData.training_data && editedData.training_data.sessions && editedData.training_data.sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-purple-600" />
              Plano de Treino
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {editedData.training_data.sport && (
              <Badge variant="secondary">{editedData.training_data.sport}</Badge>
            )}
            <p className="text-muted-foreground">
              {editedData.training_data.sessions.length} sessões ·{" "}
              {editedData.training_data.frequency_per_week}x/semana
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t sticky bottom-0 bg-background pb-1">
        <Button variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Pular extração
          </Button>
          <Button
            onClick={() => {
              if (!editedData.document_date) {
                const confirmWithout = window.confirm(
                  "A data do documento não foi informada. Sem ela, os resultados podem ficar fora de ordem cronológica. Deseja continuar mesmo assim?"
                );
                if (!confirmWithout) return;
              }
              onConfirm(editedData, category);
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Confirmar e Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

function getStatus(value: number | string, refMin: number | null, refMax: number | null): string {
  if (typeof value !== "number" || (refMin === null && refMax === null)) return "normal";
  if (refMin !== null && value < refMin) return "abnormal";
  if (refMax !== null && value > refMax) return "abnormal";
  return "normal";
}
