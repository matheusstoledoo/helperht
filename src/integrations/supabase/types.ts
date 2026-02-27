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
      documents: {
        Row: {
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
      patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          birthdate: string
          blood_type: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          medical_record_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          birthdate: string
          blood_type?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          medical_record_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          birthdate?: string
          blood_type?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          medical_record_number?: string | null
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
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          profession: string | null
          role: Database["public"]["Enums"]["user_role"]
          specialty: string | null
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          profession?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          profession?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
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
      patient_is_enrolled_in_trail: {
        Args: { _trail_id: string; _user_id: string }
        Returns: boolean
      }
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
      evidence_search_status: "pending" | "processing" | "completed" | "failed"
      exam_status: "requested" | "in_progress" | "completed" | "cancelled"
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
      evidence_search_status: ["pending", "processing", "completed", "failed"],
      exam_status: ["requested", "in_progress", "completed", "cancelled"],
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
