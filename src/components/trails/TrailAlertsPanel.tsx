 import { useState } from "react";
 import { 
   Bell,
   AlertCircle,
   AlertTriangle,
   Info,
   CheckCircle2,
   Clock,
   MessageSquare,
   X
 } from "lucide-react";
 import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
 } from "@/components/ui/sheet";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Textarea } from "@/components/ui/textarea";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { useMarkAlertAsRead, useResolveAlert, TrailAlert } from "@/hooks/usePatientTrails";
 import { formatDistanceToNow } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 interface TrailAlertsPanelProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   alerts: TrailAlert[];
   patientId: string;
 }
 
 const getSeverityIcon = (severity: string) => {
   switch (severity) {
     case "critical":
       return <AlertCircle className="h-4 w-4 text-destructive" />;
     case "high":
       return <AlertTriangle className="h-4 w-4 text-orange-500" />;
     case "medium":
       return <Info className="h-4 w-4 text-yellow-500" />;
     default:
       return <Info className="h-4 w-4 text-muted-foreground" />;
   }
 };
 
 const getSeverityBadge = (severity: string) => {
   switch (severity) {
     case "critical":
       return <Badge variant="destructive">Crítico</Badge>;
     case "high":
      return <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400">Alta</Badge>;
     case "medium":
      return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400">Média</Badge>;
     default:
       return <Badge variant="secondary">Baixa</Badge>;
   }
 };
 
 export const TrailAlertsPanel = ({
   open,
   onOpenChange,
   alerts,
   patientId,
 }: TrailAlertsPanelProps) => {
   const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
   const [resolutionNotes, setResolutionNotes] = useState("");
   
   const markAsRead = useMarkAlertAsRead();
   const resolveAlert = useResolveAlert();
 
   const unreadAlerts = alerts.filter(a => !a.is_read);
   const readAlerts = alerts.filter(a => a.is_read && !a.is_resolved);
   const resolvedAlerts = alerts.filter(a => a.is_resolved);
 
   const handleMarkAsRead = async (alertId: string) => {
     await markAsRead.mutateAsync({ alertId, patientId });
   };
 
   const handleResolve = async (alertId: string) => {
     await resolveAlert.mutateAsync({ 
       alertId, 
       patientId,
       resolutionNotes 
     });
     setResolvingAlertId(null);
     setResolutionNotes("");
   };
 
   const renderAlert = (alert: TrailAlert) => {
     const isResolving = resolvingAlertId === alert.id;
     
     return (
       <div 
         key={alert.id}
         className={`border rounded-lg p-4 space-y-3 ${
           !alert.is_read ? "bg-accent/30 border-primary/30" : ""
         }`}
       >
         <div className="flex items-start justify-between gap-2">
           <div className="flex items-start gap-2">
             {getSeverityIcon(alert.severity)}
             <div>
               <p className="font-medium text-sm">{alert.alert_message}</p>
               <div className="flex items-center gap-2 mt-1">
                 {getSeverityBadge(alert.severity)}
                 <span className="text-xs text-muted-foreground">
                   {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                 </span>
               </div>
             </div>
           </div>
           {!alert.is_resolved && (
             <div className="flex items-center gap-1">
               {!alert.is_read && (
                 <Button 
                   variant="ghost" 
                   size="icon"
                   className="h-7 w-7"
                   onClick={() => handleMarkAsRead(alert.id)}
                 >
                   <CheckCircle2 className="h-4 w-4" />
                 </Button>
               )}
             </div>
           )}
         </div>
 
         {/* Trail info */}
         {alert.trail_name && (
           <p className="text-xs text-muted-foreground">
             Trilha: {alert.trail_name}
           </p>
         )}
 
         {/* Response preview if applicable */}
         {alert.response_text && (
           <div className="bg-muted/50 rounded p-2">
             <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
               <MessageSquare className="h-3 w-3" />
               Resposta do paciente:
             </p>
             <p className="text-sm">{alert.response_text}</p>
           </div>
         )}
 
         {/* Resolve section */}
         {!alert.is_resolved && (
           <>
             {isResolving ? (
               <div className="space-y-2 pt-2 border-t">
                 <Textarea
                   placeholder="Notas sobre a resolução (opcional)..."
                   value={resolutionNotes}
                   onChange={(e) => setResolutionNotes(e.target.value)}
                   rows={2}
                 />
                 <div className="flex gap-2">
                   <Button 
                     size="sm"
                     onClick={() => handleResolve(alert.id)}
                     disabled={resolveAlert.isPending}
                   >
                     Confirmar Resolução
                   </Button>
                   <Button 
                     size="sm" 
                     variant="ghost"
                     onClick={() => {
                       setResolvingAlertId(null);
                       setResolutionNotes("");
                     }}
                   >
                     Cancelar
                   </Button>
                 </div>
               </div>
             ) : (
               <Button 
                 size="sm" 
                 variant="outline"
                 onClick={() => setResolvingAlertId(alert.id)}
               >
                 <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                 Marcar como Resolvido
               </Button>
             )}
           </>
         )}
 
         {/* Resolution info */}
         {alert.is_resolved && alert.resolution_notes && (
           <div className="text-xs text-muted-foreground pt-2 border-t">
             <p className="font-medium">Resolução:</p>
             <p>{alert.resolution_notes}</p>
           </div>
         )}
       </div>
     );
   };
 
   return (
     <Sheet open={open} onOpenChange={onOpenChange}>
       <SheetContent className="w-full sm:max-w-lg">
         <SheetHeader>
           <SheetTitle className="flex items-center gap-2">
             <Bell className="h-5 w-5 text-primary" />
             Alertas de Trilhas
             {unreadAlerts.length > 0 && (
               <Badge variant="destructive">{unreadAlerts.length} novos</Badge>
             )}
           </SheetTitle>
           <SheetDescription>
             Alertas e respostas importantes do paciente
           </SheetDescription>
         </SheetHeader>
 
         <ScrollArea className="h-[calc(100vh-150px)] mt-4">
           <div className="space-y-4">
             {alerts.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground">
                 <Bell className="h-10 w-10 mx-auto mb-3 opacity-50" />
                 <p>Nenhum alerta</p>
               </div>
             ) : (
               <>
                 {unreadAlerts.length > 0 && (
                   <div className="space-y-3">
                     <p className="text-sm font-medium text-muted-foreground">Não lidos</p>
                     {unreadAlerts.map(renderAlert)}
                   </div>
                 )}
                 
                 {readAlerts.length > 0 && (
                   <div className="space-y-3">
                     <p className="text-sm font-medium text-muted-foreground">Lidos</p>
                     {readAlerts.map(renderAlert)}
                   </div>
                 )}
 
                 {resolvedAlerts.length > 0 && (
                   <div className="space-y-3">
                     <p className="text-sm font-medium text-muted-foreground">Resolvidos</p>
                     {resolvedAlerts.slice(0, 5).map(renderAlert)}
                   </div>
                 )}
               </>
             )}
           </div>
         </ScrollArea>
       </SheetContent>
     </Sheet>
   );
 };