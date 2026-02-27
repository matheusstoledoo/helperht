import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, FileJson, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, subDays, subMonths } from "date-fns";

interface EvidenceAuditExportProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = "json" | "csv";
type DateRange = "7d" | "30d" | "90d" | "custom";

export const EvidenceAuditExport = ({ isOpen, onClose }: EvidenceAuditExportProps) => {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  const getDateRange = (): { startDate: string; endDate: string } => {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subMonths(now, 3);
        break;
      case "custom":
        return {
          startDate: customStartDate,
          endDate: customEndDate || now.toISOString(),
        };
      default:
        startDate = subDays(now, 30);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    };
  };

  const handleExport = async () => {
    setLoading(true);

    try {
      const { startDate, endDate } = getDateRange();

      const { data, error } = await supabase.functions.invoke("export-audit-report", {
        body: {
          startDate,
          endDate,
          format,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Create downloadable file
      const blob = new Blob(
        [format === "json" ? JSON.stringify(data, null, 2) : data],
        {
          type: format === "json" ? "application/json" : "text/csv",
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence-audit-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Relatório exportado", {
        description: `Arquivo ${format.toUpperCase()} baixado com sucesso`,
      });

      onClose();
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Erro ao exportar", {
        description: err instanceof Error ? err.message : "Falha ao gerar relatório",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Relatório de Auditoria
          </DialogTitle>
          <DialogDescription>
            Exporte o histórico de buscas de evidências para compliance e auditoria clínica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Formato do Arquivo</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === "csv" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setFormat("csv")}
              >
                <FileSpreadsheet className="h-4 w-4" />
                CSV
              </Button>
              <Button
                type="button"
                variant={format === "json" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => setFormat("json")}
              >
                <FileJson className="h-4 w-4" />
                JSON
              </Button>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {dateRange === "custom" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            O relatório incluirá: buscas realizadas, conceitos clínicos extraídos, artigos
            retornados, scores de relevância e eventos de auditoria.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Exportar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
