import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  BookOpen,
  Loader2,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileText,
  Pill,
  AlertCircle,
  Users,
  Calendar,
  Scale,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEvidenceSearch } from "@/hooks/_archived/useEvidenceSearch";
import { useEvidenceQualityAnalysis } from "@/hooks/_archived/useEvidenceQualityAnalysis";
import { EvidenceQualityPanel } from "./EvidenceQualityPanel";

interface EvidenceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
}

interface PatientDiagnosis {
  id: string;
  name: string;
  icd_code: string | null;
  status: string;
}

interface PatientTreatment {
  id: string;
  name: string;
  dosage: string | null;
  status: string;
}

const studyTypeLabels: Record<string, { label: string; color: string }> = {
  guideline: { label: "Guideline", color: "bg-purple-500" },
  meta_analysis: { label: "Meta-análise", color: "bg-blue-600" },
  systematic_review: { label: "Revisão Sistemática", color: "bg-blue-500" },
  randomized_controlled_trial: { label: "Ensaio Clínico Randomizado", color: "bg-green-500" },
  cohort_study: { label: "Estudo de Coorte", color: "bg-yellow-500" },
  case_control: { label: "Caso-Controle", color: "bg-orange-500" },
  case_report: { label: "Relato de Caso", color: "bg-gray-500" },
  expert_opinion: { label: "Opinião de Especialista", color: "bg-gray-400" },
  other: { label: "Outro", color: "bg-gray-300" },
};

export const EvidenceSearchModal = ({
  isOpen,
  onClose,
  patientId,
  patientName,
}: EvidenceSearchModalProps) => {
  const [diagnoses, setDiagnoses] = useState<PatientDiagnosis[]>([]);
  const [treatments, setTreatments] = useState<PatientTreatment[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [loadingPatientData, setLoadingPatientData] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [selectedResultForAnalysis, setSelectedResultForAnalysis] = useState<{
    id: string;
    title: string;
    pubmedId: string;
    dbId?: string;
  } | null>(null);
  const [evaluatingIndividual, setEvaluatingIndividual] = useState<string | null>(null);
  const [individualEvaluation, setIndividualEvaluation] = useState<Record<string, string>>({});
  const [evaluatingAll, setEvaluatingAll] = useState(false);
  const [allStudiesEvaluation, setAllStudiesEvaluation] = useState<string | null>(null);

  const { searchEvidence, loading, results, error } = useEvidenceSearch();
  const {
    analyzeEvidence,
    loading: analysisLoading,
    analysis,
    clearAnalysis,
  } = useEvidenceQualityAnalysis();

  // Fetch patient data when modal opens
  useEffect(() => {
    if (isOpen && patientId) {
      fetchPatientData();
    }
  }, [isOpen, patientId]);

  const fetchPatientData = async () => {
    setLoadingPatientData(true);
    try {
      const [diagnosesRes, treatmentsRes] = await Promise.all([
        supabase
          .from("diagnoses")
          .select("id, name, icd_code, status")
          .eq("patient_id", patientId)
          .eq("status", "active"),
        supabase
          .from("treatments")
          .select("id, name, dosage, status")
          .eq("patient_id", patientId)
          .eq("status", "active"),
      ]);

      setDiagnoses(diagnosesRes.data || []);
      setTreatments(treatmentsRes.data || []);
    } catch (err) {
      console.error("Error fetching patient data:", err);
    } finally {
      setLoadingPatientData(false);
    }
  };

  const handleSearch = async () => {
    await searchEvidence({
      patientId,
      diagnoses: diagnoses.map((d) => ({
        id: d.id,
        name: d.name,
        icd_code: d.icd_code || undefined,
        status: d.status,
      })),
      treatments: treatments.map((t) => ({
        id: t.id,
        name: t.name,
        dosage: t.dosage || undefined,
        status: t.status,
      })),
      freeText: additionalContext || undefined,
    });
  };

  const toggleResultExpanded = (id: string) => {
    setExpandedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 40) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleOpenAnalysis = async (result: { id: string; title: string; pubmedId: string }) => {
    clearAnalysis();
    
    // Fetch the database ID when opening the analysis panel
    const { data: evidenceResult } = await supabase
      .from("evidence_results")
      .select("id")
      .eq("pubmed_id", result.pubmedId)
      .eq("search_id", results?.searchId || "")
      .single();
    
    setSelectedResultForAnalysis({
      ...result,
      dbId: evidenceResult?.id,
    });
  };

  const handleCloseAnalysis = () => {
    setSelectedResultForAnalysis(null);
    clearAnalysis();
  };

  const handleRunAnalysis = async () => {
    if (!selectedResultForAnalysis?.dbId) {
      console.error("Evidence result database ID not found");
      return;
    }

    await analyzeEvidence(selectedResultForAnalysis.dbId, patientId, {
      id: patientId,
      diagnoses: diagnoses.map((d) => ({ name: d.name, icd_code: d.icd_code || undefined })),
      treatments: treatments.map((t) => ({ name: t.name, dosage: t.dosage || undefined })),
    });
  };

  const handleEvaluateIndividualStudy = async (pubmedId: string, title: string, clinicalSummary: string) => {
    setEvaluatingIndividual(pubmedId);
    try {
      const patientContext = `Paciente com: ${diagnoses.map(d => d.name).join(", ")}. Tratamentos: ${treatments.map(t => t.name).join(", ")}.`;
      
      const { data, error } = await supabase.functions.invoke("evaluate-study-relevance", {
        body: {
          studyTitle: title,
          studyClinicalSummary: clinicalSummary,
          patientContext,
          patientId,
        },
      });

      if (error) throw error;
      
      setIndividualEvaluation(prev => ({
        ...prev,
        [pubmedId]: data.evaluation,
      }));
    } catch (err) {
      console.error("Error evaluating study:", err);
    } finally {
      setEvaluatingIndividual(null);
    }
  };

  const handleEvaluateAllStudies = async () => {
    if (!results?.results.length) return;
    
    setEvaluatingAll(true);
    try {
      const patientContext = `Paciente com diagnósticos: ${diagnoses.map(d => d.name).join(", ")}. Tratamentos ativos: ${treatments.map(t => `${t.name}${t.dosage ? ` (${t.dosage})` : ""}`).join(", ")}.`;
      
      const studiesSummary = results.results.map((r, i) => 
        `${i + 1}. "${r.title}" (${studyTypeLabels[r.study_type]?.label || r.study_type}) - ${r.clinical_summary || "Sem resumo"}`
      ).join("\n");

      const { data, error } = await supabase.functions.invoke("evaluate-study-relevance", {
        body: {
          allStudies: studiesSummary,
          patientContext,
          patientId,
          isCollective: true,
        },
      });

      if (error) throw error;
      
      setAllStudiesEvaluation(data.evaluation);
    } catch (err) {
      console.error("Error evaluating all studies:", err);
    } finally {
      setEvaluatingAll(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Evidência Científica Contextualizada
          </DialogTitle>
          <DialogDescription>
            Busca de literatura científica relevante para o caso clínico de{" "}
            <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Buscar</TabsTrigger>
            <TabsTrigger value="results" disabled={!results}>
              Resultados {results && `(${results.totalResults})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="flex-1 overflow-auto mt-4">
            <div className="space-y-6">
              {/* Patient Context */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Diagnósticos Ativos
                  </Label>
                  {loadingPatientData ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    </div>
                  ) : diagnoses.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {diagnoses.map((d) => (
                        <Badge key={d.id} variant="secondary">
                          {d.name}
                          {d.icd_code && (
                            <span className="ml-1 text-xs opacity-70">({d.icd_code})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      Nenhum diagnóstico ativo registrado
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Pill className="h-4 w-4" />
                    Tratamentos Ativos
                  </Label>
                  {loadingPatientData ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Carregando...</span>
                    </div>
                  ) : treatments.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {treatments.map((t) => (
                        <Badge key={t.id} variant="outline">
                          {t.name}
                          {t.dosage && (
                            <span className="ml-1 text-xs opacity-70">({t.dosage})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      Nenhum tratamento ativo registrado
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Additional Context */}
              <div className="space-y-2">
                <Label htmlFor="context" className="text-base font-semibold">
                  Contexto Adicional (opcional)
                </Label>
                <Textarea
                  id="context"
                  placeholder="Adicione informações relevantes como sintomas específicos, hipóteses diagnósticas, dúvidas clínicas..."
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Essas informações serão usadas para refinar a busca e encontrar evidências mais
                  relevantes para este caso específico.
                </p>
              </div>

              {/* Disclaimer */}
              <div className="bg-muted/50 border rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Suporte à Decisão Clínica</p>
                    <p className="text-xs text-muted-foreground">
                      Este módulo fornece evidências científicas para suporte à decisão. Não
                      substitui o julgamento clínico do profissional de saúde. Todas as buscas
                      são registradas para fins de auditoria.
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleSearch}
                disabled={loading || (diagnoses.length === 0 && treatments.length === 0 && !additionalContext)}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando evidências...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar Evidências Científicas
                  </>
                )}
              </Button>

              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
                  {error}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="results" className="flex-1 min-h-0 mt-4">
            {results && (
              <ScrollArea className="h-full"  style={{ maxHeight: "calc(90vh - 180px)" }}>
                <div className="space-y-6">
                  {/* PICO Query Info */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Query PICO Gerada</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">P (Paciente):</span>{" "}
                          <span className="text-muted-foreground">{results.pico.patient}</span>
                        </div>
                        <div>
                          <span className="font-medium">I (Intervenção):</span>{" "}
                          <span className="text-muted-foreground">{results.pico.intervention}</span>
                        </div>
                        <div>
                          <span className="font-medium">C (Comparação):</span>{" "}
                          <span className="text-muted-foreground">
                            {results.pico.comparison || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">O (Desfecho):</span>{" "}
                          <span className="text-muted-foreground">{results.pico.outcome}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Extracted Concepts */}
                  {results.concepts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Conceitos Clínicos Identificados</h4>
                      <div className="flex flex-wrap gap-1">
                        {results.concepts.map((c, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs"
                            title={`Tipo: ${c.concept_type}, Confiança: ${(c.confidence_score * 100).toFixed(0)}%`}
                          >
                            {c.normalized_term}
                            {c.mesh_term && (
                              <span className="ml-1 opacity-60">[{c.mesh_term}]</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Collective Evaluation Button */}
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={handleEvaluateAllStudies}
                      disabled={evaluatingAll || !results.results.length}
                    >
                      {evaluatingAll ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Lightbulb className="h-4 w-4" />
                      )}
                      Avaliar Todos os Estudos para este Paciente
                    </Button>
                  </div>

                  {/* All Studies Evaluation Result */}
                  {allStudiesEvaluation && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-primary" />
                          Síntese das Evidências para o Paciente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2">
                        <p className="text-sm whitespace-pre-line">{allStudiesEvaluation}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Results */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        Evidências Encontradas ({results.totalResults})
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        Tempo: {(results.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>

                    {results.results.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma evidência encontrada para os critérios especificados.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {results.results.map((result, index) => (
                          <Collapsible
                            key={result.pubmed_id}
                            open={expandedResults.has(result.pubmed_id)}
                            onOpenChange={() => toggleResultExpanded(result.pubmed_id)}
                          >
                            <Card className="overflow-hidden">
                              <CollapsibleTrigger className="w-full text-left">
                                <CardHeader className="py-3 hover:bg-muted/50 transition-colors">
                                  <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-xs text-muted-foreground">#{index + 1}</span>
                                      <div
                                        className={`text-lg font-bold ${getRelevanceColor(
                                          result.relevance_score
                                        )}`}
                                      >
                                        {result.relevance_score}
                                      </div>
                                      <span className="text-[10px] text-muted-foreground">
                                        relevância
                                      </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start gap-2">
                                        <CardTitle className="text-sm leading-tight line-clamp-2">
                                          {result.title}
                                        </CardTitle>
                                        {expandedResults.has(result.pubmed_id) ? (
                                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <Badge
                                          className={`${
                                            studyTypeLabels[result.study_type]?.color || "bg-gray-400"
                                          } text-white text-[10px]`}
                                        >
                                          {studyTypeLabels[result.study_type]?.label || result.study_type}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {result.authors.slice(0, 2).join(", ")}
                                          {result.authors.length > 2 && " et al."}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {result.publication_date?.split("-")[0] || "N/A"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                              </CollapsibleTrigger>

                              <CollapsibleContent>
                                <CardContent className="pt-0 pb-4 space-y-4">
                                  <Separator />

                                  {result.clinical_summary && (
                                    <div>
                                      <h5 className="text-xs font-medium text-muted-foreground mb-1">
                                        Resumo Clínico
                                      </h5>
                                      <p className="text-sm">{result.clinical_summary}</p>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-4">
                                    <span className="text-xs text-muted-foreground">
                                      Journal: {result.journal}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      PMID: {result.pubmed_id}
                                    </span>
                                  </div>

                                  {/* Individual Study Evaluation */}
                                  {individualEvaluation[result.pubmed_id] && (
                                    <div className="bg-accent/50 rounded-lg p-3 mt-2">
                                      <h5 className="text-xs font-medium flex items-center gap-1 mb-1">
                                        <Sparkles className="h-3 w-3 text-primary" />
                                        Relevância para o Paciente
                                      </h5>
                                      <p className="text-sm whitespace-pre-line">
                                        {individualEvaluation[result.pubmed_id]}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => window.open(result.source_url, "_blank")}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                      Ver no PubMed
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() => handleEvaluateIndividualStudy(
                                        result.pubmed_id,
                                        result.title,
                                        result.clinical_summary || ""
                                      )}
                                      disabled={evaluatingIndividual === result.pubmed_id}
                                    >
                                      {evaluatingIndividual === result.pubmed_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Sparkles className="h-4 w-4" />
                                      )}
                                      Avaliar Conexão com Paciente
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="gap-2"
                                      onClick={() =>
                                        handleOpenAnalysis({
                                          id: result.pubmed_id,
                                          title: result.title,
                                          pubmedId: result.pubmed_id,
                                        })
                                      }
                                    >
                                      <Scale className="h-4 w-4" />
                                      Analisar Qualidade
                                    </Button>
                                  </div>
                                </CardContent>
                              </CollapsibleContent>
                            </Card>
                          </Collapsible>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Quality Analysis Sheet */}
      <Sheet open={!!selectedResultForAnalysis} onOpenChange={(open) => !open && handleCloseAnalysis()}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Análise de Qualidade
            </SheetTitle>
            <SheetDescription className="line-clamp-2">
              {selectedResultForAnalysis?.title}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <EvidenceQualityPanel
              analysis={analysis}
              loading={analysisLoading}
              onAnalyze={handleRunAnalysis}
              articleTitle={selectedResultForAnalysis?.title || ""}
            />
          </div>
        </SheetContent>
      </Sheet>
    </Dialog>
  );
};
