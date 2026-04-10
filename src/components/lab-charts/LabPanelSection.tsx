import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { LabMarkerChart, LabDataPoint } from "./LabMarkerChart";

interface MarkerGroup {
  markerName: string;
  dataPoints: LabDataPoint[];
}

interface LabPanelSectionProps {
  title: string;
  icon: string;
  markers: MarkerGroup[];
  defaultOpen?: boolean;
}

export const LabPanelSection = ({ title, icon, markers, defaultOpen = false }: LabPanelSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (markers.length === 0) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <span className="text-lg">{icon}</span>
        <h3 className="text-base font-semibold text-foreground flex-1">{title}</h3>
        <span className="text-xs text-muted-foreground mr-2">{markers.length} marcador{markers.length > 1 ? "es" : ""}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {markers.map((m) => (
            <LabMarkerChart key={m.markerName} markerName={m.markerName} dataPoints={m.dataPoints} />
          ))}
        </div>
      )}
    </div>
  );
};

// Panel configuration matching the spec
export const LAB_PANELS = [
  {
    key: "hemograma",
    title: "Hemograma Completo",
    icon: "🩸",
    keywords: ["hemácia", "leucócit", "plaqueta", "hemoglobina", "hematócrito", "vcm", "hcm", "chcm", "rdw", "neutrófi", "linfócit", "monócit", "eosinófi", "basófil"],
  },
  {
    key: "bioquimica",
    title: "Bioquímica",
    icon: "⚗️",
    keywords: ["glicose", "glicemia", "ureia", "creatinina", "ácido úrico", "proteína", "albumina", "bilirrubina", "tgo", "tgp", "ast", "alt", "ggt", "fosfatase"],
  },
  {
    key: "lipidico",
    title: "Perfil Lipídico",
    icon: "🫀",
    keywords: ["colesterol", "ldl", "hdl", "triglicerídeo", "trigliceride", "vldl"],
  },
  {
    key: "tireoide",
    title: "Tireóide",
    icon: "🦋",
    keywords: ["tsh", "t3", "t4", "tiroxina", "anti-tpo", "anti-tg", "tireoglobulina"],
  },
  {
    key: "inflamatorios",
    title: "Inflamatórios",
    icon: "🔥",
    keywords: ["pcr", "vhs", "ferritina", "proteína c reativa", "velocidade de hemossedimentação"],
  },
  {
    key: "hormonal",
    title: "Metabolismo / Hormônios",
    icon: "💪",
    keywords: ["insulina", "hba1c", "hemoglobina glicada", "testosterona", "cortisol", "vitamina d", "vitamina b12", "ferro sérico", "transferrina", "saturação", "dhea", "estradiol", "progesterona", "prolactina", "fsh", "lh", "igf"],
  },
] as const;

// FIX: usa marker_category do banco se disponível, só classifica por keyword como fallback
export function classifyMarker(markerName: string, categoryFromDB?: string | null): string {
  if (categoryFromDB && categoryFromDB !== "other") return categoryFromDB;
  const lower = markerName.toLowerCase();
  for (const panel of LAB_PANELS) {
    if (panel.keywords.some((kw) => lower.includes(kw))) {
      return panel.key;
    }
  }
  return "outros";
}
