ALTER TABLE public.documents DROP CONSTRAINT documents_category_check;

ALTER TABLE public.documents ADD CONSTRAINT documents_category_check CHECK (
  category = ANY (ARRAY[
    'lab_results', 'prescriptions', 'reports', 'imaging', 'other',
    'exame_laboratorial', 'exame_imagem', 'laudo', 'receita',
    'resumo_internacao', 'prescricao_nutricional', 'prescricao_treino',
    'prescricao_suplementacao', 'outros'
  ])
);