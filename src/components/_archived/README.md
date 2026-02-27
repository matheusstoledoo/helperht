 # Componentes Arquivados
 
 Esta pasta contém componentes temporariamente removidos do frontend, mas com toda a estrutura de backend mantida.
 
 ## Módulo de Evidência Científica
 
 ### Para reativar:
 
 1. **Mover componentes de volta:**
    - Mover `src/components/_archived/evidence` para `src/components/evidence`
 
 2. **Mover hooks de volta:**
    - Mover `src/hooks/_archived/useEvidenceSearch.ts` para `src/hooks/useEvidenceSearch.ts`
    - Mover `src/hooks/_archived/useEvidenceQualityAnalysis.ts` para `src/hooks/useEvidenceQualityAnalysis.ts`
 
 3. **Atualizar imports nos componentes movidos:**
    - Em `EvidenceSearchModal.tsx` e `EvidenceQualityPanel.tsx`, trocar:
      - `@/hooks/_archived/useEvidenceSearch` → `@/hooks/useEvidenceSearch`
      - `@/hooks/_archived/useEvidenceQualityAnalysis` → `@/hooks/useEvidenceQualityAnalysis`
 
 4. **Adicionar no frontend onde desejar (ex: ProfessionalPatientView.tsx):**
    ```tsx
    import { EvidenceSearchButton } from "@/components/evidence/EvidenceSearchButton";
    
    // No JSX:
    <EvidenceSearchButton
      patientId={patientId}
      patientName={patientName}
    />
    ```
 
 ### Backend mantido:
 
 - **Edge Functions (funcionais):**
   - `supabase/functions/search-evidence/index.ts`
   - `supabase/functions/analyze-evidence-quality/index.ts`
   - `supabase/functions/evaluate-study-relevance/index.ts`
   - `supabase/functions/export-audit-report/index.ts`
 
 - **Tabelas no banco (com dados):**
   - `evidence_searches`
   - `evidence_results`
   - `evidence_quality_analyses`
   - `evidence_audit_logs`
   - `extracted_concepts`
   - `quality_analysis_audit_logs`
 
 - **Tipos gerados automaticamente em:** `src/integrations/supabase/types.ts`