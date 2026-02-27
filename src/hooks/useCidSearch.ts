import { useState, useEffect, useMemo } from "react";

export interface CidEntry {
  code: string;
  description: string;
}

let cachedCidData: CidEntry[] | null = null;

export const useCidSearch = (searchTerm: string, maxResults: number = 50) => {
  const [cidData, setCidData] = useState<CidEntry[]>(cachedCidData || []);
  const [loading, setLoading] = useState(!cachedCidData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedCidData) {
      setCidData(cachedCidData);
      setLoading(false);
      return;
    }

    const loadCidData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/data/cid-10.csv");
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder("iso-8859-1");
        const text = decoder.decode(buffer);
        
        const lines = text.split("\n");
        const entries: CidEntry[] = [];
        
        // Skip header line (index 0)
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          // CSV format: SUBCAT;CLASSIF;RESTRSEXO;CAUSAOBITO;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS;
          const parts = line.split(";");
          if (parts.length >= 5) {
            const code = parts[0].trim();
            const description = parts[4].trim();
            
            if (code && description) {
              // Format code with dot (e.g., A000 -> A00.0)
              const formattedCode = code.length >= 4 
                ? `${code.slice(0, 3)}.${code.slice(3)}` 
                : code;
              
              entries.push({
                code: formattedCode,
                description: description,
              });
            }
          }
        }
        
        cachedCidData = entries;
        setCidData(entries);
        setError(null);
      } catch (err) {
        console.error("Error loading CID data:", err);
        setError("Erro ao carregar dados do CID-10");
      } finally {
        setLoading(false);
      }
    };

    loadCidData();
  }, []);

  const filteredResults = useMemo(() => {
    if (!searchTerm.trim() || cidData.length === 0) {
      return [];
    }

    const normalizedSearch = searchTerm
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return cidData
      .filter((entry) => {
        const normalizedCode = entry.code.toLowerCase().replace(".", "");
        const normalizedDesc = entry.description
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        return (
          normalizedCode.includes(normalizedSearch.replace(".", "")) ||
          normalizedDesc.includes(normalizedSearch)
        );
      })
      .slice(0, maxResults);
  }, [searchTerm, cidData, maxResults]);

  return {
    results: filteredResults,
    loading,
    error,
    totalEntries: cidData.length,
  };
};
