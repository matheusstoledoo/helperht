import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Route, 
  Plus, 
  ChevronRight, 
  Clock, 
  AlertCircle,
  Eye,
  EyeOff,
  Play,
  Pause,
  CheckCircle2,
  Activity,
  Heart,
  Brain,
  Bone,
  Pill,
  Stethoscope,
 Bell,
 MoreVertical,
 X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { usePatientEnrollments, useTrailAlerts } from "@/hooks/usePatientTrails";
import { usePauseTrailEnrollment, useExitTrailEnrollment } from "@/hooks/useCareTrails";
import { EnrollPatientModal } from "./EnrollPatientModal";
import { TrailAlertsPanel } from "./TrailAlertsPanel";
import { TrailDetailView } from "./TrailDetailView";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
 
 interface PatientTrailsSectionProps {
   patientId: string;
   patientName: string;
 }
 
 const getTrailIcon = (icon: string | null, specialty: string | null) => {
   const iconClass = "w-5 h-5";
   
   if (icon === "heart" || specialty?.toLowerCase().includes("cardio")) {
     return <Heart className={iconClass} />;
   }
   if (icon === "brain" || specialty?.toLowerCase().includes("neuro") || specialty?.toLowerCase().includes("psico")) {
     return <Brain className={iconClass} />;
   }
   if (icon === "bone" || specialty?.toLowerCase().includes("fisio") || specialty?.toLowerCase().includes("ortop")) {
     return <Bone className={iconClass} />;
   }
   if (icon === "pill" || specialty?.toLowerCase().includes("nutri")) {
     return <Pill className={iconClass} />;
   }
  if (icon === "stethoscope" || specialty?.toLowerCase().includes("odonto") || specialty?.toLowerCase().includes("clínica")) {
     return <Stethoscope className={iconClass} />;
   }
   if (icon === "activity") {
     return <Activity className={iconClass} />;
   }
   return <Route className={iconClass} />;
 };
 
 const getStatusBadge = (status: string) => {
   switch (status) {
     case "active":
      return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"><Play className="h-3 w-3 mr-1" />Ativa</Badge>;
     case "paused":
      return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"><Pause className="h-3 w-3 mr-1" />Pausada</Badge>;
     case "completed":
      return <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Concluída</Badge>;
     case "exited":
       return <Badge variant="outline">Encerrada</Badge>;
     default:
       return null;
   }
 };
 
 export const PatientTrailsSection = ({ patientId, patientName }: PatientTrailsSectionProps) => {
   const navigate = useNavigate();
   const { user } = useAuth();
   const [enrollModalOpen, setEnrollModalOpen] = useState(false);
   const [alertsPanelOpen, setAlertsPanelOpen] = useState(false);
   const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
   
   const { data: enrollments = [], isLoading } = usePatientEnrollments(patientId);
   const { data: alerts = [] } = useTrailAlerts(patientId);
  const pauseEnrollment = usePauseTrailEnrollment();
  const exitEnrollment = useExitTrailEnrollment();
   
   const currentUserId = user?.id;
   const unreadAlerts = alerts.filter(a => !a.is_read);
   
   const activeEnrollments = enrollments.filter(e => e.status === "active" || e.status === "paused");
   const completedEnrollments = enrollments.filter(e => e.status === "completed" || e.status === "exited");
 
  const handlePauseToggle = async (e: React.MouseEvent, enrollmentId: string, currentlyPaused: boolean) => {
    e.stopPropagation();
    await pauseEnrollment.mutateAsync({ enrollmentId, pause: !currentlyPaused });
  };

  const handleExit = async (e: React.MouseEvent, enrollmentId: string) => {
    e.stopPropagation();
    if (confirm("Tem certeza que deseja remover este paciente da trilha?")) {
      await exitEnrollment.mutateAsync({ enrollmentId });
    }
  };

   if (isLoading) {
     return (
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2 text-lg">
             <Route className="h-5 w-5 text-primary" />
             Trilhas de Acompanhamento
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="animate-pulse space-y-3">
             <div className="h-16 bg-muted rounded-lg" />
             <div className="h-16 bg-muted rounded-lg" />
           </div>
         </CardContent>
       </Card>
     );
   }
 
   // If a trail is selected, show detail view
   if (selectedEnrollment) {
     const trail = selectedEnrollment.trail;
     return (
       <TrailDetailView
         enrollmentId={selectedEnrollment.id}
         trailId={selectedEnrollment.trail_id || trail?.id || ""}
         trailName={trail?.name || "Trilha"}
         trailDescription={trail?.description}
         currentDay={selectedEnrollment.current_day}
         durationDays={trail?.duration_days || 0}
         status={selectedEnrollment.status}
         startedAt={selectedEnrollment.started_at}
         completedAt={selectedEnrollment.completed_at}
         onBack={() => setSelectedEnrollment(null)}
       />
     );
   }

   const renderEnrollmentRow = (enrollment: any, showActions: boolean) => {
     const isOwner = enrollment.enrolled_by === currentUserId;
     const trail = enrollment.trail;

     return (
       <div 
         key={enrollment.id}
         className={`border rounded-lg p-4 ${isOwner ? 'hover:bg-accent/50 cursor-pointer' : 'opacity-75'}`}
         onClick={() => isOwner && setSelectedEnrollment(enrollment)}
       >
         <div className="flex items-start justify-between">
           <div className="flex items-start gap-3">
             <div className={`p-2 rounded-lg ${isOwner ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
               {getTrailIcon(trail?.icon || null, trail?.specialty || null)}
             </div>
             <div>
               <div className="flex items-center gap-2">
                 <h4 className="font-medium">{trail?.name || "Trilha"}</h4>
                 {getStatusBadge(enrollment.status)}
                 {!isOwner && (
                   <Badge variant="outline" className="text-xs">
                     <EyeOff className="h-3 w-3 mr-1" />
                     Outro profissional
                   </Badge>
                 )}
               </div>
               {trail?.specialty && (
                 <p className="text-sm text-muted-foreground">{trail.specialty}</p>
               )}
               <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                 <span className="flex items-center gap-1">
                   <Clock className="h-3 w-3" />
                   Dia {enrollment.current_day} de {trail?.duration_days || "?"}
                 </span>
                 <span>
                   Iniciada {formatDistanceToNow(new Date(enrollment.started_at), { addSuffix: true, locale: ptBR })}
                 </span>
               </div>
               {!isOwner && trail?.description && (
                 <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{trail.description}</p>
               )}
             </div>
           </div>
           {isOwner && showActions && (
             <div className="flex items-center gap-1">
               <DropdownMenu>
                 <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                   <Button variant="ghost" size="icon" className="h-8 w-8">
                     <MoreVertical className="h-4 w-4" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                   <DropdownMenuItem onClick={(e) => handlePauseToggle(e, enrollment.id, enrollment.status === "paused")}>
                     {enrollment.status === "paused" ? (
                       <><Play className="mr-2 h-4 w-4" />Reativar Trilha</>
                     ) : (
                       <><Pause className="mr-2 h-4 w-4" />Pausar Trilha</>
                     )}
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem 
                     onClick={(e) => handleExit(e, enrollment.id)}
                     className="text-destructive focus:text-destructive"
                   >
                     <X className="mr-2 h-4 w-4" />
                     Encerrar Trilha
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
               <ChevronRight className="h-4 w-4 text-muted-foreground" />
             </div>
           )}
         </div>
         {isOwner && showActions && enrollment.pending_alerts_count > 0 && (
           <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-orange-600">
             <AlertCircle className="h-4 w-4" />
             {enrollment.pending_alerts_count} alertas pendentes
           </div>
         )}
       </div>
     );
   };

   return (
     <>
       <Card>
         <CardHeader>
           <div className="flex items-center justify-between">
             <CardTitle className="flex items-center gap-2 text-lg">
               <Route className="h-5 w-5 text-primary" />
               Trilhas de Acompanhamento
               {activeEnrollments.length > 0 && (
                 <Badge variant="secondary">{activeEnrollments.length} ativas</Badge>
               )}
             </CardTitle>
             <div className="flex items-center gap-2">
               {unreadAlerts.length > 0 && (
                 <Button 
                   variant="outline" 
                   size="sm"
                   onClick={() => setAlertsPanelOpen(true)}
                   className="relative"
                 >
                   <Bell className="h-4 w-4 mr-1" />
                   Alertas
                   <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                     {unreadAlerts.length}
                   </span>
                 </Button>
               )}
               <Button 
                 size="sm"
                 onClick={() => setEnrollModalOpen(true)}
               >
                 <Plus className="h-4 w-4 mr-1" />
                 Inscrever em Trilha
               </Button>
             </div>
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           {enrollments.length === 0 ? (
             <div className="text-center py-6 text-muted-foreground">
               <Route className="h-10 w-10 mx-auto mb-3 opacity-50" />
               <p>Nenhuma trilha ativa para este paciente</p>
               <Button 
                 variant="outline" 
                 className="mt-3"
                 onClick={() => setEnrollModalOpen(true)}
               >
                 <Plus className="h-4 w-4 mr-1" />
                 Inscrever em uma Trilha
               </Button>
             </div>
           ) : (
             <Tabs defaultValue="active">
               <TabsList>
                 <TabsTrigger value="active">
                   Atuais {activeEnrollments.length > 0 && `(${activeEnrollments.length})`}
                 </TabsTrigger>
                 <TabsTrigger value="past">
                   Anteriores {completedEnrollments.length > 0 && `(${completedEnrollments.length})`}
                 </TabsTrigger>
               </TabsList>
               <TabsContent value="active" className="mt-3 space-y-3">
                 {activeEnrollments.length === 0 ? (
                   <p className="text-sm text-muted-foreground text-center py-4">Nenhuma trilha ativa.</p>
                 ) : (
                   activeEnrollments.map(enrollment => renderEnrollmentRow(enrollment, true))
                 )}
               </TabsContent>
               <TabsContent value="past" className="mt-3 space-y-3">
                 {completedEnrollments.length === 0 ? (
                   <p className="text-sm text-muted-foreground text-center py-4">Nenhuma trilha concluída.</p>
                 ) : (
                   completedEnrollments.map(enrollment => renderEnrollmentRow(enrollment, false))
                 )}
               </TabsContent>
             </Tabs>
           )}
         </CardContent>
       </Card>
 
       <EnrollPatientModal
         open={enrollModalOpen}
         onOpenChange={setEnrollModalOpen}
         patientId={patientId}
         patientName={patientName}
       />
 
       <TrailAlertsPanel
         open={alertsPanelOpen}
         onOpenChange={setAlertsPanelOpen}
         alerts={alerts}
         patientId={patientId}
       />
     </>
   );
 };