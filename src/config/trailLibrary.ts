// Biblioteca científica de trilhas (estática por enquanto — seed virá depois)

export type TrailLibraryCategory = "clinica" | "composicao_corporal" | "performance";

export interface TrailLibraryItem {
  slug: string;
  name: string;
  description: string;
  duration_weeks: number;
  category: TrailLibraryCategory;
  subcategory?: string;
}

export const TRAIL_LIBRARY: TrailLibraryItem[] = [
  // CLÍNICAS
  {
    slug: "sindrome-metabolica",
    name: "Síndrome metabólica",
    description: "Manejo integrado de obesidade abdominal, dislipidemia, hipertensão e resistência insulínica.",
    duration_weeks: 20,
    category: "clinica",
  },
  {
    slug: "hipertensao-arterial",
    name: "Hipertensão arterial",
    description: "Controle pressórico com mudanças de estilo de vida e adesão medicamentosa.",
    duration_weeks: 16,
    category: "clinica",
  },
  {
    slug: "dm2-pre-diabetes",
    name: "DM2 / pré-diabetes",
    description: "Reversão e controle glicêmico via nutrição, exercício e monitoramento.",
    duration_weeks: 16,
    category: "clinica",
  },
  {
    slug: "saude-mental-burnout",
    name: "Saúde mental / burnout",
    description: "Recuperação de exaustão crônica, sono, estresse e regulação emocional.",
    duration_weeks: 12,
    category: "clinica",
  },
  {
    slug: "dor-musculoesqueletica",
    name: "Dor musculoesquelética",
    description: "Reabilitação progressiva de dor crônica com fisioterapia e movimento.",
    duration_weeks: 12,
    category: "clinica",
  },

  // COMPOSIÇÃO CORPORAL
  {
    slug: "ganho-massa-magra",
    name: "Ganho de massa magra",
    description: "Hipertrofia com periodização de treino, superávit calórico e proteínas.",
    duration_weeks: 16,
    category: "composicao_corporal",
  },

  // PERFORMANCE
  {
    slug: "desenvolvimento-aerobico",
    name: "Desenvolvimento aeróbico",
    description: "Construção de base aeróbica com Zona 2 e progressão controlada.",
    duration_weeks: 12,
    category: "performance",
  },
  {
    slug: "corrida",
    name: "Corrida",
    description: "Periodização específica para corredores com foco em volume e intensidade.",
    duration_weeks: 16,
    category: "performance",
  },
  {
    slug: "natacao",
    name: "Natação",
    description: "Técnica, resistência e potência aquática.",
    duration_weeks: 16,
    category: "performance",
  },
  {
    slug: "ciclismo",
    name: "Ciclismo",
    description: "FTP, cadência e endurance sobre a bike.",
    duration_weeks: 16,
    category: "performance",
  },
  {
    slug: "triatlo",
    name: "Triatlo",
    description: "Integração das três modalidades com periodização e transições.",
    duration_weeks: 20,
    category: "performance",
  },
  {
    slug: "fisiculturismo",
    name: "Fisiculturismo",
    description: "Preparação para palco com bulking, cutting e peak week.",
    duration_weeks: 20,
    category: "performance",
  },
  {
    slug: "crossfit",
    name: "CrossFit",
    description: "Condicionamento misto: força, ginástica e metcon.",
    duration_weeks: 12,
    category: "performance",
  },
  {
    slug: "lutas",
    name: "Lutas",
    description: "Preparação física para combate: explosão, resistência e recuperação.",
    duration_weeks: 16,
    category: "performance",
  },
];

export const CATEGORY_META: Record<
  TrailLibraryCategory,
  { label: string; bgClass: string; borderClass: string; textClass: string }
> = {
  clinica: {
    label: "Clínicas",
    bgClass: "bg-red-50 hover:bg-red-100",
    borderClass: "border-red-200",
    textClass: "text-red-900",
  },
  composicao_corporal: {
    label: "Composição corporal",
    bgClass: "bg-green-50 hover:bg-green-100",
    borderClass: "border-green-200",
    textClass: "text-green-900",
  },
  performance: {
    label: "Performance",
    bgClass: "bg-blue-50 hover:bg-blue-100",
    borderClass: "border-blue-200",
    textClass: "text-blue-900",
  },
};
