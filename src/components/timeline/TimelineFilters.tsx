import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { EventType } from "./TimelineCard";

interface TimelineFiltersProps {
  selectedType: EventType | "all";
  onTypeChange: (type: EventType | "all") => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

export const TimelineFilters = ({
  selectedType,
  onTypeChange,
  dateRange,
  onDateRangeChange,
}: TimelineFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select value={selectedType} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Filtrar por tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Eventos</SelectItem>
          <SelectItem value="consultation">Consultas</SelectItem>
          <SelectItem value="diagnosis_new">Novos Diagnósticos</SelectItem>
          <SelectItem value="diagnosis_update">Atualizações de Diagnóstico</SelectItem>
          <SelectItem value="treatment_start">Tratamento Iniciado</SelectItem>
          <SelectItem value="treatment_modify">Tratamento Modificado</SelectItem>
          <SelectItem value="exam_request">Solicitações de Exame</SelectItem>
          <SelectItem value="exam_result">Resultados de Exame</SelectItem>
          <SelectItem value="document_upload">Documentos</SelectItem>
        </SelectContent>
      </Select>

      <Select value={dateRange} onValueChange={onDateRangeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <Calendar className="w-4 h-4 mr-2" />
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo o Período</SelectItem>
          <SelectItem value="week">Últimos 7 Dias</SelectItem>
          <SelectItem value="month">Últimos 30 Dias</SelectItem>
          <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
          <SelectItem value="year">Último Ano</SelectItem>
        </SelectContent>
      </Select>

      <Button variant="outline" className="w-full sm:w-auto">
        <Calendar className="w-4 h-4 mr-2" />
        Período Personalizado
      </Button>
    </div>
  );
};
