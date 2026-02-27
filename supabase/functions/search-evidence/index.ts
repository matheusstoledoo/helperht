import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// PubMed E-utilities base URL
const PUBMED_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

interface PatientData {
  patientId: string;
  diagnoses: Array<{
    id: string;
    name: string;
    icd_code?: string;
    status: string;
  }>;
  treatments: Array<{
    id: string;
    name: string;
    dosage?: string;
    status: string;
  }>;
  freeText?: string;
  demographics?: {
    age?: number;
    sex?: string;
  };
}

interface ExtractedConcept {
  original_term: string;
  normalized_term: string;
  concept_type: 'disease' | 'medication' | 'symptom' | 'procedure' | 'lab_test' | 'outcome' | 'demographic' | 'other';
  mesh_term?: string;
  icd_code?: string;
  confidence_score: number;
}

interface PICOQuery {
  patient: string;
  intervention: string;
  comparison: string;
  outcome: string;
}

interface PubMedArticle {
  pubmed_id: string;
  pmc_id?: string;
  doi?: string;
  title: string;
  authors: string[];
  journal: string;
  publication_date: string;
  abstract: string;
  study_type: string;
  mesh_terms: string[];
  full_text?: string;
  full_text_available: boolean;
}

// =============================================
// Common medication mappings (Portuguese to English/MeSH)
// =============================================
const MEDICATION_MAPPINGS: Record<string, { english: string; mesh?: string }> = {
  'metformina': { english: 'Metformin', mesh: 'Metformin' },
  'insulina': { english: 'Insulin', mesh: 'Insulin' },
  'insulina nph': { english: 'Insulin, Isophane', mesh: 'Insulin, Isophane' },
  'insulina regular': { english: 'Insulin, Regular', mesh: 'Insulin, Regular, Human' },
  'captopril': { english: 'Captopril', mesh: 'Captopril' },
  'enalapril': { english: 'Enalapril', mesh: 'Enalapril' },
  'losartana': { english: 'Losartan', mesh: 'Losartan' },
  'atorvastatina': { english: 'Atorvastatin', mesh: 'Atorvastatin' },
  'sinvastatina': { english: 'Simvastatin', mesh: 'Simvastatin' },
  'omeprazol': { english: 'Omeprazole', mesh: 'Omeprazole' },
  'dapagliflozina': { english: 'Dapagliflozin', mesh: 'Dapagliflozin' },
  'empagliflozina': { english: 'Empagliflozin', mesh: 'Empagliflozin' },
  'glicazida': { english: 'Gliclazide', mesh: 'Gliclazide' },
  'glibenclamida': { english: 'Glyburide', mesh: 'Glyburide' },
  'sitagliptina': { english: 'Sitagliptin', mesh: 'Sitagliptin Phosphate' },
  'liraglutida': { english: 'Liraglutide', mesh: 'Liraglutide' },
  'semaglutida': { english: 'Semaglutide', mesh: 'Semaglutide' },
  'amlodipino': { english: 'Amlodipine', mesh: 'Amlodipine' },
  'hidroclorotiazida': { english: 'Hydrochlorothiazide', mesh: 'Hydrochlorothiazide' },
  'furosemida': { english: 'Furosemide', mesh: 'Furosemide' },
  'aspirina': { english: 'Aspirin', mesh: 'Aspirin' },
  'aas': { english: 'Aspirin', mesh: 'Aspirin' },
  'clopidogrel': { english: 'Clopidogrel', mesh: 'Clopidogrel' },
  'varfarina': { english: 'Warfarin', mesh: 'Warfarin' },
  'rivaroxabana': { english: 'Rivaroxaban', mesh: 'Rivaroxaban' },
  'apixabana': { english: 'Apixaban', mesh: 'Apixaban' },
};

// =============================================
// ICD-10 to MeSH mapping for common conditions
// =============================================
const ICD_MESH_MAPPINGS: Record<string, { mesh: string; english: string }> = {
  'E10': { mesh: 'Diabetes Mellitus, Type 1', english: 'Type 1 Diabetes Mellitus' },
  'E10.2': { mesh: 'Diabetic Nephropathies', english: 'Diabetic Nephropathy' },
  'E10.3': { mesh: 'Diabetic Retinopathy', english: 'Diabetic Retinopathy' },
  'E10.4': { mesh: 'Diabetic Neuropathies', english: 'Diabetic Neuropathy' },
  'E10.5': { mesh: 'Diabetic Angiopathies', english: 'Diabetic Angiopathy' },
  'E11': { mesh: 'Diabetes Mellitus, Type 2', english: 'Type 2 Diabetes Mellitus' },
  'E11.2': { mesh: 'Diabetic Nephropathies', english: 'Diabetic Nephropathy' },
  'E11.3': { mesh: 'Diabetic Retinopathy', english: 'Diabetic Retinopathy' },
  'E11.4': { mesh: 'Diabetic Neuropathies', english: 'Diabetic Neuropathy' },
  'I10': { mesh: 'Hypertension', english: 'Hypertension' },
  'I11': { mesh: 'Hypertensive Heart Disease', english: 'Hypertensive Heart Disease' },
  'I12': { mesh: 'Hypertensive Nephropathy', english: 'Hypertensive Nephropathy' },
  'I21': { mesh: 'Myocardial Infarction', english: 'Myocardial Infarction' },
  'I25': { mesh: 'Coronary Artery Disease', english: 'Coronary Artery Disease' },
  'I48': { mesh: 'Atrial Fibrillation', english: 'Atrial Fibrillation' },
  'I50': { mesh: 'Heart Failure', english: 'Heart Failure' },
  'J44': { mesh: 'Pulmonary Disease, Chronic Obstructive', english: 'COPD' },
  'J45': { mesh: 'Asthma', english: 'Asthma' },
  'N18': { mesh: 'Renal Insufficiency, Chronic', english: 'Chronic Kidney Disease' },
  'K21': { mesh: 'Gastroesophageal Reflux', english: 'GERD' },
  'F32': { mesh: 'Depressive Disorder', english: 'Depression' },
  'F41': { mesh: 'Anxiety Disorders', english: 'Anxiety Disorder' },
  'M05': { mesh: 'Arthritis, Rheumatoid', english: 'Rheumatoid Arthritis' },
  'M06': { mesh: 'Arthritis, Rheumatoid', english: 'Rheumatoid Arthritis' },
};

// =============================================
// STEP 1: Normalize clinical terms (rule-based)
// =============================================
function normalizeClinicalTerms(
  patientData: PatientData
): { concepts: ExtractedConcept[]; pico: PICOQuery } {
  const concepts: ExtractedConcept[] = [];
  
  // Process diagnoses
  for (const diagnosis of patientData.diagnoses) {
    const icdCode = diagnosis.icd_code?.toUpperCase();
    let meshTerm: string | undefined;
    let normalizedTerm = diagnosis.name;
    
    // Try to map ICD code to MeSH
    if (icdCode) {
      // Try exact match first, then prefix match
      const mapping = ICD_MESH_MAPPINGS[icdCode] || 
                     ICD_MESH_MAPPINGS[icdCode.split('.')[0]];
      if (mapping) {
        meshTerm = mapping.mesh;
        normalizedTerm = mapping.english;
      }
    }
    
    concepts.push({
      original_term: diagnosis.name,
      normalized_term: normalizedTerm,
      concept_type: 'disease',
      mesh_term: meshTerm,
      icd_code: icdCode,
      confidence_score: meshTerm ? 0.95 : 0.7,
    });
  }
  
  // Process treatments/medications
  for (const treatment of patientData.treatments) {
    const treatmentNameLower = treatment.name.toLowerCase().trim();
    const mapping = MEDICATION_MAPPINGS[treatmentNameLower];
    
    concepts.push({
      original_term: treatment.name,
      normalized_term: mapping?.english || treatment.name,
      concept_type: 'medication',
      mesh_term: mapping?.mesh,
      confidence_score: mapping ? 0.95 : 0.7,
    });
  }
  
  // Build PICO from extracted concepts
  const diseases = concepts.filter(c => c.concept_type === 'disease');
  const medications = concepts.filter(c => c.concept_type === 'medication');
  
  const patientDescription = diseases
    .map(d => d.normalized_term)
    .join(' with ') || 'Adult patient';
  
  const interventionDescription = medications
    .map(m => m.normalized_term)
    .join(', ') || 'Standard treatment';
  
  // Add demographic info if available
  let patientContext = patientDescription;
  if (patientData.demographics?.age) {
    patientContext = `${patientData.demographics.age}-year-old ${patientContext}`;
  }
  if (patientData.demographics?.sex) {
    const sexTerm = patientData.demographics.sex === 'M' ? 'male' : 'female';
    patientContext = `${sexTerm} ${patientContext}`;
  }
  
  const pico: PICOQuery = {
    patient: patientContext,
    intervention: interventionDescription,
    comparison: 'placebo or standard care',
    outcome: 'clinical outcomes, mortality, quality of life',
  };
  
  return { concepts, pico };
}

// =============================================
// STEP 2: Build PubMed query from PICO
// =============================================
function buildPubMedQuery(pico: PICOQuery, concepts: ExtractedConcept[]): string {
  const queryParts: string[] = [];
  
  // Add disease/condition terms
  const diseases = concepts
    .filter(c => c.concept_type === 'disease' && c.mesh_term)
    .map(c => c.mesh_term!);
  
  const diseaseNames = concepts
    .filter(c => c.concept_type === 'disease' && !c.mesh_term)
    .map(c => c.normalized_term);
  
  if (diseases.length > 0 || diseaseNames.length > 0) {
    const meshParts = diseases.map(d => `"${d}"[MeSH Terms]`);
    const titleParts = diseaseNames.map(d => `"${d}"[Title/Abstract]`);
    queryParts.push(`(${[...meshParts, ...titleParts].join(' OR ')})`);
  }
  
  // Add intervention terms
  const medications = concepts
    .filter(c => c.concept_type === 'medication' && c.mesh_term)
    .map(c => c.mesh_term!);
  
  const medicationNames = concepts
    .filter(c => c.concept_type === 'medication' && !c.mesh_term)
    .map(c => c.normalized_term);
  
  if (medications.length > 0 || medicationNames.length > 0) {
    const meshParts = medications.map(m => `"${m}"[MeSH Terms]`);
    const titleParts = medicationNames.map(m => `"${m}"[Title/Abstract]`);
    queryParts.push(`(${[...meshParts, ...titleParts].join(' OR ')})`);
  }
  
  // Add study type filters for better evidence
  const studyTypeFilter = '(("meta-analysis"[Publication Type] OR "systematic review"[Publication Type] OR "randomized controlled trial"[Publication Type] OR "practice guideline"[Publication Type] OR "clinical trial"[Publication Type]))';
  
  // Combine with AND
  let query = queryParts.join(' AND ');
  if (query) {
    query = `(${query}) AND ${studyTypeFilter}`;
  } else {
    // Fallback to PICO patient description
    query = `"${pico.patient}"[Title/Abstract] AND ${studyTypeFilter}`;
  }
  
  // Add recency filter (last 5 years)
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const dateFilter = `("${fiveYearsAgo.getFullYear()}/01/01"[Date - Publication] : "3000"[Date - Publication])`;
  
  return `${query} AND ${dateFilter}`;
}

// =============================================
// STEP 3: Search PubMed
// =============================================
async function searchPubMed(query: string, maxResults: number = 20): Promise<string[]> {
  const searchUrl = `${PUBMED_BASE_URL}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;
  
  console.log('PubMed search URL:', searchUrl);
  
  const response = await fetch(searchUrl);
  
  if (!response.ok) {
    throw new Error(`PubMed search failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.esearchresult?.idlist || [];
}

// =============================================
// STEP 4: Fetch article details from PubMed
// =============================================
async function fetchArticleDetails(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];
  
  const fetchUrl = `${PUBMED_BASE_URL}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=xml`;
  
  const response = await fetch(fetchUrl);
  
  if (!response.ok) {
    throw new Error(`PubMed fetch failed: ${response.status}`);
  }
  
  const xmlText = await response.text();
  
  // Parse XML to extract article data
  const articles: PubMedArticle[] = [];
  
  // Simple XML parsing for PubMed articles
  const articleMatches = xmlText.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];
  
  for (const articleXml of articleMatches) {
    try {
      const pmid = articleXml.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] || '';
      const title = articleXml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/)?.[1] || '';
      const abstractText = articleXml.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/)?.[1] || '';
      const journal = articleXml.match(/<Title>([^<]+)<\/Title>/)?.[1] || '';
      
      // Extract DOI
      const doi = articleXml.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1] || 
                  articleXml.match(/<ELocationID EIdType="doi"[^>]*>([^<]+)<\/ELocationID>/)?.[1];
      
      // Extract PMC ID
      const pmcId = articleXml.match(/<ArticleId IdType="pmc">([^<]+)<\/ArticleId>/)?.[1];
      
      // Extract authors
      const authorMatches = articleXml.match(/<LastName>([^<]+)<\/LastName>/g) || [];
      const authors = authorMatches.map(a => a.replace(/<\/?LastName>/g, '')).slice(0, 5);
      
      // Extract publication date
      const year = articleXml.match(/<Year>(\d{4})<\/Year>/)?.[1] || '';
      const month = articleXml.match(/<Month>(\d{1,2}|\w+)<\/Month>/)?.[1] || '01';
      const day = articleXml.match(/<Day>(\d{1,2})<\/Day>/)?.[1] || '01';
      
      // Extract MeSH terms
      const meshMatches = articleXml.match(/<DescriptorName[^>]*>([^<]+)<\/DescriptorName>/g) || [];
      const meshTerms = meshMatches.map(m => m.replace(/<[^>]+>/g, ''));
      
      // Detect study type from publication types
      let studyType = 'other';
      if (articleXml.includes('Meta-Analysis')) studyType = 'meta_analysis';
      else if (articleXml.includes('Systematic Review')) studyType = 'systematic_review';
      else if (articleXml.includes('Randomized Controlled Trial')) studyType = 'randomized_controlled_trial';
      else if (articleXml.includes('Practice Guideline') || articleXml.includes('Guideline')) studyType = 'guideline';
      else if (articleXml.includes('Clinical Trial')) studyType = 'randomized_controlled_trial';
      else if (articleXml.includes('Cohort')) studyType = 'cohort_study';
      else if (articleXml.includes('Case-Control')) studyType = 'case_control';
      else if (articleXml.includes('Case Report')) studyType = 'case_report';
      
      articles.push({
        pubmed_id: pmid,
        pmc_id: pmcId,
        doi,
        title: decodeHTMLEntities(title),
        authors,
        journal: decodeHTMLEntities(journal),
        publication_date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
        abstract: decodeHTMLEntities(abstractText),
        study_type: studyType,
        mesh_terms: meshTerms,
        full_text_available: !!pmcId,
      });
    } catch (e) {
      console.error('Error parsing article:', e);
    }
  }
  
  return articles;
}

// =============================================
// STEP 4.1: Fetch full text from PMC
// =============================================
const PMC_BASE_URL = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PMC_OA_URL = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful/pmcoa.cgi/BioC_json';

async function fetchFullTextFromPMC(pmcId: string): Promise<{ success: boolean; text?: string; source?: string }> {
  try {
    // Clean PMC ID
    const cleanId = pmcId.replace(/^PMC/i, '');
    
    console.log(`[PMC] Fetching full text for PMC${cleanId}`);
    
    // Try BioC Open Access API first (best quality)
    const biocResponse = await fetch(`${PMC_OA_URL}/${cleanId}/unicode`);
    
    if (biocResponse.ok) {
      const data = await biocResponse.json();
      let fullText = '';
      
      if (data.documents) {
        for (const doc of data.documents) {
          if (doc.passages) {
            for (const passage of doc.passages) {
              if (passage.text) {
                const section = passage.infons?.section_type || '';
                if (section) {
                  fullText += `\n\n[${section}]\n`;
                }
                fullText += passage.text + '\n';
              }
            }
          }
        }
      }
      
      if (fullText.length > 500) {
        console.log(`[PMC] Successfully fetched full text (${fullText.length} chars) via BioC API`);
        return { success: true, text: fullText.trim(), source: 'pmc_oa_bioc' };
      }
    }
    
    // Fallback to efetch XML
    const efetchUrl = `${PMC_BASE_URL}/efetch.fcgi?db=pmc&id=${cleanId}&rettype=xml`;
    const efetchResponse = await fetch(efetchUrl);
    
    if (efetchResponse.ok) {
      const xmlText = await efetchResponse.text();
      
      // Extract main sections from PMC XML
      let fullText = '';
      
      // Extract title
      const titleMatch = xmlText.match(/<article-title>([^<]*)<\/article-title>/);
      if (titleMatch) fullText += `[TITLE]\n${decodeHTMLEntities(titleMatch[1])}\n\n`;
      
      // Extract abstract
      const abstractMatches = xmlText.match(/<abstract[\s\S]*?<\/abstract>/g) || [];
      for (const absMatch of abstractMatches) {
        const absText = absMatch.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (absText) fullText += `[ABSTRACT]\n${decodeHTMLEntities(absText)}\n\n`;
      }
      
      // Extract body sections
      const bodyMatch = xmlText.match(/<body[\s\S]*?<\/body>/);
      if (bodyMatch) {
        // Extract sections with titles
        const sectionMatches = bodyMatch[0].match(/<sec[\s\S]*?<\/sec>/g) || [];
        for (const section of sectionMatches) {
          const sectionTitle = section.match(/<title>([^<]*)<\/title>/)?.[1] || 'SECTION';
          const sectionText = section
            .replace(/<title>[^<]*<\/title>/g, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (sectionText) {
            fullText += `[${sectionTitle.toUpperCase()}]\n${decodeHTMLEntities(sectionText)}\n\n`;
          }
        }
      }
      
      if (fullText.length > 500) {
        console.log(`[PMC] Successfully fetched full text (${fullText.length} chars) via efetch`);
        return { success: true, text: fullText.trim(), source: 'pmc_efetch' };
      }
    }
    
    return { success: false };
  } catch (error) {
    console.error('[PMC] Error fetching full text:', error);
    return { success: false };
  }
}

// =============================================
// STEP 4.2: Try to get PMC ID from PubMed ID via eLink
// =============================================
async function getPMCIdFromPubMed(pubmedId: string): Promise<string | null> {
  try {
    const url = `${PMC_BASE_URL}/elink.fcgi?dbfrom=pubmed&db=pmc&id=${pubmedId}&retmode=json`;
    const response = await fetch(url);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const linkSets = data.linksets?.[0]?.linksetdbs;
    
    if (linkSets) {
      for (const linkSet of linkSets) {
        if (linkSet.dbto === 'pmc' && linkSet.links?.length > 0) {
          return `PMC${linkSet.links[0]}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('[eLink] Error getting PMC ID:', error);
    return null;
  }
}

// =============================================
// STEP 4.3: Enrich articles with full text
// =============================================
async function enrichArticlesWithFullText(articles: PubMedArticle[]): Promise<PubMedArticle[]> {
  console.log(`[FullText] Enriching ${articles.length} articles with full text...`);
  
  const enrichedArticles: PubMedArticle[] = [];
  
  for (const article of articles) {
    let pmcId = article.pmc_id;
    let fullText: string | undefined;
    let fullTextAvailable = false;
    
    // If no PMC ID, try to get it via eLink
    if (!pmcId) {
      pmcId = await getPMCIdFromPubMed(article.pubmed_id) || undefined;
    }
    
    // If we have a PMC ID, fetch full text
    if (pmcId) {
      const result = await fetchFullTextFromPMC(pmcId);
      if (result.success && result.text) {
        fullText = result.text;
        fullTextAvailable = true;
      }
    }
    
    enrichedArticles.push({
      ...article,
      pmc_id: pmcId,
      full_text: fullText,
      full_text_available: fullTextAvailable,
    });
  }
  
  const successCount = enrichedArticles.filter(a => a.full_text_available).length;
  console.log(`[FullText] Successfully fetched full text for ${successCount}/${articles.length} articles`);
  
  return enrichedArticles;
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// =============================================
// STEP 5: Calculate relevance scores
// =============================================
function calculateRelevanceScores(
  article: PubMedArticle,
  concepts: ExtractedConcept[],
  pico: PICOQuery
): { relevance: number; similarity: number; quality: number; recency: number } {
  let similarityScore = 0;
  let qualityScore = 0;
  let recencyScore = 0;
  
  // Patient similarity: check MeSH term overlap
  const patientMeshTerms = concepts
    .filter(c => c.mesh_term)
    .map(c => c.mesh_term!.toLowerCase());
  
  const articleMeshTermsLower = article.mesh_terms.map(m => m.toLowerCase());
  
  const meshOverlap = patientMeshTerms.filter(t => 
    articleMeshTermsLower.some(am => am.includes(t) || t.includes(am))
  ).length;
  
  similarityScore = Math.min(100, (meshOverlap / Math.max(1, patientMeshTerms.length)) * 100);
  
  // Also check title/abstract for concept mentions
  const titleAbstract = (article.title + ' ' + article.abstract).toLowerCase();
  const conceptMentions = concepts.filter(c => 
    titleAbstract.includes(c.normalized_term.toLowerCase())
  ).length;
  
  similarityScore = Math.min(100, similarityScore + (conceptMentions * 10));
  
  // Study quality score based on study type
  const qualityMap: Record<string, number> = {
    'guideline': 100,
    'meta_analysis': 95,
    'systematic_review': 90,
    'randomized_controlled_trial': 85,
    'cohort_study': 70,
    'case_control': 60,
    'case_report': 40,
    'expert_opinion': 30,
    'other': 20,
  };
  
  qualityScore = qualityMap[article.study_type] || 20;
  
  // Recency score (max 100 for current year, decreasing)
  const pubYear = parseInt(article.publication_date.split('-')[0]) || 2020;
  const currentYear = new Date().getFullYear();
  const yearsOld = currentYear - pubYear;
  recencyScore = Math.max(0, 100 - (yearsOld * 15));
  
  // Overall relevance (weighted average)
  const relevance = Math.round(
    (similarityScore * 0.4) + 
    (qualityScore * 0.35) + 
    (recencyScore * 0.25)
  );
  
  return {
    relevance,
    similarity: Math.round(similarityScore),
    quality: Math.round(qualityScore),
    recency: Math.round(recencyScore),
  };
}

// =============================================
// STEP 6: Generate clinical summary (rule-based)
// =============================================
function generateClinicalSummary(
  article: PubMedArticle,
  concepts: ExtractedConcept[]
): string {
  // Create a summary based on study type and abstract
  const studyTypeLabels: Record<string, string> = {
    'guideline': 'Diretriz clínica',
    'meta_analysis': 'Meta-análise',
    'systematic_review': 'Revisão sistemática',
    'randomized_controlled_trial': 'Ensaio clínico randomizado',
    'cohort_study': 'Estudo de coorte',
    'case_control': 'Estudo caso-controle',
    'case_report': 'Relato de caso',
    'other': 'Estudo',
  };
  
  const studyLabel = studyTypeLabels[article.study_type] || 'Estudo';
  
  // Extract key medications and conditions mentioned
  const relevantMeds = concepts
    .filter(c => c.concept_type === 'medication')
    .map(c => c.original_term)
    .slice(0, 2);
  
  const relevantConditions = concepts
    .filter(c => c.concept_type === 'disease')
    .map(c => c.original_term)
    .slice(0, 2);
  
  // Build summary
  let summary = `${studyLabel} publicado em ${article.journal}`;
  
  if (relevantConditions.length > 0) {
    summary += ` sobre ${relevantConditions.join(' e ')}`;
  }
  
  if (relevantMeds.length > 0) {
    summary += ` investigando ${relevantMeds.join(', ')}`;
  }
  
  summary += '. ';
  
  // Add truncated abstract if available
  if (article.abstract) {
    const abstractStart = article.abstract.substring(0, 200);
    const lastPeriod = abstractStart.lastIndexOf('.');
    if (lastPeriod > 50) {
      summary += abstractStart.substring(0, lastPeriod + 1);
    } else {
      summary += abstractStart + '...';
    }
  }
  
  return summary;
}

// =============================================
// MAIN HANDLER
// =============================================
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client with service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const patientData: PatientData = await req.json();

    if (!patientData.patientId) {
      throw new Error('Patient ID is required');
    }

    console.log('Starting evidence search for patient:', patientData.patientId);

    // Create search record
    const { data: searchRecord, error: insertError } = await supabase
      .from('evidence_searches')
      .insert({
        patient_id: patientData.patientId,
        professional_id: user.id,
        input_diagnoses: patientData.diagnoses,
        input_treatments: patientData.treatments,
        input_free_text: patientData.freeText,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create search record:', insertError);
      throw new Error('Failed to create search record');
    }

    const searchId = searchRecord.id;

    // Log audit event: search started
    await supabase.from('evidence_audit_logs').insert({
      search_id: searchId,
      action: 'search_started',
      action_details: { patient_id: patientData.patientId },
      patient_data_used: {
        diagnoses_count: patientData.diagnoses.length,
        treatments_count: patientData.treatments.length,
        has_free_text: !!patientData.freeText,
      },
      performed_by: user.id,
    });

    try {
      // Step 1: Normalize clinical terms (rule-based - no LLM)
      console.log('Step 1: Normalizing clinical terms...');
      const { concepts, pico } = normalizeClinicalTerms(patientData);

      // Save extracted concepts
      if (concepts.length > 0) {
        await supabase.from('extracted_concepts').insert(
          concepts.map(c => ({
            search_id: searchId,
            original_term: c.original_term,
            normalized_term: c.normalized_term,
            concept_type: c.concept_type,
            mesh_term: c.mesh_term,
            icd_code: c.icd_code,
            confidence_score: c.confidence_score,
          }))
        );
      }

      // Update search with PICO
      await supabase.from('evidence_searches').update({
        pico_patient: pico.patient,
        pico_intervention: pico.intervention,
        pico_comparison: pico.comparison,
        pico_outcome: pico.outcome,
      }).eq('id', searchId);

      // Step 2: Build and execute PubMed query
      console.log('Step 2: Building PubMed query...');
      const query = buildPubMedQuery(pico, concepts);
      console.log('Generated query:', query);

      await supabase.from('evidence_searches').update({
        generated_query: query,
      }).eq('id', searchId);

      // Step 3: Search PubMed
      console.log('Step 3: Searching PubMed...');
      const pmids = await searchPubMed(query, 15);
      console.log('Found PMIDs:', pmids.length);

      // Step 4: Fetch article details
      console.log('Step 4: Fetching article details...');
      const articles = await fetchArticleDetails(pmids);

      // Step 4.5: Enrich with full text from PMC
      console.log('Step 4.5: Fetching full text from PMC...');
      const enrichedArticles = await enrichArticlesWithFullText(articles);

      // Step 5: Score and save results
      console.log('Step 5: Scoring articles...');
      
      const scoredArticles = enrichedArticles.map(article => {
        const scores = calculateRelevanceScores(article, concepts, pico);
        return { ...article, scores };
      });

      // Sort by relevance
      scoredArticles.sort((a, b) => b.scores.relevance - a.scores.relevance);

      // Step 6: Generate summaries for top articles
      console.log('Step 6: Generating clinical summaries...');
      const topArticles = scoredArticles.slice(0, 10);
      
      for (const article of topArticles) {
        const summary = generateClinicalSummary(article, concepts);
        
        await supabase.from('evidence_results').insert({
          search_id: searchId,
          pubmed_id: article.pubmed_id,
          pmc_id: article.pmc_id || null,
          doi: article.doi || null,
          title: article.title,
          authors: article.authors,
          journal: article.journal,
          publication_date: article.publication_date || null,
          abstract: article.abstract,
          study_type: article.study_type,
          relevance_score: article.scores.relevance,
          patient_similarity_score: article.scores.similarity,
          study_quality_score: article.scores.quality,
          recency_score: article.scores.recency,
          clinical_summary: summary,
          source_url: `https://pubmed.ncbi.nlm.nih.gov/${article.pubmed_id}/`,
        });
      }

      // Update search as completed
      const duration = Date.now() - startTime;
      await supabase.from('evidence_searches').update({
        status: 'completed',
        total_results: topArticles.length,
        search_duration_ms: duration,
        completed_at: new Date().toISOString(),
      }).eq('id', searchId);

      // Log audit event: search completed
      const fullTextCount = topArticles.filter(a => a.full_text_available).length;
      await supabase.from('evidence_audit_logs').insert({
        search_id: searchId,
        action: 'search_completed',
        action_details: {
          total_results: topArticles.length,
          full_text_available: fullTextCount,
          duration_ms: duration,
          concepts_extracted: concepts.length,
        },
        performed_by: user.id,
      });

      // Return results
      return new Response(
        JSON.stringify({
          success: true,
          searchId,
          query,
          pico,
          concepts,
          results: topArticles.map(a => ({
            pubmed_id: a.pubmed_id,
            pmc_id: a.pmc_id,
            doi: a.doi,
            title: a.title,
            authors: a.authors,
            journal: a.journal,
            publication_date: a.publication_date,
            study_type: a.study_type,
            relevance_score: a.scores.relevance,
            full_text_available: a.full_text_available,
            source_url: `https://pubmed.ncbi.nlm.nih.gov/${a.pubmed_id}/`,
          })),
          totalResults: topArticles.length,
          fullTextAvailable: fullTextCount,
          durationMs: duration,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (searchError) {
      // Update search as failed
      await supabase.from('evidence_searches').update({
        status: 'failed',
        error_message: searchError instanceof Error ? searchError.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      }).eq('id', searchId);

      // Log audit event: search failed
      await supabase.from('evidence_audit_logs').insert({
        search_id: searchId,
        action: 'search_failed',
        action_details: {
          error: searchError instanceof Error ? searchError.message : 'Unknown error',
        },
        performed_by: user.id,
      });

      throw searchError;
    }

  } catch (error) {
    console.error('Error in search-evidence:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
