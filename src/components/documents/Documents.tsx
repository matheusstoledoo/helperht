import { useState, useEffect, useCallback } from "react";
import { Upload, Filter, FileText, FileImage, FileSpreadsheet, File, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DocumentCard } from "./DocumentCard";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export interface Document {
  id: string;
  patient_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  uploaded_by: string;
  uploaded_by_role: string;
  created_at: string;
}

interface DocumentsProps {
  patientId: string;
  userRole: "patient" | "professional";
  userName: string;
}

const categoryLabels: Record<string, string> = {
  lab_results: "Resultados de Exames",
  prescriptions: "Receitas",
  reports: "Relatórios Médicos",
  imaging: "Imagens",
  other: "Outros",
};

const categoryIcons: Record<string, any> = {
  lab_results: FileSpreadsheet,
  prescriptions: FileText,
  reports: FileText,
  imaging: FileImage,
  other: File,
};

export const Documents = ({ patientId, userRole, userName }: DocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "type">("date");

  const fetchDocuments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    filterAndSort();
  }, [documents, categoryFilter, sortBy]);

  // Real-time subscription for document changes
  useRealtimeSubscription<Document>({
    table: "documents",
    filter: `patient_id=eq.${patientId}`,
    onInsert: (newDoc) => {
      setSyncing(true);
      setDocuments((prev) => [newDoc, ...prev]);
      setTimeout(() => setSyncing(false), 1000);
    },
    onUpdate: (updatedDoc) => {
      setSyncing(true);
      setDocuments((prev) =>
        prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
      );
      setTimeout(() => setSyncing(false), 1000);
    },
    onDelete: (deletedDoc) => {
      setSyncing(true);
      setDocuments((prev) => prev.filter((doc) => doc.id !== deletedDoc.id));
      setTimeout(() => setSyncing(false), 1000);
    },
  });


  const filterAndSort = () => {
    let filtered = [...documents];

    if (categoryFilter !== "all") {
      filtered = filtered.filter((doc) => doc.category === categoryFilter);
    }

    if (sortBy === "date") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      filtered.sort((a, b) => a.category.localeCompare(b.category));
    }

    setFilteredDocs(filtered);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${patientId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documents").insert({
        patient_id: patientId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        category,
        uploaded_by: userName,
        uploaded_by_role: userRole,
      });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      fetchDocuments();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {syncing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Sincronizando...</span>
          </div>
        )}
        <div className="flex gap-4 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Categorias</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "date" | "type")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Ordenar por Data</SelectItem>
              <SelectItem value="type">Ordenar por Tipo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <div key={key}>
              <Input
                id={`upload-${key}`}
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e, key)}
                disabled={uploading}
              />
              <label htmlFor={`upload-${key}`}>
                <Button variant="outline" size="sm" asChild disabled={uploading}>
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {label}
                  </span>
                </Button>
              </label>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando documentos...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, index) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              userRole={userRole}
              userName={userName}
              onDelete={fetchDocuments}
              style={{ animationDelay: `${index * 0.05}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
