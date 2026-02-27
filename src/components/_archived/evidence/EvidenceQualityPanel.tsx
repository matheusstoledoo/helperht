import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Scale,
  Target,
  Shield,
  BookOpen,
  Clock,
  User,
} from "lucide-react";
import { QualityBadge } from "./QualityBadge";
import { QualityAnalysis } from "@/hooks/_archived/useEvidenceQualityAnalysis";

interface EvidenceQualityPanelProps {
  analysis: QualityAnalysis | null;
  loading: boolean;
  onAnalyze: () => void;
  articleTitle: string;
  hasFullText?: boolean;
}

export const EvidenceQualityPanel = ({
  analysis,
  loading,
  onAnalyze,
  articleTitle,
  hasFullText,
}: EvidenceQualityPanelProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview"])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  if (!analysis && !loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Scale className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h4 className="font-medium">Análise de Qualidade</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Avalie a qualidade metodológica, risco de viés e aplicabilidade
                deste estudo ao paciente.
              </p>
            </div>
            <Button onClick={onAnalyze} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Scale className="mr-2 h-4 w-4" />
                  Analisar Qualidade
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Analisando estudo...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Obtendo texto completo e avaliando qualidade metodológica
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <TooltipProvider>
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {/* Overview Section */}
          <Collapsible
            open={expandedSections.has("overview")}
            onOpenChange={() => toggleSection("overview")}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedSections.has("overview") ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <CardTitle className="text-sm">Visão Geral</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <QualityBadge
                        type="methodology"
                        value={analysis.methodology_quality}
                        size="sm"
                      />
                      <QualityBadge
                        type="applicability"
                        value={analysis.applicability}
                        size="sm"
                      />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* Full Text Status */}
                  <div className="flex items-center gap-2 text-sm">
                    {analysis.full_text_available ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>
                          Texto completo analisado via{" "}
                          {analysis.full_text_source?.toUpperCase()}
                        </span>
                      </>
                    ) : (
                      <>
                        <Info className="h-4 w-4 text-yellow-500" />
                        <span>Análise baseada no resumo (texto completo não disponível)</span>
                      </>
                    )}
                  </div>

                  {/* Study Type */}
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Tipo de Estudo
                    </span>
                    <p className="font-medium capitalize">
                      {analysis.study_type_detected.replace(/_/g, " ")}
                    </p>
                  </div>

                  {/* Design Details */}
                  {analysis.study_design_details && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {analysis.study_design_details.population && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            População
                          </span>
                          <p>{analysis.study_design_details.population}</p>
                        </div>
                      )}
                      {analysis.study_design_details.intervention && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Intervenção
                          </span>
                          <p>{analysis.study_design_details.intervention}</p>
                        </div>
                      )}
                      {analysis.study_design_details.sample_size && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Amostra
                          </span>
                          <p>{analysis.study_design_details.sample_size}</p>
                        </div>
                      )}
                      {analysis.study_design_details.follow_up && (
                        <div>
                          <span className="text-xs text-muted-foreground">
                            Seguimento
                          </span>
                          <p>{analysis.study_design_details.follow_up}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overall Recommendation */}
                  {analysis.overall_recommendation && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <Target className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <span className="text-xs font-medium">Recomendação</span>
                          <p className="text-sm mt-1">
                            {analysis.overall_recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Strengths & Limitations */}
                  <div className="grid grid-cols-2 gap-4">
                    {analysis.strengths && analysis.strengths.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Pontos Fortes
                        </span>
                        <ul className="text-xs mt-1 space-y-1">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="text-muted-foreground">
                              • {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.limitations && analysis.limitations.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-orange-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Limitações
                        </span>
                        <ul className="text-xs mt-1 space-y-1">
                          {analysis.limitations.map((l, i) => (
                            <li key={i} className="text-muted-foreground">
                              • {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Methodology Section */}
          <Collapsible
            open={expandedSections.has("methodology")}
            onOpenChange={() => toggleSection("methodology")}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedSections.has("methodology") ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <BookOpen className="h-4 w-4" />
                      <CardTitle className="text-sm">
                        Qualidade Metodológica
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Score: {analysis.methodology_score}/100
                      </span>
                      <QualityBadge
                        type="methodology"
                        value={analysis.methodology_quality}
                        size="sm"
                      />
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm">{analysis.methodology_summary}</p>

                  {/* Checklist Items */}
                  {Object.entries(analysis.methodology_checklist).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Checklist de Avaliação
                      </span>
                      <div className="grid gap-1">
                        {Object.entries(analysis.methodology_checklist).map(
                          ([key, item]) => (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50 cursor-help">
                                  {item.met === true ? (
                                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                  ) : item.met === false ? (
                                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                  ) : (
                                    <Info className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                  )}
                                  <span className="capitalize">
                                    {key.replace(/_/g, " ")}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>{item.justification}</p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Bias Risk Section */}
          <Collapsible
            open={expandedSections.has("bias")}
            onOpenChange={() => toggleSection("bias")}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedSections.has("bias") ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Shield className="h-4 w-4" />
                      <CardTitle className="text-sm">Risco de Viés</CardTitle>
                    </div>
                    <QualityBadge
                      type="bias"
                      value={analysis.bias_risk}
                      size="sm"
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm">{analysis.bias_summary}</p>

                  {/* Bias Domains */}
                  {Object.entries(analysis.bias_domains).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Avaliação por Domínio
                      </span>
                      <div className="grid gap-1">
                        {Object.entries(analysis.bias_domains).map(
                          ([key, item]) => (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 cursor-help">
                                  <span className="capitalize">
                                    {key.replace(/_/g, " ")}
                                  </span>
                                  <QualityBadge
                                    type="bias"
                                    value={item.risk}
                                    size="sm"
                                    showIcon={false}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>{item.justification}</p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Evidence Certainty Section (GRADE) */}
          <Collapsible
            open={expandedSections.has("evidence")}
            onOpenChange={() => toggleSection("evidence")}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedSections.has("evidence") ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <Scale className="h-4 w-4" />
                      <CardTitle className="text-sm">
                        Certeza da Evidência (GRADE)
                      </CardTitle>
                    </div>
                    <QualityBadge
                      type="evidence"
                      value={analysis.evidence_certainty}
                      size="sm"
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm">{analysis.evidence_summary}</p>

                  {/* GRADE Factors */}
                  {Object.entries(analysis.grade_factors).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Fatores GRADE
                      </span>
                      <div className="grid gap-1">
                        {Object.entries(analysis.grade_factors).map(
                          ([key, item]) => (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 cursor-help">
                                  <span className="capitalize">
                                    {key.replace(/_/g, " ")}
                                  </span>
                                  <Badge
                                    variant={
                                      item.concern === "none"
                                        ? "secondary"
                                        : item.concern === "serious"
                                        ? "destructive"
                                        : "outline"
                                    }
                                    className="text-[10px]"
                                  >
                                    {item.concern === "none"
                                      ? "OK"
                                      : item.concern === "serious"
                                      ? "Sério"
                                      : "Muito Sério"}
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>{item.justification}</p>
                              </TooltipContent>
                            </Tooltip>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Applicability Section */}
          <Collapsible
            open={expandedSections.has("applicability")}
            onOpenChange={() => toggleSection("applicability")}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedSections.has("applicability") ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <User className="h-4 w-4" />
                      <CardTitle className="text-sm">
                        Aplicabilidade ao Paciente
                      </CardTitle>
                    </div>
                    <QualityBadge
                      type="applicability"
                      value={analysis.applicability}
                      size="sm"
                    />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm">{analysis.applicability_summary}</p>

                  {/* Applicability Factors */}
                  <div className="grid gap-2">
                    {analysis.applicability_factors.population && (
                      <div className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                        <span>Similaridade da População</span>
                        <QualityBadge
                          type="applicability"
                          value={analysis.applicability_factors.population.score || "low"}
                          size="sm"
                          showIcon={false}
                        />
                      </div>
                    )}
                    {analysis.applicability_factors.intervention && (
                      <div className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                        <span>Aplicabilidade da Intervenção</span>
                        <QualityBadge
                          type="applicability"
                          value={analysis.applicability_factors.intervention.score || "low"}
                          size="sm"
                          showIcon={false}
                        />
                      </div>
                    )}
                    {analysis.applicability_factors.setting && (
                      <div className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                        <span>Similaridade do Contexto</span>
                        <QualityBadge
                          type="applicability"
                          value={analysis.applicability_factors.setting.score || "low"}
                          size="sm"
                          showIcon={false}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Disclaimer */}
          <div className="bg-muted/50 border rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-xs">Suporte à Decisão Clínica</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Esta análise foi gerada automaticamente e não substitui o
                  julgamento clínico. Verificação manual é recomendada para
                  decisões críticas.
                </p>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Análise em{" "}
              {(analysis.processing_duration_ms / 1000).toFixed(1)}s
            </div>
            <span>Modelo: {analysis.llm_model_used}</span>
          </div>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
};
