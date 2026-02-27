 import { 
   Route,
   MessageSquare,
   Activity,
   Scale,
   Heart,
   Brain,
   Gauge,
   FileText,
   AlertCircle
 } from "lucide-react";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { usePatientResponses, TrailResponse } from "@/hooks/usePatientTrails";
 import { format, formatDistanceToNow } from "date-fns";
 import { ptBR } from "date-fns/locale";
 
 interface PatientTrailResponsesTimelineProps {
   patientId: string;
   limit?: number;
 }
 
 const getResponseIcon = (type: string | null) => {
   switch (type) {
     case "glucose":
       return <Activity className="h-4 w-4" />;
     case "weight":
       return <Scale className="h-4 w-4" />;
     case "blood_pressure":
       return <Heart className="h-4 w-4" />;
     case "mood":
       return <Brain className="h-4 w-4" />;
     case "pain_scale":
       return <Gauge className="h-4 w-4" />;
     case "adherence":
       return <FileText className="h-4 w-4" />;
     default:
       return <MessageSquare className="h-4 w-4" />;
   }
 };
 
 const getStructuredDataLabel = (type: string | null): string => {
   switch (type) {
     case "glucose": return "Glicemia";
     case "weight": return "Peso";
     case "blood_pressure": return "Pressão Arterial";
     case "mood": return "Humor";
     case "pain_scale": return "Escala de Dor";
     case "adherence": return "Adesão ao Tratamento";
     case "custom_numeric": return "Dado Numérico";
     case "custom_text": return "Texto";
     default: return "Resposta";
   }
 };
 
 const formatResponseValue = (response: TrailResponse): string => {
   if (response.response_text) return response.response_text;
   if (response.response_numeric !== null) {
     const type = response.contact_point?.structured_data_type;
     switch (type) {
       case "glucose": return `${response.response_numeric} mg/dL`;
       case "weight": return `${response.response_numeric} kg`;
       case "pain_scale": return `${response.response_numeric}/10`;
       default: return String(response.response_numeric);
     }
   }
   if (response.response_choice) return response.response_choice;
   return "—";
 };
 
 export const PatientTrailResponsesTimeline = ({ 
   patientId,
   limit = 10
 }: PatientTrailResponsesTimelineProps) => {
   const { data: responses = [], isLoading } = usePatientResponses(patientId);
 
   const displayResponses = responses.slice(0, limit);
 
   if (isLoading) {
     return (
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2 text-lg">
             <Route className="h-5 w-5 text-primary" />
             Respostas de Trilhas
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
 
   if (responses.length === 0) {
     return null;
   }
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2 text-lg">
           <Route className="h-5 w-5 text-primary" />
           Dados de Trilhas de Acompanhamento
           <Badge variant="secondary">{responses.length} registros</Badge>
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="relative">
           {/* Timeline line */}
           <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
           
           <div className="space-y-4">
             {displayResponses.map((response, index) => (
               <div key={response.id} className="relative pl-10">
                 {/* Timeline dot */}
                 <div className={`absolute left-2 top-2 w-5 h-5 rounded-full flex items-center justify-center ${
                   response.is_critical 
                     ? "bg-destructive text-destructive-foreground" 
                     : "bg-primary/10 text-primary"
                 }`}>
                   {getResponseIcon(response.contact_point?.structured_data_type || null)}
                 </div>
 
                 <div className={`border rounded-lg p-3 ${response.is_critical ? "border-destructive/50 bg-destructive/5" : ""}`}>
                   <div className="flex items-start justify-between gap-2">
                     <div>
                       <div className="flex items-center gap-2">
                         <p className="font-medium text-sm">
                           {response.contact_point?.title || "Resposta"}
                         </p>
                         {response.is_critical && (
                           <Badge variant="destructive" className="text-xs">
                             <AlertCircle className="h-3 w-3 mr-1" />
                             Crítico
                           </Badge>
                         )}
                       </div>
                       {response.trail && (
                         <p className="text-xs text-muted-foreground">
                           Trilha: {response.trail.name}
                         </p>
                       )}
                     </div>
                     <div className="text-right">
                       <p className="text-xs text-muted-foreground">
                         {formatDistanceToNow(new Date(response.responded_at), { addSuffix: true, locale: ptBR })}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {format(new Date(response.responded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                       </p>
                     </div>
                   </div>
 
                   <div className="mt-2 flex items-center gap-2">
                     <Badge variant="outline" className="text-xs">
                       {getStructuredDataLabel(response.contact_point?.structured_data_type || null)}
                     </Badge>
                     <span className="text-sm font-medium">
                       {formatResponseValue(response)}
                     </span>
                   </div>
 
                   {response.critical_keyword_matched && (
                     <p className="mt-2 text-xs text-destructive">
                       Palavra-chave crítica detectada: "{response.critical_keyword_matched}"
                     </p>
                   )}
                 </div>
               </div>
             ))}
           </div>
 
           {responses.length > limit && (
             <p className="text-center text-sm text-muted-foreground mt-4 pl-10">
               +{responses.length - limit} registros anteriores
             </p>
           )}
         </div>
       </CardContent>
     </Card>
   );
 };