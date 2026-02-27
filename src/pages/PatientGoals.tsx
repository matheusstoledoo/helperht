 import { useState, useEffect, useCallback, useMemo } from "react";
 import { FullPageLoading } from "@/components/ui/loading-spinner";
 import { useParams, useNavigate, Link } from "react-router-dom";
 import { useAuth } from "@/contexts/AuthContext";
 import { useUserRole } from "@/hooks/useUserRole";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
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
 import { useToast } from "@/hooks/use-toast";
 import {
   Target,
   Calendar,
   ChevronDown,
   ChevronUp,
   UserCircle,
   Lock,
   Eye,
   Home,
   ArrowLeft,
   CheckCircle2,
   Clock,
   Flag,
 } from "lucide-react";
 import { format, subDays, subMonths, subYears, isAfter, parseISO } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 interface GoalData {
   id: string;
   title: string;
   description: string | null;
   category: string | null;
   priority: string | null;
   status: string;
   target_date: string | null;
   completed_date: string | null;
   progress: number | null;
   public_notes: string | null;
   private_notes: string | null;
   created_by: string | null;
   created_at: string;
   updated_at: string;
   consultation_id: string | null;
   professional_name?: string;
   professional_id?: string;
 }
 
 interface PatientData {
   id: string;
   users: {
     name: string;
   } | null;
 }
 
 interface Professional {
   id: string;
   name: string;
 }
 
 const mockProfessionals: Professional[] = [
   { id: "prof-1", name: "Dr. Carlos Mendes" },
   { id: "prof-2", name: "Dra. Ana Silva" },
   { id: "prof-3", name: "Dr. Roberto Almeida" },
 ];
 
 const mockGoals: GoalData[] = [
   {
     id: "goal-1",
     title: "Reduzir pressão arterial para níveis normais",
     description: "Manter pressão arterial abaixo de 130/80 mmHg por 3 meses consecutivos",
     category: "saúde",
     priority: "high",
     status: "active",
     target_date: "2025-03-20",
     completed_date: null,
     progress: 60,
     public_notes: "Acompanhar medições diárias. Manter dieta com baixo teor de sódio e praticar atividade física regular.",
     private_notes: "Paciente mostrou boa adesão inicial. Verificar exames na próxima consulta.",
     created_by: "prof-1",
     created_at: "2024-12-20T10:00:00Z",
     updated_at: "2024-12-20T10:00:00Z",
     consultation_id: "cons-1",
     professional_name: "Dr. Carlos Mendes",
     professional_id: "prof-1",
   },
   {
     id: "goal-2",
     title: "Controlar glicemia em jejum",
     description: "Manter glicemia de jejum entre 80-130 mg/dL",
     category: "saúde",
     priority: "high",
     status: "active",
     target_date: "2025-02-15",
     completed_date: null,
     progress: 45,
     public_notes: "Seguir dieta prescrita e tomar medicação conforme orientado. Monitorar glicemia 2x por semana.",
     private_notes: null,
     created_by: "prof-2",
     created_at: "2024-12-15T14:30:00Z",
     updated_at: "2024-12-15T14:30:00Z",
     consultation_id: "cons-2",
     professional_name: "Dra. Ana Silva",
     professional_id: "prof-2",
   },
   {
     id: "goal-3",
     title: "Praticar técnicas de relaxamento diariamente",
     description: "Realizar exercícios de respiração e mindfulness por pelo menos 15 minutos ao dia",
     category: "bem-estar",
     priority: "medium",
     status: "active",
     target_date: "2025-01-10",
     completed_date: null,
     progress: 70,
     public_notes: "Manter diário de prática. Utilizar aplicativo recomendado para guiar as sessões.",
     private_notes: "Paciente relata melhora nos sintomas de ansiedade.",
     created_by: "prof-3",
     created_at: "2024-12-10T09:00:00Z",
     updated_at: "2024-12-10T09:00:00Z",
     consultation_id: "cons-3",
     professional_name: "Dr. Roberto Almeida",
     professional_id: "prof-3",
   },
   {
     id: "goal-4",
     title: "Perder 5kg em 3 meses",
     description: "Reduzir peso através de reeducação alimentar e exercícios físicos",
     category: "estilo de vida",
     priority: "medium",
     status: "active",
     target_date: "2025-02-28",
     completed_date: null,
     progress: 30,
     public_notes: "Pesar-se semanalmente. Manter registro alimentar. Caminhar 30 min por dia.",
     private_notes: null,
     created_by: "prof-1",
     created_at: "2024-11-28T16:00:00Z",
     updated_at: "2024-11-28T16:00:00Z",
     consultation_id: "cons-4",
     professional_name: "Dr. Carlos Mendes",
     professional_id: "prof-1",
   },
   {
     id: "goal-5",
     title: "Parar de fumar completamente",
     description: "Cessar tabagismo de forma gradual com suporte medicamentoso",
     category: "estilo de vida",
     priority: "high",
     status: "completed",
     target_date: "2024-11-15",
     completed_date: "2024-11-10",
     progress: 100,
     public_notes: "Meta alcançada! Manter acompanhamento para evitar recaídas.",
     private_notes: "Excelente resultado. Paciente muito motivado.",
     created_by: "prof-2",
     created_at: "2024-10-15T11:00:00Z",
     updated_at: "2024-11-10T11:00:00Z",
     consultation_id: "cons-5",
     professional_name: "Dra. Ana Silva",
     professional_id: "prof-2",
   },
 ];
 
 const PatientGoals = () => {
   const { id } = useParams<{ id: string }>();
   const navigate = useNavigate();
   const { user, loading: authLoading } = useAuth();
   const { isProfessional, isAdmin, loading: roleLoading } = useUserRole();
   const { toast } = useToast();
 
   const [patient, setPatient] = useState<PatientData | null>(null);
   const [goals, setGoals] = useState<GoalData[]>([]);
   const [professionals, setProfessionals] = useState<Professional[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [useMockData, setUseMockData] = useState(false);
 
   const [professionalFilter, setProfessionalFilter] = useState("all");
   const [periodFilter, setPeriodFilter] = useState("all");
   const [statusFilter, setStatusFilter] = useState("all");
 
   const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
 
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
 
   const fetchGoalsData = useCallback(async () => {
     if (!id) return;
 
     setIsLoading(true);
     try {
       const { data: patientData } = await supabase
         .from("patients")
         .select("id, users (name)")
         .eq("id", id)
         .maybeSingle();
 
       setPatient(patientData);
 
       const { data: goalsData, error } = await supabase
         .from("goals")
         .select("*")
         .eq("patient_id", id)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
 
       if (!goalsData || goalsData.length === 0) {
         setUseMockData(true);
         setGoals(mockGoals);
         setProfessionals(mockProfessionals);
         setIsLoading(false);
         return;
       }
 
       const professionalIds = new Set<string>();
       (goalsData || []).forEach((g) => {
         if (g.created_by) {
           professionalIds.add(g.created_by);
         }
       });
 
       const professionalsMap: Record<string, string> = {};
       if (professionalIds.size > 0) {
         const { data: professionalsData } = await supabase
           .from("users")
           .select("id, name")
           .in("id", Array.from(professionalIds));
 
         (professionalsData || []).forEach((p) => {
           professionalsMap[p.id] = p.name;
         });
 
         setProfessionals(
           (professionalsData || []).map((p) => ({ id: p.id, name: p.name }))
         );
       }
 
       const goalsWithProfessional = (goalsData || []).map((g) => {
         const professionalId = g.created_by;
         const professionalName = professionalId
           ? professionalsMap[professionalId] || "Profissional não identificado"
           : "Profissional não identificado";
 
         return {
           ...g,
           professional_name: professionalName,
           professional_id: professionalId,
         };
       });
 
       setGoals(goalsWithProfessional);
     } catch (error) {
       console.error("Error fetching goals:", error);
       setUseMockData(true);
       setGoals(mockGoals);
       setProfessionals(mockProfessionals);
     } finally {
       setIsLoading(false);
     }
   }, [id]);
 
   useEffect(() => {
     if (user && (isProfessional || isAdmin)) {
       fetchGoalsData();
     }
   }, [user, isProfessional, isAdmin, fetchGoalsData]);
 
   const availableProfessionals = useMemo(() => {
     return useMockData ? mockProfessionals : professionals;
   }, [useMockData, professionals]);
 
   const filteredGoals = useMemo(() => {
     let filtered = [...goals];
 
     if (professionalFilter !== "all") {
       filtered = filtered.filter((g) => g.professional_id === professionalFilter);
     }
 
     if (statusFilter !== "all") {
       filtered = filtered.filter((g) => g.status === statusFilter);
     }
 
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
 
       filtered = filtered.filter((g) => isAfter(parseISO(g.created_at), cutoffDate));
     }
 
     return filtered;
   }, [goals, professionalFilter, periodFilter, statusFilter]);
 
   const toggleExpanded = (goalId: string) => {
     setExpandedCards((prev) => {
       const newSet = new Set(prev);
       if (newSet.has(goalId)) {
         newSet.delete(goalId);
       } else {
         newSet.add(goalId);
       }
       return newSet;
     });
   };
 
   const formatShortDate = (dateString: string) => {
     try {
       return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
     } catch {
       return dateString;
     }
   };
 
   const isOtherProfessional = (goal: GoalData) => {
     if (useMockData) {
       return goal.professional_id !== "prof-1";
     }
     return goal.professional_id && user && goal.professional_id !== user.id;
   };
 
   const getPriorityColor = (priority: string | null) => {
     switch (priority) {
       case "high":
         return "text-red-600 dark:text-red-400";
       case "medium":
         return "text-yellow-600 dark:text-yellow-400";
       case "low":
         return "text-green-600 dark:text-green-400";
       default:
         return "text-muted-foreground";
     }
   };
 
   const getPriorityLabel = (priority: string | null) => {
     switch (priority) {
       case "high":
         return "Alta";
       case "medium":
         return "Média";
       case "low":
         return "Baixa";
       default:
         return "Não definida";
     }
   };
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "active":
         return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">Em andamento</Badge>;
       case "completed":
         return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">Concluída</Badge>;
       case "paused":
         return <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">Pausada</Badge>;
       case "cancelled":
         return <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">Cancelada</Badge>;
       default:
         return <Badge variant="outline">{status}</Badge>;
     }
   };
 
   const basePath = `/prof/paciente/${id}`;
   const patientName = useMockData ? "Teste" : (patient?.users?.name || "Paciente");
 
   if (authLoading || roleLoading || isLoading) {
     return <FullPageLoading />;
   }
 
   return (
     <div className="min-h-screen bg-background">
       <header className="border-b bg-card px-6 py-4">
         <div className="flex items-center gap-4 mb-4">
           <Button 
             variant="ghost" 
             size="icon"
             onClick={() => navigate(basePath)}
           >
             <ArrowLeft className="h-5 w-5" />
           </Button>
           <Breadcrumb>
             <BreadcrumbList>
               <BreadcrumbItem>
                 <BreadcrumbLink asChild>
                   <Link to="/dashboard" className="flex items-center gap-1">
                     <Home className="h-4 w-4" />
                     Página inicial
                   </Link>
                 </BreadcrumbLink>
               </BreadcrumbItem>
               <BreadcrumbSeparator />
               <BreadcrumbItem>
                 <BreadcrumbLink asChild>
                   <Link to={basePath}>
                     {patientName}
                   </Link>
                 </BreadcrumbLink>
               </BreadcrumbItem>
               <BreadcrumbSeparator />
               <BreadcrumbItem>
                 <BreadcrumbPage>Metas e Objetivos</BreadcrumbPage>
               </BreadcrumbItem>
             </BreadcrumbList>
           </Breadcrumb>
         </div>
 
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h1 className="text-2xl font-bold text-foreground">Metas e Objetivos</h1>
             {useMockData && (
               <Badge variant="outline" className="text-xs">
                 Dados de exemplo
               </Badge>
             )}
           </div>
 
           <div className="flex flex-col sm:flex-row gap-3">
             <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
               <SelectTrigger className="w-full sm:w-[250px]">
                 <UserCircle className="w-4 h-4 mr-2" />
                 <SelectValue placeholder="Todos os profissionais" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos os profissionais</SelectItem>
                 {availableProfessionals.map((prof) => (
                   <SelectItem key={prof.id} value={prof.id}>
                     {prof.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
 
             <Select value={statusFilter} onValueChange={setStatusFilter}>
               <SelectTrigger className="w-full sm:w-[180px]">
                 <CheckCircle2 className="w-4 h-4 mr-2" />
                 <SelectValue placeholder="Status" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="all">Todos os status</SelectItem>
                 <SelectItem value="active">Em andamento</SelectItem>
                 <SelectItem value="completed">Concluídas</SelectItem>
                 <SelectItem value="paused">Pausadas</SelectItem>
                 <SelectItem value="cancelled">Canceladas</SelectItem>
               </SelectContent>
             </Select>
 
             <Select value={periodFilter} onValueChange={setPeriodFilter}>
               <SelectTrigger className="w-full sm:w-[180px]">
                 <Calendar className="w-4 h-4 mr-2" />
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
           </div>
         </div>
       </header>
 
       <main className="p-6">
         <div className="max-w-3xl mx-auto">
           {filteredGoals.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12">
               <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
               <p className="text-muted-foreground">Nenhuma meta encontrada.</p>
             </div>
           ) : (
             <div className="relative">
               <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
 
               <div className="space-y-6 pl-6">
                 {filteredGoals.map((goal, index) => {
                   const isExpanded = expandedCards.has(goal.id);
                   const otherProfessional = isOtherProfessional(goal);
 
                   return (
                     <div
                       key={goal.id}
                       className="relative animate-fade-in"
                       style={{ animationDelay: `${index * 0.05}s` }}
                     >
                       <div className="absolute left-0 top-6 w-3 h-3 rounded-full border-4 border-background bg-primary -translate-x-1/2" />
 
                       <Card className="ml-8 transition-shadow hover:shadow-md">
                         <CardContent className="p-5">
                           <div className="flex items-start justify-between gap-3">
                             <div className="flex items-start gap-3 flex-1">
                               <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 shrink-0">
                                 <Target className="h-5 w-5" />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 flex-wrap mb-1">
                                   <h3 className="font-semibold text-foreground">
                                     {goal.title}
                                   </h3>
                                   {getStatusBadge(goal.status)}
                                 </div>
                                 <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                   <span className="flex items-center gap-1">
                                     <Calendar className="h-3.5 w-3.5" />
                                     {formatShortDate(goal.created_at)}
                                   </span>
                                   {goal.target_date && (
                                     <span className="flex items-center gap-1">
                                       <Clock className="h-3.5 w-3.5" />
                                       Meta: {formatShortDate(goal.target_date)}
                                     </span>
                                   )}
                                   <span className={`flex items-center gap-1 ${getPriorityColor(goal.priority)}`}>
                                     <Flag className="h-3.5 w-3.5" />
                                     {getPriorityLabel(goal.priority)}
                                   </span>
                                 </div>
                                 {goal.description && (
                                   <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                     {goal.description}
                                   </p>
                                 )}
 
                               </div>
                             </div>
                             <Button
                               variant="ghost"
                               size="icon"
                               onClick={() => toggleExpanded(goal.id)}
                             >
                               {isExpanded ? (
                                 <ChevronUp className="h-4 w-4" />
                               ) : (
                                 <ChevronDown className="h-4 w-4" />
                               )}
                             </Button>
                           </div>
 
                           {isExpanded && (
                             <div className="mt-4 pt-4 border-t space-y-4">
                               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                 <UserCircle className="h-4 w-4" />
                                 <span>
                                   {otherProfessional ? (
                                     <span className="italic">{goal.professional_name}</span>
                                   ) : (
                                     "Você"
                                   )}
                                 </span>
                                 {goal.category && (
                                   <>
                                     <span>•</span>
                                     <Badge variant="outline" className="text-xs">
                                       {goal.category}
                                     </Badge>
                                   </>
                                 )}
                               </div>
 
                               {goal.public_notes && (
                                 <div className="space-y-2">
                                   <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                     <Eye className="h-4 w-4 text-primary" />
                                     Orientações para o paciente
                                   </div>
                                   <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                                     {goal.public_notes}
                                   </p>
                                 </div>
                               )}
 
                               {goal.private_notes && !otherProfessional && (
                                 <div className="space-y-2">
                                   <div className="flex items-center gap-2 text-sm font-medium text-orange-600 dark:text-orange-400">
                                     <Lock className="h-4 w-4" />
                                     Notas privadas
                                   </div>
                                   <p className="text-sm whitespace-pre-wrap bg-orange-500/5 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
                                     {goal.private_notes}
                                   </p>
                                 </div>
                               )}
 
                                {goal.completed_date && (
                                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Concluída em {formatShortDate(goal.completed_date)}</span>
                                  </div>
                                )}

                                {goal.status !== "completed" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
                                    onClick={async () => {
                                      const { error } = await supabase
                                        .from("goals")
                                        .update({ status: "completed", completed_date: new Date().toISOString().split("T")[0], progress: 100 })
                                        .eq("id", goal.id);
                                      if (!error) {
                                        toast({ title: "Meta concluída com sucesso!" });
                                        fetchGoalsData();
                                      } else {
                                        toast({ title: "Erro ao concluir meta", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Marcar como concluída
                                  </Button>
                                )}
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
   );
 };
 
 export default PatientGoals;