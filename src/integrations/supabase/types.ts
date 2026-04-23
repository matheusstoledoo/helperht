export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      care_trails: {
        Row: {
          activated_at: string | null
          clinical_condition: string | null
          clinical_objective: string | null
          created_at: string
          description: string | null
          duration_days: number
          icon: string | null
          id: string
          is_locked: boolean
          is_template: boolean
          name: string
          professional_id: string
          specialty: string | null
          status: Database["public"]["Enums"]["trail_status"]
          template_category: string | null
          updated_at: string
          version: number
        }
        Insert: {
          activated_at?: string | null
          clinical_condition?: string | null
          clinical_objective?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          icon?: string | null
          id?: string
          is_locked?: boolean
          is_template?: boolean
          name: string
          professional_id: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["trail_status"]
          template_category?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          activated_at?: string | null
          clinical_condition?: string | null
          clinical_objective?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number
          icon?: string | null
          id?: string
          is_locked?: boolean
          is_template?: boolean
          name?: string
          professional_id?: string
          specialty?: string | null
          status?: Database["public"]["Enums"]["trail_status"]
          template_category?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "care_trails_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_events: {
        Row: {
          contact_point_id: string | null
          created_at: string
          enrollment_id: string | null
          event_type: string
          fhir_code: string | null
          fhir_code_system: string | null
          fhir_resource_type: string | null
          id: string
          patient_id: string
          recorded_at: string
          response_id: string | null
          source: string
          structured_payload: Json
          unstructured_payload: Json | null
        }
        Insert: {
          contact_point_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          event_type: string
          fhir_code?: string | null
          fhir_code_system?: string | null
          fhir_resource_type?: string | null
          id?: string
          patient_id: string
          recorded_at?: string
          response_id?: string | null
          source?: string
          structured_payload?: Json
          unstructured_payload?: Json | null
        }
        Update: {
          contact_point_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          event_type?: string
          fhir_code?: string | null
          fhir_code_system?: string | null
          fhir_resource_type?: string | null
          id?: string
          patient_id?: string
          recorded_at?: string
          response_id?: string | null
          source?: string
          structured_payload?: Json
          unstructured_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_events_contact_point_id_fkey"
            columns: ["contact_point_id"]
            isOneToOne: false
            referencedRelation: "trail_contact_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "trail_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "clinical_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_events_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "trail_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          assessment: string | null
          chief_complaint: string | null
          consultation_date: string
          created_at: string
          follow_up_date: string | null
          id: string
          notes: string | null
          patient_id: string
          physical_examination: string | null
          plan: string | null
          professional_id: string
          updated_at: string
        }
        Insert: {
          assessment?: string | null
          chief_complaint?: string | null
          consultation_date?: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          physical_examination?: string | null
          plan?: string | null
          professional_id: string
          updated_at?: string
        }
        Update: {
          assessment?: string | null
          chief_complaint?: string | null
          consultation_date?: string
          created_at?: string
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          physical_examination?: string | null
          plan?: string | null
          professional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultations_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnoses: {
        Row: {
          change_reason: string | null
          consultation_id: string | null
          created_at: string
          diagnosed_date: string
          explanation_text: string | null
          icd_code: string | null
          id: string
          justification: string | null
          name: string
          patient_id: string
          previous_diagnosis_id: string | null
          private_notes: string | null
          public_notes: string | null
          resolved_date: string | null
          severity: string | null
          status: Database["public"]["Enums"]["diagnosis_status"]
          updated_at: string
        }
        Insert: {
          change_reason?: string | null
          consultation_id?: string | null
          created_at?: string
          diagnosed_date?: string
          explanation_text?: string | null
          icd_code?: string | null
          id?: string
          justification?: string | null
          name: string
          patient_id: string
          previous_diagnosis_id?: string | null
          private_notes?: string | null
          public_notes?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["diagnosis_status"]
          updated_at?: string
        }
        Update: {
          change_reason?: string | null
          consultation_id?: string | null
          created_at?: string
          diagnosed_date?: string
          explanation_text?: string | null
          icd_code?: string | null
          id?: string
          justification?: string | null
          name?: string
          patient_id?: string
          previous_diagnosis_id?: string | null
          private_notes?: string | null
          public_notes?: string | null
          resolved_date?: string | null
          severity?: string | null
          status?: Database["public"]["Enums"]["diagnosis_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnoses_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnoses_previous_diagnosis_id_fkey"
            columns: ["previous_diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      document_comments: {
        Row: {
          comment_text: string
          commented_by: string
          commented_by_role: string
          created_at: string
          document_id: string
          id: string
        }
        Insert: {
          comment_text: string
          commented_by: string
          commented_by_role: string
          created_at?: string
          document_id: string
          id?: string
        }
        Update: {
          comment_text?: string
          commented_by?: string
          commented_by_role?: string
          created_at?: string
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          confidence_score: number | null
          confirmed_at: string | null
          created_at: string
          document_date: string | null
          document_id: string
          error_message: string | null
          extracted_data: Json | null
          extraction_status: string
          id: string
          institution: string | null
          professional_name: string | null
          professional_registry: string | null
          raw_text: string | null
          specialty: string | null
          suggested_category: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          confirmed_at?: string | null
          created_at?: string
          document_date?: string | null
          document_id: string
          error_message?: string | null
          extracted_data?: Json | null
          extraction_status?: string
          id?: string
          institution?: string | null
          professional_name?: string | null
          professional_registry?: string | null
          raw_text?: string | null
          specialty?: string | null
          suggested_category?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          confirmed_at?: string | null
          created_at?: string
          document_date?: string | null
          document_id?: string
          error_message?: string | null
          extracted_data?: Json | null
          extraction_status?: string
          id?: string
          institution?: string | null
          professional_name?: string | null
          professional_registry?: string | null
          raw_text?: string | null
          specialty?: string | null
          suggested_category?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          analise_completa: Json | null
          category: string
          consultation_id: string | null
          created_at: string
          description: string | null
          document_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          is_public: boolean
          patient_id: string
          source_contact_point_id: string | null
          source_enrollment_id: string | null
          source_trail_id: string | null
          source_type: string | null
          updated_at: string
          uploaded_by: string
          uploaded_by_role: string
        }
        Insert: {
          analise_completa?: Json | null
          category: string
          consultation_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          is_public?: boolean
          patient_id: string
          source_contact_point_id?: string | null
          source_enrollment_id?: string | null
          source_trail_id?: string | null
          source_type?: string | null
          updated_at?: string
          uploaded_by: string
          uploaded_by_role: string
        }
        Update: {
          analise_completa?: Json | null
          category?: string
          consultation_id?: string | null
          created_at?: string
          description?: string | null
          document_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          is_public?: boolean
          patient_id?: string
          source_contact_point_id?: string | null
          source_enrollment_id?: string | null
          source_trail_id?: string | null
          source_type?: string | null
          updated_at?: string
          uploaded_by?: string
          uploaded_by_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_contact_point_id_fkey"
            columns: ["source_contact_point_id"]
            isOneToOne: false
            referencedRelation: "trail_contact_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_enrollment_id_fkey"
            columns: ["source_enrollment_id"]
            isOneToOne: false
            referencedRelation: "trail_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_source_trail_id_fkey"
            columns: ["source_trail_id"]
            isOneToOne: false
            referencedRelation: "care_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_audit_logs: {
        Row: {
          action: string
          action_details: Json | null
          created_at: string
          id: string
          ip_address: string | null
          patient_data_used: Json | null
          performed_by: string
          search_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          action_details?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          patient_data_used?: Json | null
          performed_by: string
          search_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_details?: Json | null
          created_at?: string
          id?: string
          ip_address?: string | null
          patient_data_used?: Json | null
          performed_by?: string
          search_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_audit_logs_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "evidence_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_quality_analyses: {
        Row: {
          analysis_version: string | null
          analyzed_by: string
          applicability:
            | Database["public"]["Enums"]["clinical_applicability"]
            | null
          applicability_factors: Json | null
          applicability_summary: string | null
          bias_domains: Json | null
          bias_risk: Database["public"]["Enums"]["bias_risk"] | null
          bias_summary: string | null
          created_at: string
          evidence_certainty:
            | Database["public"]["Enums"]["evidence_certainty"]
            | null
          evidence_result_id: string
          evidence_summary: string | null
          full_text_available: boolean
          full_text_source: string | null
          grade_factors: Json | null
          id: string
          limitations: string[] | null
          llm_model_used: string | null
          methodology_checklist: Json | null
          methodology_quality:
            | Database["public"]["Enums"]["methodology_quality"]
            | null
          methodology_score: number | null
          methodology_summary: string | null
          overall_recommendation: string | null
          patient_id: string
          pmc_id: string | null
          processing_duration_ms: number | null
          strengths: string[] | null
          study_design_details: Json | null
          study_type_detected: string
          updated_at: string
        }
        Insert: {
          analysis_version?: string | null
          analyzed_by: string
          applicability?:
            | Database["public"]["Enums"]["clinical_applicability"]
            | null
          applicability_factors?: Json | null
          applicability_summary?: string | null
          bias_domains?: Json | null
          bias_risk?: Database["public"]["Enums"]["bias_risk"] | null
          bias_summary?: string | null
          created_at?: string
          evidence_certainty?:
            | Database["public"]["Enums"]["evidence_certainty"]
            | null
          evidence_result_id: string
          evidence_summary?: string | null
          full_text_available?: boolean
          full_text_source?: string | null
          grade_factors?: Json | null
          id?: string
          limitations?: string[] | null
          llm_model_used?: string | null
          methodology_checklist?: Json | null
          methodology_quality?:
            | Database["public"]["Enums"]["methodology_quality"]
            | null
          methodology_score?: number | null
          methodology_summary?: string | null
          overall_recommendation?: string | null
          patient_id: string
          pmc_id?: string | null
          processing_duration_ms?: number | null
          strengths?: string[] | null
          study_design_details?: Json | null
          study_type_detected: string
          updated_at?: string
        }
        Update: {
          analysis_version?: string | null
          analyzed_by?: string
          applicability?:
            | Database["public"]["Enums"]["clinical_applicability"]
            | null
          applicability_factors?: Json | null
          applicability_summary?: string | null
          bias_domains?: Json | null
          bias_risk?: Database["public"]["Enums"]["bias_risk"] | null
          bias_summary?: string | null
          created_at?: string
          evidence_certainty?:
            | Database["public"]["Enums"]["evidence_certainty"]
            | null
          evidence_result_id?: string
          evidence_summary?: string | null
          full_text_available?: boolean
          full_text_source?: string | null
          grade_factors?: Json | null
          id?: string
          limitations?: string[] | null
          llm_model_used?: string | null
          methodology_checklist?: Json | null
          methodology_quality?:
            | Database["public"]["Enums"]["methodology_quality"]
            | null
          methodology_score?: number | null
          methodology_summary?: string | null
          overall_recommendation?: string | null
          patient_id?: string
          pmc_id?: string | null
          processing_duration_ms?: number | null
          strengths?: string[] | null
          study_design_details?: Json | null
          study_type_detected?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_quality_analyses_analyzed_by_fkey"
            columns: ["analyzed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_quality_analyses_evidence_result_id_fkey"
            columns: ["evidence_result_id"]
            isOneToOne: false
            referencedRelation: "evidence_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_quality_analyses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "evidence_quality_analyses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_results: {
        Row: {
          abstract: string | null
          authors: Json | null
          clinical_summary: string | null
          created_at: string
          doi: string | null
          evidence_level: string | null
          id: string
          journal: string | null
          patient_similarity_score: number | null
          pmc_id: string | null
          publication_date: string | null
          pubmed_id: string | null
          recency_score: number | null
          relevance_score: number | null
          search_id: string
          source_url: string | null
          study_quality_score: number | null
          study_type: Database["public"]["Enums"]["study_type"] | null
          title: string
          viewed_at: string | null
        }
        Insert: {
          abstract?: string | null
          authors?: Json | null
          clinical_summary?: string | null
          created_at?: string
          doi?: string | null
          evidence_level?: string | null
          id?: string
          journal?: string | null
          patient_similarity_score?: number | null
          pmc_id?: string | null
          publication_date?: string | null
          pubmed_id?: string | null
          recency_score?: number | null
          relevance_score?: number | null
          search_id: string
          source_url?: string | null
          study_quality_score?: number | null
          study_type?: Database["public"]["Enums"]["study_type"] | null
          title: string
          viewed_at?: string | null
        }
        Update: {
          abstract?: string | null
          authors?: Json | null
          clinical_summary?: string | null
          created_at?: string
          doi?: string | null
          evidence_level?: string | null
          id?: string
          journal?: string | null
          patient_similarity_score?: number | null
          pmc_id?: string | null
          publication_date?: string | null
          pubmed_id?: string | null
          recency_score?: number | null
          relevance_score?: number | null
          search_id?: string
          source_url?: string | null
          study_quality_score?: number | null
          study_type?: Database["public"]["Enums"]["study_type"] | null
          title?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_results_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "evidence_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_searches: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          generated_query: string | null
          id: string
          input_diagnoses: Json | null
          input_free_text: string | null
          input_treatments: Json | null
          patient_id: string
          pico_comparison: string | null
          pico_intervention: string | null
          pico_outcome: string | null
          pico_patient: string | null
          professional_id: string
          search_duration_ms: number | null
          status: Database["public"]["Enums"]["evidence_search_status"]
          total_results: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          generated_query?: string | null
          id?: string
          input_diagnoses?: Json | null
          input_free_text?: string | null
          input_treatments?: Json | null
          patient_id: string
          pico_comparison?: string | null
          pico_intervention?: string | null
          pico_outcome?: string | null
          pico_patient?: string | null
          professional_id: string
          search_duration_ms?: number | null
          status?: Database["public"]["Enums"]["evidence_search_status"]
          total_results?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          generated_query?: string | null
          id?: string
          input_diagnoses?: Json | null
          input_free_text?: string | null
          input_treatments?: Json | null
          patient_id?: string
          pico_comparison?: string | null
          pico_intervention?: string | null
          pico_outcome?: string | null
          pico_patient?: string | null
          professional_id?: string
          search_duration_ms?: number | null
          status?: Database["public"]["Enums"]["evidence_search_status"]
          total_results?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_searches_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "evidence_searches_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_searches_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          completed_date: string | null
          consultation_id: string | null
          created_at: string
          exam_type: string | null
          findings: string | null
          id: string
          interpretation: string | null
          name: string
          patient_id: string
          performed_by: string | null
          requested_by: string | null
          requested_date: string
          result: string | null
          result_file_path: string | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["exam_status"]
          updated_at: string
        }
        Insert: {
          completed_date?: string | null
          consultation_id?: string | null
          created_at?: string
          exam_type?: string | null
          findings?: string | null
          id?: string
          interpretation?: string | null
          name: string
          patient_id: string
          performed_by?: string | null
          requested_by?: string | null
          requested_date?: string
          result?: string | null
          result_file_path?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          updated_at?: string
        }
        Update: {
          completed_date?: string | null
          consultation_id?: string | null
          created_at?: string
          exam_type?: string | null
          findings?: string | null
          id?: string
          interpretation?: string | null
          name?: string
          patient_id?: string
          performed_by?: string | null
          requested_by?: string | null
          requested_date?: string
          result?: string | null
          result_file_path?: string | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "exams_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_concepts: {
        Row: {
          concept_type: Database["public"]["Enums"]["clinical_concept_type"]
          confidence_score: number | null
          created_at: string
          icd_code: string | null
          id: string
          mesh_term: string | null
          normalized_term: string
          original_term: string
          search_id: string
          snomed_code: string | null
        }
        Insert: {
          concept_type: Database["public"]["Enums"]["clinical_concept_type"]
          confidence_score?: number | null
          created_at?: string
          icd_code?: string | null
          id?: string
          mesh_term?: string | null
          normalized_term: string
          original_term: string
          search_id: string
          snomed_code?: string | null
        }
        Update: {
          concept_type?: Database["public"]["Enums"]["clinical_concept_type"]
          confidence_score?: number | null
          created_at?: string
          icd_code?: string | null
          id?: string
          mesh_term?: string | null
          normalized_term?: string
          original_term?: string
          search_id?: string
          snomed_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_concepts_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "evidence_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category: string | null
          completed_date: string | null
          consultation_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          patient_id: string
          priority: string | null
          private_notes: string | null
          progress: number | null
          public_notes: string | null
          source_trail_id: string | null
          source_type: string | null
          status: string
          target_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          completed_date?: string | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          patient_id: string
          priority?: string | null
          private_notes?: string | null
          progress?: number | null
          public_notes?: string | null
          source_trail_id?: string | null
          source_type?: string | null
          status?: string
          target_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          completed_date?: string | null
          consultation_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          patient_id?: string
          priority?: string | null
          private_notes?: string | null
          progress?: number | null
          public_notes?: string | null
          source_trail_id?: string | null
          source_type?: string | null
          status?: string
          target_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_source_trail_id_fkey"
            columns: ["source_trail_id"]
            isOneToOne: false
            referencedRelation: "care_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      insight_feedback: {
        Row: {
          action_notes: string | null
          action_taken: Database["public"]["Enums"]["feedback_action"] | null
          feedback_at: string
          id: string
          insight_id: string
          outcome_30d: Json | null
          outcome_30d_at: string | null
          outcome_60d: Json | null
          outcome_60d_at: string | null
          outcome_90d: Json | null
          outcome_90d_at: string | null
          patient_id: string
          rating: number | null
          was_relevant: boolean | null
        }
        Insert: {
          action_notes?: string | null
          action_taken?: Database["public"]["Enums"]["feedback_action"] | null
          feedback_at?: string
          id?: string
          insight_id: string
          outcome_30d?: Json | null
          outcome_30d_at?: string | null
          outcome_60d?: Json | null
          outcome_60d_at?: string | null
          outcome_90d?: Json | null
          outcome_90d_at?: string | null
          patient_id: string
          rating?: number | null
          was_relevant?: boolean | null
        }
        Update: {
          action_notes?: string | null
          action_taken?: Database["public"]["Enums"]["feedback_action"] | null
          feedback_at?: string
          id?: string
          insight_id?: string
          outcome_30d?: Json | null
          outcome_30d_at?: string | null
          outcome_60d?: Json | null
          outcome_60d_at?: string | null
          outcome_90d?: Json | null
          outcome_90d_at?: string | null
          patient_id?: string
          rating?: number | null
          was_relevant?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "insight_feedback_insight_id_fkey"
            columns: ["insight_id"]
            isOneToOne: false
            referencedRelation: "patient_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insight_feedback_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "insight_feedback_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      interested_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          specialty: string | null
          user_type: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          specialty?: string | null
          user_type: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          specialty?: string | null
          user_type?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: Database["public"]["Enums"]["knowledge_category"]
          content: string
          created_at: string
          doi: string | null
          embedding: string | null
          evidence_level: Database["public"]["Enums"]["evidence_level"]
          goal_relevance: Database["public"]["Enums"]["goal_type"][] | null
          id: string
          is_active: boolean
          key_findings: string[] | null
          last_retrieved: string | null
          published_year: number | null
          source_name: string
          source_url: string | null
          subcategory: string | null
          summary: string | null
          times_retrieved: number
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["knowledge_category"]
          content: string
          created_at?: string
          doi?: string | null
          embedding?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"]
          goal_relevance?: Database["public"]["Enums"]["goal_type"][] | null
          id?: string
          is_active?: boolean
          key_findings?: string[] | null
          last_retrieved?: string | null
          published_year?: number | null
          source_name: string
          source_url?: string | null
          subcategory?: string | null
          summary?: string | null
          times_retrieved?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["knowledge_category"]
          content?: string
          created_at?: string
          doi?: string | null
          embedding?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"]
          goal_relevance?: Database["public"]["Enums"]["goal_type"][] | null
          id?: string
          is_active?: boolean
          key_findings?: string[] | null
          last_retrieved?: string | null
          published_year?: number | null
          source_name?: string
          source_url?: string | null
          subcategory?: string | null
          summary?: string | null
          times_retrieved?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lab_results: {
        Row: {
          collection_date: string
          created_at: string
          document_id: string | null
          id: string
          lab_name: string | null
          marker_category: string | null
          marker_name: string
          patient_id: string | null
          reference_max: number | null
          reference_min: number | null
          reference_text: string | null
          status: string | null
          unit: string | null
          updated_at: string
          user_id: string
          value: number | null
          value_text: string | null
        }
        Insert: {
          collection_date?: string
          created_at?: string
          document_id?: string | null
          id?: string
          lab_name?: string | null
          marker_category?: string | null
          marker_name: string
          patient_id?: string | null
          reference_max?: number | null
          reference_min?: number | null
          reference_text?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string
          user_id: string
          value?: number | null
          value_text?: string | null
        }
        Update: {
          collection_date?: string
          created_at?: string
          document_id?: string | null
          id?: string
          lab_name?: string | null
          marker_category?: string | null
          marker_name?: string
          patient_id?: string | null
          reference_max?: number | null
          reference_min?: number | null
          reference_text?: string | null
          status?: string | null
          unit?: string | null
          updated_at?: string
          user_id?: string
          value?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          log_date: string
          meal_index: number
          meal_name: string | null
          notes: string | null
          nutrition_plan_id: string | null
          patient_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          log_date: string
          meal_index: number
          meal_name?: string | null
          notes?: string | null
          nutrition_plan_id?: string | null
          patient_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          log_date?: string
          meal_index?: number
          meal_name?: string | null
          notes?: string | null
          nutrition_plan_id?: string | null
          patient_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_nutrition_plan_id_fkey"
            columns: ["nutrition_plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "meal_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          patient_id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          patient_id: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          patient_id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      normalized_clinical_data: {
        Row: {
          clinical_event_id: string | null
          code: string
          code_system: string
          confidence_score: number | null
          created_at: string
          display_text: string
          id: string
          mapped_by: string
          original_text: string | null
          patient_outcome_id: string | null
        }
        Insert: {
          clinical_event_id?: string | null
          code: string
          code_system: string
          confidence_score?: number | null
          created_at?: string
          display_text: string
          id?: string
          mapped_by?: string
          original_text?: string | null
          patient_outcome_id?: string | null
        }
        Update: {
          clinical_event_id?: string | null
          code?: string
          code_system?: string
          confidence_score?: number | null
          created_at?: string
          display_text?: string
          id?: string
          mapped_by?: string
          original_text?: string | null
          patient_outcome_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "normalized_clinical_data_clinical_event_id_fkey"
            columns: ["clinical_event_id"]
            isOneToOne: false
            referencedRelation: "clinical_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "normalized_clinical_data_patient_outcome_id_fkey"
            columns: ["patient_outcome_id"]
            isOneToOne: false
            referencedRelation: "patient_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          avoided_foods: string[] | null
          carbs_grams: number | null
          carbs_percent: number | null
          created_at: string
          document_id: string | null
          end_date: string | null
          fat_grams: number | null
          fat_percent: number | null
          id: string
          meals: Json | null
          observations: string | null
          patient_id: string | null
          professional_name: string | null
          professional_registry: string | null
          protein_grams: number | null
          protein_percent: number | null
          recommended_foods: string[] | null
          restrictions: string[] | null
          start_date: string | null
          status: string | null
          supplements: Json | null
          total_calories: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avoided_foods?: string[] | null
          carbs_grams?: number | null
          carbs_percent?: number | null
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          fat_grams?: number | null
          fat_percent?: number | null
          id?: string
          meals?: Json | null
          observations?: string | null
          patient_id?: string | null
          professional_name?: string | null
          professional_registry?: string | null
          protein_grams?: number | null
          protein_percent?: number | null
          recommended_foods?: string[] | null
          restrictions?: string[] | null
          start_date?: string | null
          status?: string | null
          supplements?: Json | null
          total_calories?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avoided_foods?: string[] | null
          carbs_grams?: number | null
          carbs_percent?: number | null
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          fat_grams?: number | null
          fat_percent?: number | null
          id?: string
          meals?: Json | null
          observations?: string | null
          patient_id?: string | null
          professional_name?: string | null
          professional_registry?: string | null
          protein_grams?: number | null
          protein_percent?: number | null
          recommended_foods?: string[] | null
          restrictions?: string[] | null
          start_date?: string | null
          status?: string | null
          supplements?: Json | null
          total_calories?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plans_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "nutrition_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_goals: {
        Row: {
          baseline_snapshot: Json | null
          created_at: string
          goal: Database["public"]["Enums"]["goal_type"]
          id: string
          notes: string | null
          patient_id: string
          priority: Database["public"]["Enums"]["goal_priority"]
          status: Database["public"]["Enums"]["goal_status"]
          target_date: string | null
          target_metrics: Json | null
          updated_at: string
        }
        Insert: {
          baseline_snapshot?: Json | null
          created_at?: string
          goal: Database["public"]["Enums"]["goal_type"]
          id?: string
          notes?: string | null
          patient_id: string
          priority?: Database["public"]["Enums"]["goal_priority"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          target_metrics?: Json | null
          updated_at?: string
        }
        Update: {
          baseline_snapshot?: Json | null
          created_at?: string
          goal?: Database["public"]["Enums"]["goal_type"]
          id?: string
          notes?: string | null
          patient_id?: string
          priority?: Database["public"]["Enums"]["goal_priority"]
          status?: Database["public"]["Enums"]["goal_status"]
          target_date?: string | null
          target_metrics?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_goals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_insights: {
        Row: {
          category: Database["public"]["Enums"]["insight_category"]
          content: string
          created_at: string
          data_snapshot: Json | null
          expires_at: string | null
          goal_id: string | null
          id: string
          knowledge_chunk_ids: string[] | null
          model_used: string | null
          patient_id: string
          priority_score: number | null
          prompt_version: string | null
          recommendations: string[] | null
          status: Database["public"]["Enums"]["insight_status"]
          title: string
        }
        Insert: {
          category: Database["public"]["Enums"]["insight_category"]
          content: string
          created_at?: string
          data_snapshot?: Json | null
          expires_at?: string | null
          goal_id?: string | null
          id?: string
          knowledge_chunk_ids?: string[] | null
          model_used?: string | null
          patient_id: string
          priority_score?: number | null
          prompt_version?: string | null
          recommendations?: string[] | null
          status?: Database["public"]["Enums"]["insight_status"]
          title: string
        }
        Update: {
          category?: Database["public"]["Enums"]["insight_category"]
          content?: string
          created_at?: string
          data_snapshot?: Json | null
          expires_at?: string | null
          goal_id?: string | null
          id?: string
          knowledge_chunk_ids?: string[] | null
          model_used?: string | null
          patient_id?: string
          priority_score?: number | null
          prompt_version?: string | null
          recommendations?: string[] | null
          status?: Database["public"]["Enums"]["insight_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_insights_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "patient_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_insights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_insights_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_outcomes: {
        Row: {
          clinical_context: string | null
          created_at: string
          description: string | null
          enrollment_id: string | null
          fhir_code: string | null
          fhir_code_system: string | null
          fhir_resource_type: string | null
          id: string
          outcome_date: string
          outcome_type: string
          patient_id: string
          recorded_by: string
          related_diagnosis_id: string | null
          related_treatment_id: string | null
          severity: string | null
          structured_data: Json | null
        }
        Insert: {
          clinical_context?: string | null
          created_at?: string
          description?: string | null
          enrollment_id?: string | null
          fhir_code?: string | null
          fhir_code_system?: string | null
          fhir_resource_type?: string | null
          id?: string
          outcome_date?: string
          outcome_type: string
          patient_id: string
          recorded_by: string
          related_diagnosis_id?: string | null
          related_treatment_id?: string | null
          severity?: string | null
          structured_data?: Json | null
        }
        Update: {
          clinical_context?: string | null
          created_at?: string
          description?: string | null
          enrollment_id?: string | null
          fhir_code?: string | null
          fhir_code_system?: string | null
          fhir_resource_type?: string | null
          id?: string
          outcome_date?: string
          outcome_type?: string
          patient_id?: string
          recorded_by?: string
          related_diagnosis_id?: string | null
          related_treatment_id?: string | null
          severity?: string | null
          structured_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_outcomes_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "trail_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_outcomes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_outcomes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_outcomes_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_outcomes_related_diagnosis_id_fkey"
            columns: ["related_diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_outcomes_related_treatment_id_fkey"
            columns: ["related_treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_protocols: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_phase: number
          goal_id: string | null
          id: string
          patient_id: string
          phase_outcomes: Json | null
          protocol_id: string
          started_at: string
          status: Database["public"]["Enums"]["goal_status"]
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_phase?: number
          goal_id?: string | null
          id?: string
          patient_id: string
          phase_outcomes?: Json | null
          protocol_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["goal_status"]
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_phase?: number
          goal_id?: string | null
          id?: string
          patient_id?: string
          phase_outcomes?: Json | null
          protocol_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["goal_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_protocols_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "patient_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_protocols_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_protocols_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_protocols_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_reminders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          patient_id: string
          recurrence: string | null
          reminder_time: string | null
          reminder_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          patient_id: string
          recurrence?: string | null
          reminder_time?: string | null
          reminder_type?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          patient_id?: string
          recurrence?: string | null
          reminder_time?: string | null
          reminder_type?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "patient_reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          birthdate: string
          blood_type: string | null
          comorbidities: string[] | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          fall_risk: boolean | null
          frailty_score: number | null
          id: string
          medical_record_number: string | null
          medications: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          birthdate: string
          blood_type?: string | null
          comorbidities?: string[] | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fall_risk?: boolean | null
          frailty_score?: number | null
          id?: string
          medical_record_number?: string | null
          medications?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          birthdate?: string
          blood_type?: string | null
          comorbidities?: string[] | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          fall_risk?: boolean | null
          frailty_score?: number | null
          id?: string
          medical_record_number?: string | null
          medications?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_patient_links: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          professional_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          professional_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          professional_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "professional_patient_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "professional_patient_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_patient_links_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      professional_recommendations: {
        Row: {
          created_at: string | null
          dimension: string
          id: string
          patient_id: string | null
          priority: string | null
          professional_id: string | null
          race_event_id: string | null
          recommendation: string
          recovery_log_id: string | null
          specialty: string
          visible_to_patient: boolean | null
          workout_log_id: string | null
        }
        Insert: {
          created_at?: string | null
          dimension: string
          id?: string
          patient_id?: string | null
          priority?: string | null
          professional_id?: string | null
          race_event_id?: string | null
          recommendation: string
          recovery_log_id?: string | null
          specialty: string
          visible_to_patient?: boolean | null
          workout_log_id?: string | null
        }
        Update: {
          created_at?: string | null
          dimension?: string
          id?: string
          patient_id?: string | null
          priority?: string | null
          professional_id?: string | null
          race_event_id?: string | null
          recommendation?: string
          recovery_log_id?: string | null
          specialty?: string
          visible_to_patient?: boolean | null
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professional_recommendations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "professional_recommendations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_recommendations_race_event_id_fkey"
            columns: ["race_event_id"]
            isOneToOne: false
            referencedRelation: "race_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_recommendations_recovery_log_id_fkey"
            columns: ["recovery_log_id"]
            isOneToOne: false
            referencedRelation: "recovery_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "professional_recommendations_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_phases: {
        Row: {
          biomarkers_to_track: string[] | null
          created_at: string | null
          id: string
          knowledge_refs: string[] | null
          lifestyle_focus: string | null
          name: string
          nutrition_focus: string | null
          phase_number: number
          phase_targets: Json | null
          protocol_id: string
          supplementation: string | null
          training_focus: string | null
          week_end: number
          week_start: number
        }
        Insert: {
          biomarkers_to_track?: string[] | null
          created_at?: string | null
          id?: string
          knowledge_refs?: string[] | null
          lifestyle_focus?: string | null
          name: string
          nutrition_focus?: string | null
          phase_number: number
          phase_targets?: Json | null
          protocol_id: string
          supplementation?: string | null
          training_focus?: string | null
          week_end: number
          week_start: number
        }
        Update: {
          biomarkers_to_track?: string[] | null
          created_at?: string | null
          id?: string
          knowledge_refs?: string[] | null
          lifestyle_focus?: string | null
          name?: string
          nutrition_focus?: string | null
          phase_number?: number
          phase_targets?: Json | null
          protocol_id?: string
          supplementation?: string | null
          training_focus?: string | null
          week_end?: number
          week_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "protocol_phases_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          created_at: string | null
          description: string | null
          evidence_level: Database["public"]["Enums"]["evidence_level"] | null
          goal: Database["public"]["Enums"]["goal_type"]
          id: string
          is_active: boolean | null
          name: string
          source_refs: string[] | null
          total_weeks: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          goal: Database["public"]["Enums"]["goal_type"]
          id?: string
          is_active?: boolean | null
          name: string
          source_refs?: string[] | null
          total_weeks: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"] | null
          goal?: Database["public"]["Enums"]["goal_type"]
          id?: string
          is_active?: boolean | null
          name?: string
          source_refs?: string[] | null
          total_weeks?: number
        }
        Relationships: []
      }
      quality_analysis_audit_logs: {
        Row: {
          action: string
          action_details: Json | null
          analysis_id: string
          created_at: string
          id: string
          performed_by: string
        }
        Insert: {
          action: string
          action_details?: Json | null
          analysis_id: string
          created_at?: string
          id?: string
          performed_by: string
        }
        Update: {
          action?: string
          action_details?: Json | null
          analysis_id?: string
          created_at?: string
          id?: string
          performed_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_analysis_audit_logs_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "evidence_quality_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_analysis_audit_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      race_events: {
        Row: {
          created_at: string | null
          distance_km: number | null
          event_date: string
          event_type: string | null
          goal: string | null
          id: string
          location: string | null
          name: string
          patient_id: string | null
          planned_tss: number | null
          result_notes: string | null
          sport: string
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          distance_km?: number | null
          event_date: string
          event_type?: string | null
          goal?: string | null
          id?: string
          location?: string | null
          name: string
          patient_id?: string | null
          planned_tss?: number | null
          result_notes?: string | null
          sport: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          distance_km?: number | null
          event_date?: string
          event_type?: string | null
          goal?: string | null
          id?: string
          location?: string | null
          name?: string
          patient_id?: string | null
          planned_tss?: number | null
          result_notes?: string | null
          sport?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "race_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "race_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_logs: {
        Row: {
          created_at: string | null
          disposition_score: number | null
          energy_score: number | null
          free_notes: string | null
          hrv_rmssd: number | null
          id: string
          joint_score: number | null
          log_date: string
          muscle_score: number | null
          patient_id: string | null
          resting_heart_rate: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          source: string | null
          stress_score: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          disposition_score?: number | null
          energy_score?: number | null
          free_notes?: string | null
          hrv_rmssd?: number | null
          id?: string
          joint_score?: number | null
          log_date: string
          muscle_score?: number | null
          patient_id?: string | null
          resting_heart_rate?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          source?: string | null
          stress_score?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          disposition_score?: number | null
          energy_score?: number | null
          free_notes?: string | null
          hrv_rmssd?: number | null
          id?: string
          joint_score?: number | null
          log_date?: string
          muscle_score?: number | null
          patient_id?: string | null
          resting_heart_rate?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          source?: string | null
          stress_score?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "recovery_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      strava_tokens: {
        Row: {
          access_token: string | null
          athlete_id: number | null
          created_at: string | null
          expires_at: number | null
          id: string
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          athlete_id?: number | null
          created_at?: string | null
          expires_at?: number | null
          id?: string
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          athlete_id?: number | null
          created_at?: string | null
          expires_at?: number | null
          id?: string
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      supplements_log: {
        Row: {
          created_at: string
          id: string
          log_date: string
          notes: string | null
          patient_id: string | null
          product: string
          quantity: string | null
          timing: string
          training_plan_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          patient_id?: string | null
          product: string
          quantity?: string | null
          timing: string
          training_plan_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          patient_id?: string | null
          product?: string
          quantity?: string | null
          timing?: string
          training_plan_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplements_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "supplements_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplements_log_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_alerts: {
        Row: {
          alert_message: string
          alert_type: string
          contact_point_id: string | null
          created_at: string
          enrollment_id: string
          id: string
          is_read: boolean
          is_resolved: boolean
          read_at: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          response_id: string | null
          severity: string
        }
        Insert: {
          alert_message: string
          alert_type: string
          contact_point_id?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          is_read?: boolean
          is_resolved?: boolean
          read_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_id?: string | null
          severity?: string
        }
        Update: {
          alert_message?: string
          alert_type?: string
          contact_point_id?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          is_read?: boolean
          is_resolved?: boolean
          read_at?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          response_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_alerts_contact_point_id_fkey"
            columns: ["contact_point_id"]
            isOneToOne: false
            referencedRelation: "trail_contact_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_alerts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "trail_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_alerts_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_alerts_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "trail_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_conditional_rules: {
        Row: {
          action_config: Json
          action_type: string
          condition_type: string
          condition_value: string
          contact_point_id: string
          created_at: string
          id: string
        }
        Insert: {
          action_config: Json
          action_type: string
          condition_type: string
          condition_value: string
          contact_point_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          condition_type?: string
          condition_value?: string
          contact_point_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_conditional_rules_contact_point_id_fkey"
            columns: ["contact_point_id"]
            isOneToOne: false
            referencedRelation: "trail_contact_points"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_contact_points: {
        Row: {
          action_category: string
          continue_if_no_response: boolean | null
          created_at: string
          critical_keywords: string[] | null
          day_offset: number
          hour_of_day: number
          id: string
          message_content: string | null
          minute_of_day: number
          notify_professional_if_no_response: boolean | null
          point_type: Database["public"]["Enums"]["contact_point_type"]
          question_options: Json | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_max_occurrences: number | null
          recurrence_type: string
          reminder_hours_if_no_response: number | null
          requires_response: boolean
          sort_order: number
          structured_data_type:
            | Database["public"]["Enums"]["structured_data_type"]
            | null
          title: string
          trail_id: string
          updated_at: string
        }
        Insert: {
          action_category?: string
          continue_if_no_response?: boolean | null
          created_at?: string
          critical_keywords?: string[] | null
          day_offset?: number
          hour_of_day?: number
          id?: string
          message_content?: string | null
          minute_of_day?: number
          notify_professional_if_no_response?: boolean | null
          point_type: Database["public"]["Enums"]["contact_point_type"]
          question_options?: Json | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_max_occurrences?: number | null
          recurrence_type?: string
          reminder_hours_if_no_response?: number | null
          requires_response?: boolean
          sort_order?: number
          structured_data_type?:
            | Database["public"]["Enums"]["structured_data_type"]
            | null
          title: string
          trail_id: string
          updated_at?: string
        }
        Update: {
          action_category?: string
          continue_if_no_response?: boolean | null
          created_at?: string
          critical_keywords?: string[] | null
          day_offset?: number
          hour_of_day?: number
          id?: string
          message_content?: string | null
          minute_of_day?: number
          notify_professional_if_no_response?: boolean | null
          point_type?: Database["public"]["Enums"]["contact_point_type"]
          question_options?: Json | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_max_occurrences?: number | null
          recurrence_type?: string
          reminder_hours_if_no_response?: number | null
          requires_response?: boolean
          sort_order?: number
          structured_data_type?:
            | Database["public"]["Enums"]["structured_data_type"]
            | null
          title?: string
          trail_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_contact_points_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "care_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_enrollments: {
        Row: {
          completed_at: string | null
          context: string | null
          context_id: string | null
          created_at: string
          current_day: number
          enrolled_by: string
          exit_reason: string | null
          exited_at: string | null
          expected_end_date: string | null
          id: string
          last_interaction_at: string | null
          patient_id: string
          started_at: string
          status: Database["public"]["Enums"]["trail_enrollment_status"]
          trail_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          context?: string | null
          context_id?: string | null
          created_at?: string
          current_day?: number
          enrolled_by: string
          exit_reason?: string | null
          exited_at?: string | null
          expected_end_date?: string | null
          id?: string
          last_interaction_at?: string | null
          patient_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["trail_enrollment_status"]
          trail_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          context?: string | null
          context_id?: string | null
          created_at?: string
          current_day?: number
          enrolled_by?: string
          exit_reason?: string | null
          exited_at?: string | null
          expected_end_date?: string | null
          id?: string
          last_interaction_at?: string | null
          patient_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["trail_enrollment_status"]
          trail_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_enrollments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "trail_enrollments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_enrollments_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "care_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_exit_conditions: {
        Row: {
          created_at: string
          exit_config: Json | null
          exit_type: Database["public"]["Enums"]["trail_exit_type"]
          id: string
          trail_id: string
        }
        Insert: {
          created_at?: string
          exit_config?: Json | null
          exit_type: Database["public"]["Enums"]["trail_exit_type"]
          id?: string
          trail_id: string
        }
        Update: {
          created_at?: string
          exit_config?: Json | null
          exit_type?: Database["public"]["Enums"]["trail_exit_type"]
          id?: string
          trail_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_exit_conditions_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "care_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_responses: {
        Row: {
          contact_point_id: string
          created_at: string
          critical_keyword_matched: string | null
          enrollment_id: string
          fhir_resource_type: string | null
          id: string
          is_critical: boolean | null
          responded_at: string
          response_choice: string | null
          response_file_path: string | null
          response_numeric: number | null
          response_text: string | null
          response_type: string
          structured_payload: Json | null
          unstructured_payload: Json | null
        }
        Insert: {
          contact_point_id: string
          created_at?: string
          critical_keyword_matched?: string | null
          enrollment_id: string
          fhir_resource_type?: string | null
          id?: string
          is_critical?: boolean | null
          responded_at?: string
          response_choice?: string | null
          response_file_path?: string | null
          response_numeric?: number | null
          response_text?: string | null
          response_type: string
          structured_payload?: Json | null
          unstructured_payload?: Json | null
        }
        Update: {
          contact_point_id?: string
          created_at?: string
          critical_keyword_matched?: string | null
          enrollment_id?: string
          fhir_resource_type?: string | null
          id?: string
          is_critical?: boolean | null
          responded_at?: string
          response_choice?: string | null
          response_file_path?: string | null
          response_numeric?: number | null
          response_text?: string | null
          response_type?: string
          structured_payload?: Json | null
          unstructured_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "trail_responses_contact_point_id_fkey"
            columns: ["contact_point_id"]
            isOneToOne: false
            referencedRelation: "trail_contact_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_responses_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "trail_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_scheduled_dispatches: {
        Row: {
          contact_point_id: string
          created_at: string
          dispatch_result: Json | null
          dispatched_at: string | null
          enrollment_id: string
          id: string
          is_dispatched: boolean
          scheduled_for: string
        }
        Insert: {
          contact_point_id: string
          created_at?: string
          dispatch_result?: Json | null
          dispatched_at?: string | null
          enrollment_id: string
          id?: string
          is_dispatched?: boolean
          scheduled_for: string
        }
        Update: {
          contact_point_id?: string
          created_at?: string
          dispatch_result?: Json | null
          dispatched_at?: string | null
          enrollment_id?: string
          id?: string
          is_dispatched?: boolean
          scheduled_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_scheduled_dispatches_contact_point_id_fkey"
            columns: ["contact_point_id"]
            isOneToOne: false
            referencedRelation: "trail_contact_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_scheduled_dispatches_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "trail_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_task_instances: {
        Row: {
          action_category: string
          completed_at: string | null
          contact_point_id: string
          created_at: string
          description: string | null
          enrollment_id: string
          id: string
          ignore_reason: string | null
          ignored_at: string | null
          notes: string | null
          patient_id: string
          postponed_to: string | null
          professional_id: string
          scheduled_date: string
          scheduled_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          action_category?: string
          completed_at?: string | null
          contact_point_id: string
          created_at?: string
          description?: string | null
          enrollment_id: string
          id?: string
          ignore_reason?: string | null
          ignored_at?: string | null
          notes?: string | null
          patient_id: string
          postponed_to?: string | null
          professional_id: string
          scheduled_date: string
          scheduled_time?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          action_category?: string
          completed_at?: string | null
          contact_point_id?: string
          created_at?: string
          description?: string | null
          enrollment_id?: string
          id?: string
          ignore_reason?: string | null
          ignored_at?: string | null
          notes?: string | null
          patient_id?: string
          postponed_to?: string | null
          professional_id?: string
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trail_task_instances_contact_point_id_fkey"
            columns: ["contact_point_id"]
            isOneToOne: false
            referencedRelation: "trail_contact_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_task_instances_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "trail_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_task_instances_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "trail_task_instances_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_task_instances_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_triggers: {
        Row: {
          created_at: string
          id: string
          trail_id: string
          trigger_config: Json | null
          trigger_type: Database["public"]["Enums"]["trail_trigger_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          trail_id: string
          trigger_config?: Json | null
          trigger_type: Database["public"]["Enums"]["trail_trigger_type"]
        }
        Update: {
          created_at?: string
          id?: string
          trail_id?: string
          trigger_config?: Json | null
          trigger_type?: Database["public"]["Enums"]["trail_trigger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "trail_triggers_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "care_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      trail_version_history: {
        Row: {
          change_description: string | null
          changed_by: string
          created_at: string
          id: string
          snapshot: Json
          trail_id: string
          version: number
        }
        Insert: {
          change_description?: string | null
          changed_by: string
          created_at?: string
          id?: string
          snapshot: Json
          trail_id: string
          version: number
        }
        Update: {
          change_description?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          snapshot?: Json
          trail_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "trail_version_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trail_version_history_trail_id_fkey"
            columns: ["trail_id"]
            isOneToOne: false
            referencedRelation: "care_trails"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          created_at: string
          document_id: string | null
          end_date: string | null
          frequency_per_week: number | null
          id: string
          observations: string | null
          patient_id: string | null
          periodization_notes: string | null
          professional_name: string | null
          professional_registry: string | null
          sessions: Json | null
          sport: string | null
          start_date: string | null
          status: string | null
          strava_details: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          frequency_per_week?: number | null
          id?: string
          observations?: string | null
          patient_id?: string | null
          periodization_notes?: string | null
          professional_name?: string | null
          professional_registry?: string | null
          sessions?: Json | null
          sport?: string | null
          start_date?: string | null
          status?: string | null
          strava_details?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          frequency_per_week?: number | null
          id?: string
          observations?: string | null
          patient_id?: string | null
          periodization_notes?: string | null
          professional_name?: string | null
          professional_registry?: string | null
          sessions?: Json | null
          sport?: string | null
          start_date?: string | null
          status?: string | null
          strava_details?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "training_plans_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          change_reason: string | null
          consultation_id: string | null
          created_at: string
          description: string | null
          diagnosis_id: string | null
          dosage: string | null
          end_date: string | null
          explanation_text: string | null
          frequency: string | null
          id: string
          name: string
          patient_id: string
          prescribed_by: string | null
          previous_treatment_id: string | null
          private_notes: string | null
          public_notes: string | null
          start_date: string
          status: Database["public"]["Enums"]["treatment_status"]
          updated_at: string
        }
        Insert: {
          change_reason?: string | null
          consultation_id?: string | null
          created_at?: string
          description?: string | null
          diagnosis_id?: string | null
          dosage?: string | null
          end_date?: string | null
          explanation_text?: string | null
          frequency?: string | null
          id?: string
          name: string
          patient_id: string
          prescribed_by?: string | null
          previous_treatment_id?: string | null
          private_notes?: string | null
          public_notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["treatment_status"]
          updated_at?: string
        }
        Update: {
          change_reason?: string | null
          consultation_id?: string | null
          created_at?: string
          description?: string | null
          diagnosis_id?: string | null
          dosage?: string | null
          end_date?: string | null
          explanation_text?: string | null
          frequency?: string | null
          id?: string
          name?: string
          patient_id?: string
          prescribed_by?: string | null
          previous_treatment_id?: string | null
          private_notes?: string | null
          public_notes?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["treatment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_prescribed_by_fkey"
            columns: ["prescribed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_previous_treatment_id_fkey"
            columns: ["previous_treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          council_number: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          onboarding_completed: boolean
          panel_view_mode: string
          phone: string | null
          profession: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialty: string | null
          subspecialty: string | null
          updated_at: string
        }
        Insert: {
          council_number?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          onboarding_completed?: boolean
          panel_view_mode?: string
          phone?: string | null
          profession?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?: string | null
          subspecialty?: string | null
          updated_at?: string
        }
        Update: {
          council_number?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          onboarding_completed?: boolean
          panel_view_mode?: string
          phone?: string | null
          profession?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?: string | null
          subspecialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vital_signs: {
        Row: {
          created_at: string
          diastolic: number | null
          glucose: number | null
          glucose_moment: string | null
          heart_rate: number | null
          id: string
          patient_id: string
          recorded_at: string
          symptoms: string[] | null
          systolic: number | null
          type: string
          weight: number | null
          wellbeing: number | null
        }
        Insert: {
          created_at?: string
          diastolic?: number | null
          glucose?: number | null
          glucose_moment?: string | null
          heart_rate?: number | null
          id?: string
          patient_id: string
          recorded_at?: string
          symptoms?: string[] | null
          systolic?: number | null
          type: string
          weight?: number | null
          wellbeing?: number | null
        }
        Update: {
          created_at?: string
          diastolic?: number | null
          glucose?: number | null
          glucose_moment?: string | null
          heart_rate?: number | null
          id?: string
          patient_id?: string
          recorded_at?: string
          symptoms?: string[] | null
          systolic?: number | null
          type?: string
          weight?: number | null
          wellbeing?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "vital_signs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          id: string
          message: string
          patient_id: string
          severity: string
          vital_log_id: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          id?: string
          message: string
          patient_id: string
          severity: string
          vital_log_id?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          message?: string
          patient_id?: string
          severity?: string
          vital_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "vitals_alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_alerts_vital_log_id_fkey"
            columns: ["vital_log_id"]
            isOneToOne: false
            referencedRelation: "vitals_log"
            referencedColumns: ["id"]
          },
        ]
      }
      vitals_log: {
        Row: {
          alert_generated: boolean
          alert_severity: string | null
          created_at: string
          diastolic: number | null
          glucose_moment: string | null
          glucose_value: number | null
          heart_rate: number | null
          id: string
          notes: string | null
          patient_id: string
          symptoms: string[] | null
          systolic: number | null
          vital_type: string
          weight_value: number | null
          wellbeing_score: number | null
        }
        Insert: {
          alert_generated?: boolean
          alert_severity?: string | null
          created_at?: string
          diastolic?: number | null
          glucose_moment?: string | null
          glucose_value?: number | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          symptoms?: string[] | null
          systolic?: number | null
          vital_type: string
          weight_value?: number | null
          wellbeing_score?: number | null
        }
        Update: {
          alert_generated?: boolean
          alert_severity?: string | null
          created_at?: string
          diastolic?: number | null
          glucose_moment?: string | null
          glucose_value?: number | null
          heart_rate?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          symptoms?: string[] | null
          systolic?: number | null
          vital_type?: string
          weight_value?: number | null
          wellbeing_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "vitals_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_laps: {
        Row: {
          avg_cadence: number | null
          avg_heart_rate: number | null
          avg_speed_kmh: number | null
          created_at: string | null
          distance_km: number | null
          duration_seconds: number | null
          elevation_gain_m: number | null
          id: string
          intensity: string | null
          lap_index: number
          lap_trigger: string | null
          max_heart_rate: number | null
          max_speed_kmh: number | null
          patient_id: string | null
          total_calories: number | null
          user_id: string | null
          workout_log_id: string | null
        }
        Insert: {
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          avg_speed_kmh?: number | null
          created_at?: string | null
          distance_km?: number | null
          duration_seconds?: number | null
          elevation_gain_m?: number | null
          id?: string
          intensity?: string | null
          lap_index: number
          lap_trigger?: string | null
          max_heart_rate?: number | null
          max_speed_kmh?: number | null
          patient_id?: string | null
          total_calories?: number | null
          user_id?: string | null
          workout_log_id?: string | null
        }
        Update: {
          avg_cadence?: number | null
          avg_heart_rate?: number | null
          avg_speed_kmh?: number | null
          created_at?: string | null
          distance_km?: number | null
          duration_seconds?: number | null
          elevation_gain_m?: number | null
          id?: string
          intensity?: string | null
          lap_index?: number
          lap_trigger?: string | null
          max_heart_rate?: number | null
          max_speed_kmh?: number | null
          patient_id?: string | null
          total_calories?: number | null
          user_id?: string | null
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_laps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "workout_laps_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_laps_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          activity_date: string
          activity_name: string | null
          avg_heart_rate: number | null
          avg_pace_min_km: number | null
          calories: number | null
          compliance_pct: number | null
          created_at: string | null
          distance_km: number | null
          duration_minutes: number | null
          elevation_gain_m: number | null
          feeling_score: number | null
          hrv_rmssd: number | null
          id: string
          intensity_factor: number | null
          max_heart_rate: number | null
          min_heart_rate: number | null
          notes: string | null
          patient_id: string | null
          perceived_effort: number | null
          planned_distance_km: number | null
          planned_duration_minutes: number | null
          planned_pace_min_km: number | null
          planned_tss: number | null
          race_event_id: string | null
          raw_data: Json | null
          sleep_hours: number | null
          source: string | null
          spo2: number | null
          sport: string | null
          srpe: number | null
          training_plan_id: string | null
          tss: number | null
          user_id: string | null
          workout_steps: Json | null
        }
        Insert: {
          activity_date: string
          activity_name?: string | null
          avg_heart_rate?: number | null
          avg_pace_min_km?: number | null
          calories?: number | null
          compliance_pct?: number | null
          created_at?: string | null
          distance_km?: number | null
          duration_minutes?: number | null
          elevation_gain_m?: number | null
          feeling_score?: number | null
          hrv_rmssd?: number | null
          id?: string
          intensity_factor?: number | null
          max_heart_rate?: number | null
          min_heart_rate?: number | null
          notes?: string | null
          patient_id?: string | null
          perceived_effort?: number | null
          planned_distance_km?: number | null
          planned_duration_minutes?: number | null
          planned_pace_min_km?: number | null
          planned_tss?: number | null
          race_event_id?: string | null
          raw_data?: Json | null
          sleep_hours?: number | null
          source?: string | null
          spo2?: number | null
          sport?: string | null
          srpe?: number | null
          training_plan_id?: string | null
          tss?: number | null
          user_id?: string | null
          workout_steps?: Json | null
        }
        Update: {
          activity_date?: string
          activity_name?: string | null
          avg_heart_rate?: number | null
          avg_pace_min_km?: number | null
          calories?: number | null
          compliance_pct?: number | null
          created_at?: string | null
          distance_km?: number | null
          duration_minutes?: number | null
          elevation_gain_m?: number | null
          feeling_score?: number | null
          hrv_rmssd?: number | null
          id?: string
          intensity_factor?: number | null
          max_heart_rate?: number | null
          min_heart_rate?: number | null
          notes?: string | null
          patient_id?: string | null
          perceived_effort?: number | null
          planned_distance_km?: number | null
          planned_duration_minutes?: number | null
          planned_pace_min_km?: number | null
          planned_tss?: number | null
          race_event_id?: string | null
          raw_data?: Json | null
          sleep_hours?: number | null
          source?: string | null
          spo2?: number | null
          sport?: string | null
          srpe?: number | null
          training_plan_id?: string | null
          tss?: number | null
          user_id?: string | null
          workout_steps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "workout_logs_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_race_event_id_fkey"
            columns: ["race_event_id"]
            isOneToOne: false
            referencedRelation: "race_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_records: {
        Row: {
          altitude_m: number | null
          cadence: number | null
          created_at: string | null
          distance_km: number | null
          elapsed_seconds: number
          heart_rate: number | null
          id: string
          patient_id: string | null
          speed_kmh: number | null
          user_id: string | null
          workout_log_id: string | null
        }
        Insert: {
          altitude_m?: number | null
          cadence?: number | null
          created_at?: string | null
          distance_km?: number | null
          elapsed_seconds: number
          heart_rate?: number | null
          id?: string
          patient_id?: string | null
          speed_kmh?: number | null
          user_id?: string | null
          workout_log_id?: string | null
        }
        Update: {
          altitude_m?: number | null
          cadence?: number | null
          created_at?: string | null
          distance_km?: number | null
          elapsed_seconds?: number
          heart_rate?: number | null
          id?: string
          patient_id?: string | null
          speed_kmh?: number | null
          user_id?: string | null
          workout_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_ai_context"
            referencedColumns: ["patient_id"]
          },
          {
            foreignKeyName: "workout_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_records_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      patient_ai_context: {
        Row: {
          active_goals: Json | null
          active_protocol: Json | null
          adherence_rate_pct: number | null
          latest_insights_by_category: Json | null
          patient_id: string | null
        }
        Insert: {
          active_goals?: never
          active_protocol?: never
          adherence_rate_pct?: never
          latest_insights_by_category?: never
          patient_id?: string | null
        }
        Update: {
          active_goals?: never
          active_protocol?: never
          adherence_rate_pct?: never
          latest_insights_by_category?: never
          patient_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      bootstrap_user_profile: {
        Args: {
          _cpf: string
          _name: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      expire_old_insights: { Args: never; Returns: undefined }
      export_evidence_audit_report: {
        Args: {
          _end_date?: string
          _professional_id: string
          _start_date?: string
        }
        Returns: Json
      }
      get_primary_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_kb_retrieval: {
        Args: { chunk_ids: string[] }
        Returns: undefined
      }
      patient_is_enrolled_in_trail: {
        Args: { _trail_id: string; _user_id: string }
        Returns: boolean
      }
      professional_has_access_to_patient: {
        Args: { _patient_id: string; _professional_id: string }
        Returns: boolean
      }
      search_knowledge: {
        Args: {
          filter_category?: Database["public"]["Enums"]["knowledge_category"]
          filter_goal?: Database["public"]["Enums"]["goal_type"]
          match_count?: number
          min_evidence?: Database["public"]["Enums"]["evidence_level"]
          query_embedding: string
        }
        Returns: {
          category: Database["public"]["Enums"]["knowledge_category"]
          content: string
          evidence_level: Database["public"]["Enums"]["evidence_level"]
          id: string
          key_findings: string[]
          similarity: number
          source_name: string
          summary: string
          title: string
        }[]
      }
      search_patients_for_linking: {
        Args: { _professional_id: string; _search_name: string }
        Returns: {
          link_status: string
          patient_id: string
          patient_name: string
          patient_user_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "patient" | "professional" | "admin"
      bias_risk: "low" | "some_concerns" | "high" | "serious" | "critical"
      clinical_applicability: "high" | "moderate" | "low"
      clinical_concept_type:
        | "disease"
        | "medication"
        | "symptom"
        | "procedure"
        | "lab_test"
        | "outcome"
        | "demographic"
        | "other"
      contact_point_type:
        | "educational_message"
        | "open_question"
        | "closed_question"
        | "structured_data"
        | "reminder"
        | "professional_task"
      diagnosis_status: "active" | "resolved" | "under_observation"
      evidence_certainty: "high" | "moderate" | "low" | "very_low"
      evidence_level: "A" | "B" | "C" | "D" | "expert_opinion"
      evidence_search_status: "pending" | "processing" | "completed" | "failed"
      exam_status: "requested" | "in_progress" | "completed" | "cancelled"
      feedback_action:
        | "seguiu"
        | "nao_seguiu"
        | "parcialmente"
        | "nao_aplicavel"
      goal_priority: "primario" | "secundario"
      goal_status: "ativo" | "pausado" | "concluido" | "cancelado"
      goal_type:
        | "longevidade"
        | "performance_aerobica"
        | "performance_forca"
        | "perda_de_peso"
        | "ganho_de_massa"
        | "saude_metabolica"
        | "saude_cardiovascular"
        | "bem_estar_geral"
      insight_category:
        | "exames"
        | "nutricao"
        | "treinos"
        | "medicamentos"
        | "diagnosticos"
        | "correlacao_cruzada"
        | "alerta"
        | "progresso_objetivo"
      insight_status: "ativo" | "arquivado" | "superado"
      knowledge_category:
        | "cardiologia"
        | "metabolismo"
        | "nutricao"
        | "exercicio_aerobico"
        | "exercicio_forca"
        | "longevidade"
        | "sono"
        | "saude_mental"
        | "endocrinologia"
        | "biomarcadores"
        | "farmacologia"
        | "suplementacao"
      methodology_quality: "high" | "moderate" | "low" | "critically_low"
      structured_data_type:
        | "glucose"
        | "weight"
        | "blood_pressure"
        | "mood"
        | "pain_scale"
        | "adherence"
        | "custom_numeric"
        | "custom_text"
      study_type:
        | "guideline"
        | "meta_analysis"
        | "systematic_review"
        | "randomized_controlled_trial"
        | "cohort_study"
        | "case_control"
        | "case_report"
        | "expert_opinion"
        | "other"
      trail_enrollment_status: "active" | "completed" | "paused" | "exited"
      trail_exit_type:
        | "duration_complete"
        | "all_points_complete"
        | "return_scheduled"
        | "goals_reached"
        | "manual"
      trail_status: "draft" | "active" | "paused" | "archived"
      trail_trigger_type:
        | "manual"
        | "first_consultation"
        | "post_report"
        | "specific_diagnosis"
        | "patient_tag"
      treatment_status: "active" | "completed" | "discontinued" | "pending"
      user_role: "patient" | "professional" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["patient", "professional", "admin"],
      bias_risk: ["low", "some_concerns", "high", "serious", "critical"],
      clinical_applicability: ["high", "moderate", "low"],
      clinical_concept_type: [
        "disease",
        "medication",
        "symptom",
        "procedure",
        "lab_test",
        "outcome",
        "demographic",
        "other",
      ],
      contact_point_type: [
        "educational_message",
        "open_question",
        "closed_question",
        "structured_data",
        "reminder",
        "professional_task",
      ],
      diagnosis_status: ["active", "resolved", "under_observation"],
      evidence_certainty: ["high", "moderate", "low", "very_low"],
      evidence_level: ["A", "B", "C", "D", "expert_opinion"],
      evidence_search_status: ["pending", "processing", "completed", "failed"],
      exam_status: ["requested", "in_progress", "completed", "cancelled"],
      feedback_action: [
        "seguiu",
        "nao_seguiu",
        "parcialmente",
        "nao_aplicavel",
      ],
      goal_priority: ["primario", "secundario"],
      goal_status: ["ativo", "pausado", "concluido", "cancelado"],
      goal_type: [
        "longevidade",
        "performance_aerobica",
        "performance_forca",
        "perda_de_peso",
        "ganho_de_massa",
        "saude_metabolica",
        "saude_cardiovascular",
        "bem_estar_geral",
      ],
      insight_category: [
        "exames",
        "nutricao",
        "treinos",
        "medicamentos",
        "diagnosticos",
        "correlacao_cruzada",
        "alerta",
        "progresso_objetivo",
      ],
      insight_status: ["ativo", "arquivado", "superado"],
      knowledge_category: [
        "cardiologia",
        "metabolismo",
        "nutricao",
        "exercicio_aerobico",
        "exercicio_forca",
        "longevidade",
        "sono",
        "saude_mental",
        "endocrinologia",
        "biomarcadores",
        "farmacologia",
        "suplementacao",
      ],
      methodology_quality: ["high", "moderate", "low", "critically_low"],
      structured_data_type: [
        "glucose",
        "weight",
        "blood_pressure",
        "mood",
        "pain_scale",
        "adherence",
        "custom_numeric",
        "custom_text",
      ],
      study_type: [
        "guideline",
        "meta_analysis",
        "systematic_review",
        "randomized_controlled_trial",
        "cohort_study",
        "case_control",
        "case_report",
        "expert_opinion",
        "other",
      ],
      trail_enrollment_status: ["active", "completed", "paused", "exited"],
      trail_exit_type: [
        "duration_complete",
        "all_points_complete",
        "return_scheduled",
        "goals_reached",
        "manual",
      ],
      trail_status: ["draft", "active", "paused", "archived"],
      trail_trigger_type: [
        "manual",
        "first_consultation",
        "post_report",
        "specific_diagnosis",
        "patient_tag",
      ],
      treatment_status: ["active", "completed", "discontinued", "pending"],
      user_role: ["patient", "professional", "admin"],
    },
  },
} as const
