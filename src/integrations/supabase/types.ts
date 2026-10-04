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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      academic_levels: {
        Row: {
          archived: boolean
          created_at: string
          duration_months: number | null
          id: string
          institution_id: string
          name: string
          order_index: number
          program_id: string | null
          specialization_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          duration_months?: number | null
          id?: string
          institution_id: string
          name: string
          order_index?: number
          program_id?: string | null
          specialization_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          duration_months?: number | null
          id?: string
          institution_id?: string
          name?: string
          order_index?: number
          program_id?: string | null
          specialization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_levels_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_levels_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_levels_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          body: string
          class_id: string | null
          created_at: string
          id: string
          institution_id: string
          title: string
        }
        Insert: {
          author_id: string
          body: string
          class_id?: string | null
          created_at?: string
          id?: string
          institution_id: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          class_id?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          description: string | null
          due_at: string | null
          group_id: string | null
          held_on: string | null
          id: string
          institution_id: string
          kind: string
          level_id: string | null
          max_score: number
          module_id: string | null
          program_id: string | null
          published: boolean
          published_at: string | null
          results_published: boolean
          skill_id: string | null
          specialization_id: string | null
          teacher_id: string | null
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          group_id?: string | null
          held_on?: string | null
          id?: string
          institution_id: string
          kind?: string
          level_id?: string | null
          max_score?: number
          module_id?: string | null
          program_id?: string | null
          published?: boolean
          published_at?: string | null
          results_published?: boolean
          skill_id?: string | null
          specialization_id?: string | null
          teacher_id?: string | null
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          due_at?: string | null
          group_id?: string | null
          held_on?: string | null
          id?: string
          institution_id?: string
          kind?: string
          level_id?: string | null
          max_score?: number
          module_id?: string | null
          program_id?: string | null
          published?: boolean
          published_at?: string | null
          results_published?: boolean
          skill_id?: string | null
          specialization_id?: string | null
          teacher_id?: string | null
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "academic_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      attempt_answers: {
        Row: {
          attempt_id: string
          awarded: number
          id: string
          institution_id: string
          is_correct: boolean | null
          option_id: string | null
          question_id: string
          text_answer: string | null
        }
        Insert: {
          attempt_id: string
          awarded?: number
          id?: string
          institution_id: string
          is_correct?: boolean | null
          option_id?: string | null
          question_id: string
          text_answer?: string | null
        }
        Update: {
          attempt_id?: string
          awarded?: number
          id?: string
          institution_id?: string
          is_correct?: boolean | null
          option_id?: string | null
          question_id?: string
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      attempts: {
        Row: {
          exam_id: string
          id: string
          institution_id: string
          max_score: number | null
          score: number | null
          started_at: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          exam_id: string
          id?: string
          institution_id: string
          max_score?: number | null
          score?: number | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          exam_id?: string
          id?: string
          institution_id?: string
          max_score?: number | null
          score?: number | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          class_id: string | null
          created_at: string
          group_id: string | null
          id: string
          institution_id: string
          minutes_late: number
          module_id: string | null
          period_index: number
          reason: string | null
          recorded_by: string | null
          session_date: string
          status: string
          student_id: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          institution_id: string
          minutes_late?: number
          module_id?: string | null
          period_index?: number
          reason?: string | null
          recorded_by?: string | null
          session_date?: string
          status?: string
          student_id: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          institution_id?: string
          minutes_late?: number
          module_id?: string | null
          period_index?: number
          reason?: string | null
          recorded_by?: string | null
          session_date?: string
          status?: string
          student_id?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          institution_id: string | null
          ip: string | null
          metadata: Json
          resource: string | null
          resource_id: string | null
          result: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          ip?: string | null
          metadata?: Json
          resource?: string | null
          resource_id?: string | null
          result?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          ip?: string | null
          metadata?: Json
          resource?: string | null
          resource_id?: string | null
          result?: string
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          created_at: string
          id: string
          identifier: string
          ip: string | null
          kind: string
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          ip?: string | null
          kind?: string
          success?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          ip?: string | null
          kind?: string
          success?: boolean
        }
        Relationships: []
      }
      change_requests: {
        Row: {
          created_at: string
          decision_note: string | null
          id: string
          institution_id: string | null
          new_values: Json
          old_values: Json
          requester_id: string
          reviewed_at: string | null
          reviewer_id: string | null
          status: string
          target: string
        }
        Insert: {
          created_at?: string
          decision_note?: string | null
          id?: string
          institution_id?: string | null
          new_values?: Json
          old_values?: Json
          requester_id: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          target?: string
        }
        Update: {
          created_at?: string
          decision_note?: string | null
          id?: string
          institution_id?: string | null
          new_values?: Json
          old_values?: Json
          requester_id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          status?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          name: string
          specialty: string | null
          stage: string | null
          stream: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          name: string
          specialty?: string | null
          stage?: string | null
          stream?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          specialty?: string | null
          stage?: string | null
          stream?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          actor_id: string | null
          contract_id: string
          created_at: string
          id: string
          institution_id: string
          note: string | null
          status: Database["public"]["Enums"]["contract_status"]
        }
        Insert: {
          actor_id?: string | null
          contract_id: string
          created_at?: string
          id?: string
          institution_id: string
          note?: string | null
          status: Database["public"]["Enums"]["contract_status"]
        }
        Update: {
          actor_id?: string | null
          contract_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amount: number
          approved_at: string | null
          body: string
          contract_number: string | null
          created_at: string
          duration_months: number
          expires_at: string | null
          id: string
          institution_id: string
          institution_signature: string | null
          institution_signed_at: string | null
          platform_signature: string | null
          platform_signed_at: string | null
          qr_payload: string | null
          signed_at: string | null
          snapshot: Json
          status: Database["public"]["Enums"]["contract_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          body: string
          contract_number?: string | null
          created_at?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          institution_id: string
          institution_signature?: string | null
          institution_signed_at?: string | null
          platform_signature?: string | null
          platform_signed_at?: string | null
          qr_payload?: string | null
          signed_at?: string | null
          snapshot?: Json
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          body?: string
          contract_number?: string | null
          created_at?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          institution_id?: string
          institution_signature?: string | null
          institution_signed_at?: string | null
          platform_signature?: string | null
          platform_signed_at?: string | null
          qr_payload?: string | null
          signed_at?: string | null
          snapshot?: Json
          status?: Database["public"]["Enums"]["contract_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          institution_id: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          institution_id: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          group_id: string | null
          id: string
          institution_id: string
          module_id: string | null
          published: boolean
          subject_id: string | null
          teacher_id: string
          title: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          group_id?: string | null
          id?: string
          institution_id: string
          module_id?: string | null
          published?: boolean
          subject_id?: string | null
          teacher_id: string
          title: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          group_id?: string | null
          id?: string
          institution_id?: string
          module_id?: string | null
          published?: boolean
          subject_id?: string | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          class_id: string | null
          created_at: string
          group_id: string | null
          id: string
          institution_id: string
          mime_type: string | null
          module_id: string | null
          name: string
          owner_id: string
          subject_id: string | null
          url: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          institution_id: string
          mime_type?: string | null
          module_id?: string | null
          name: string
          owner_id: string
          subject_id?: string | null
          url: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          institution_id?: string
          mime_type?: string | null
          module_id?: string | null
          name?: string
          owner_id?: string
          subject_id?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          created_at: string
          group_id: string
          id: string
          institution_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          institution_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          institution_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          archived: boolean
          capacity: number | null
          class_id: string | null
          created_at: string
          id: string
          institution_id: string
          level_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          capacity?: number | null
          class_id?: string | null
          created_at?: string
          id?: string
          institution_id: string
          level_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          capacity?: number | null
          class_id?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          level_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "academic_levels"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          assessment_id: string
          content: string | null
          created_at: string
          feedback: string | null
          file_url: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          institution_id: string
          student_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          institution_id: string
          student_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          content?: string | null
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          institution_id?: string
          student_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          accreditation_authority: string | null
          accreditation_number: string | null
          address: string | null
          archived_at: string | null
          commercial_register: string | null
          commune: string
          cover_url: string | null
          created_at: string
          daira: string | null
          email: string
          facebook_url: string | null
          founded_on: string | null
          id: string
          instagram_url: string | null
          is_trial: boolean
          legal_representative: string | null
          logo_url: string | null
          maps_url: string | null
          name: string
          name_fr: string | null
          owner_id: string | null
          phone: string
          primary_color: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["institution_status"]
          subscription_end: string | null
          trial_ends_at: string | null
          type: string
          website: string | null
          wilaya: string
        }
        Insert: {
          accreditation_authority?: string | null
          accreditation_number?: string | null
          address?: string | null
          archived_at?: string | null
          commercial_register?: string | null
          commune: string
          cover_url?: string | null
          created_at?: string
          daira?: string | null
          email: string
          facebook_url?: string | null
          founded_on?: string | null
          id?: string
          instagram_url?: string | null
          is_trial?: boolean
          legal_representative?: string | null
          logo_url?: string | null
          maps_url?: string | null
          name: string
          name_fr?: string | null
          owner_id?: string | null
          phone: string
          primary_color?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["institution_status"]
          subscription_end?: string | null
          trial_ends_at?: string | null
          type: string
          website?: string | null
          wilaya: string
        }
        Update: {
          accreditation_authority?: string | null
          accreditation_number?: string | null
          address?: string | null
          archived_at?: string | null
          commercial_register?: string | null
          commune?: string
          cover_url?: string | null
          created_at?: string
          daira?: string | null
          email?: string
          facebook_url?: string | null
          founded_on?: string | null
          id?: string
          instagram_url?: string | null
          is_trial?: boolean
          legal_representative?: string | null
          logo_url?: string | null
          maps_url?: string | null
          name?: string
          name_fr?: string | null
          owner_id?: string | null
          phone?: string
          primary_color?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["institution_status"]
          subscription_end?: string | null
          trial_ends_at?: string | null
          type?: string
          website?: string | null
          wilaya?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          id: string
          institution_id: string
          issued_at: string
          method: string
          number: string
          payment_id: string | null
          period_end: string | null
          period_start: string | null
          status: string
        }
        Insert: {
          amount?: number
          id?: string
          institution_id: string
          issued_at?: string
          method?: string
          number: string
          payment_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Update: {
          amount?: number
          id?: string
          institution_id?: string
          issued_at?: string
          method?: string
          number?: string
          payment_id?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          id: string
          institution_id: string
          lesson_id: string
          student_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          institution_id: string
          lesson_id: string
          student_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          institution_id?: string
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          class_id: string | null
          content: string | null
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          institution_id: string
          module_id: string | null
          pdf_url: string | null
          published: boolean
          subject_id: string | null
          teacher_id: string
          title: string
          video_url: string | null
        }
        Insert: {
          class_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          institution_id: string
          module_id?: string | null
          pdf_url?: string | null
          published?: boolean
          subject_id?: string | null
          teacher_id: string
          title: string
          video_url?: string | null
        }
        Update: {
          class_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          institution_id?: string
          module_id?: string | null
          pdf_url?: string | null
          published?: boolean
          subject_id?: string | null
          teacher_id?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          amount: number
          created_at: string
          deployment: string
          expires_on: string | null
          id: string
          installation_id: string | null
          institution_id: string
          issued_at: string
          license_key: string
          note: string | null
          revoked_at: string | null
          starts_on: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          deployment?: string
          expires_on?: string | null
          id?: string
          installation_id?: string | null
          institution_id: string
          issued_at?: string
          license_key: string
          note?: string | null
          revoked_at?: string | null
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deployment?: string
          expires_on?: string | null
          id?: string
          installation_id?: string | null
          institution_id?: string
          issued_at?: string
          license_key?: string
          note?: string | null
          revoked_at?: string | null
          starts_on?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: string
          identifier: string
          ip: string | null
          success: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          ip?: string | null
          success?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          ip?: string | null
          success?: boolean
        }
        Relationships: []
      }
      modules: {
        Row: {
          archived: boolean
          code: string | null
          coefficient: number
          created_at: string
          hours: number | null
          id: string
          institution_id: string
          level_id: string | null
          name: string
          specialization_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          code?: string | null
          coefficient?: number
          created_at?: string
          hours?: number | null
          id?: string
          institution_id: string
          level_id?: string | null
          name: string
          specialization_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          code?: string | null
          coefficient?: number
          created_at?: string
          hours?: number | null
          id?: string
          institution_id?: string
          level_id?: string | null
          name?: string
          specialization_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "academic_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_specialization_id_fkey"
            columns: ["specialization_id"]
            isOneToOne: false
            referencedRelation: "specializations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          institution_id: string | null
          link: string | null
          read_at: string | null
          recipient_id: string
          sender_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          link?: string | null
          read_at?: string | null
          recipient_id: string
          sender_id?: string | null
          title: string
          type?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          institution_id?: string | null
          link?: string | null
          read_at?: string | null
          recipient_id?: string
          sender_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      options: {
        Row: {
          id: string
          institution_id: string
          is_correct: boolean
          order_index: number
          question_id: string
          text: string
        }
        Insert: {
          id?: string
          institution_id: string
          is_correct?: boolean
          order_index?: number
          question_id: string
          text: string
        }
        Update: {
          id?: string
          institution_id?: string
          is_correct?: boolean
          order_index?: number
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          institution_id: string | null
          note: string | null
          resolved_at: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string
          target: string
          temp_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          institution_id?: string | null
          note?: string | null
          resolved_at?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string
          target?: string
          temp_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          institution_id?: string | null
          note?: string | null
          resolved_at?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          status?: string
          target?: string
          temp_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          institution_id: string
          method: string
          note: string | null
          paid_at: string
          proof_url: string | null
          reference: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          institution_id: string
          method?: string
          note?: string | null
          paid_at?: string
          proof_url?: string | null
          reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          institution_id?: string
          method?: string
          note?: string | null
          paid_at?: string
          proof_url?: string | null
          reference?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          institution_id: string | null
          last_name: string
          phone: string | null
          totp_backup_codes: string[] | null
          totp_enabled: boolean
          totp_secret: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string
          id: string
          institution_id?: string | null
          last_name?: string
          phone?: string | null
          totp_backup_codes?: string[] | null
          totp_enabled?: boolean
          totp_secret?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          institution_id?: string | null
          last_name?: string
          phone?: string | null
          totp_backup_codes?: string[] | null
          totp_enabled?: boolean
          totp_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          archived: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          institution_id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          institution_id: string
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          institution_id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          institution_id: string
          order_index: number
          points: number
          text: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          institution_id: string
          order_index?: number
          points?: number
          text: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          institution_id?: string
          order_index?: number
          points?: number
          text?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          institution_id: string
          note: string | null
          recorded_by: string | null
          score: number
          student_id: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          institution_id: string
          note?: string | null
          recorded_by?: string | null
          score: number
          student_id: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          note?: string | null
          recorded_by?: string | null
          score?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number | null
          created_at: string
          id: string
          institution_id: string
          name: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          id?: string
          institution_id: string
          name: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          archived: boolean
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          institution_id: string
          label: string | null
          period_index: number
          room_id: string | null
          start_time: string
          subject_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          class_id: string
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          institution_id: string
          label?: string | null
          period_index?: number
          room_id?: string | null
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          institution_id?: string
          label?: string | null
          period_index?: number
          room_id?: string | null
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institution_id: string
          module_id: string
          name: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institution_id: string
          module_id: string
          name: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institution_id?: string
          module_id?: string
          name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "skills_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      specializations: {
        Row: {
          archived: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          institution_id: string
          kind: string
          name: string
          program_id: string | null
          updated_at: string
        }
        Insert: {
          archived?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          institution_id: string
          kind?: string
          name: string
          program_id?: string | null
          updated_at?: string
        }
        Update: {
          archived?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          institution_id?: string
          kind?: string
          name?: string
          program_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specializations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specializations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          institution_id: string
          name: string
          teacher_id: string | null
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          institution_id: string
          name: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          name?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          address: string | null
          commune: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          institution_name: string | null
          last_name: string
          message: string | null
          phone: string
          wilaya: string | null
        }
        Insert: {
          address?: string | null
          commune?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          institution_name?: string | null
          last_name: string
          message?: string | null
          phone: string
          wilaya?: string | null
        }
        Update: {
          address?: string | null
          commune?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          institution_name?: string | null
          last_name?: string
          message?: string | null
          phone?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      trial_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          institution_name: string
          motivation: string
          note: string | null
          phone: string
          status: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          institution_name: string
          motivation: string
          note?: string | null
          phone: string
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          institution_name?: string
          motivation?: string
          note?: string | null
          phone?: string
          status?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_mfa: {
        Row: {
          confirmed_at: string | null
          created_at: string
          enabled: boolean
          last_used_step: number | null
          recovery_codes: string[]
          secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          enabled?: boolean
          last_used_step?: number | null
          recovery_codes?: string[]
          secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          enabled?: boolean
          last_used_step?: number | null
          recovery_codes?: string[]
          secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          institution_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_assessment: {
        Args: { _assessment_id: string }
        Returns: boolean
      }
      current_institution: { Args: never; Returns: string }
      expire_subscriptions: {
        Args: never
        Returns: {
          institution_id: string
          name: string
          subscription_end: string
        }[]
      }
      generate_installation_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      institution_access_valid: {
        Args: { _institution_id: string }
        Returns: boolean
      }
      is_group_member: { Args: { _group_id: string }; Returns: boolean }
      is_institution_admin: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      manages_assessment: { Args: { _assessment_id: string }; Returns: boolean }
      manages_institution: {
        Args: { _institution_id: string }
        Returns: boolean
      }
      student_has_module: { Args: { _module_id: string }; Returns: boolean }
      teaches_group: { Args: { _group_id: string }; Returns: boolean }
      teaches_module: { Args: { _module_id: string }; Returns: boolean }
      verify_license: {
        Args: {
          _installation_id?: string
          _institution_id: string
          _license_key: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "platform_admin" | "institution_admin" | "teacher" | "student"
      contract_status:
        | "created"
        | "awaiting_institution"
        | "awaiting_platform"
        | "approved"
        | "renewed"
        | "expired"
        | "cancelled"
      institution_status:
        | "pending"
        | "active"
        | "suspended"
        | "expired"
        | "approved"
        | "archived"
      payment_status: "pending" | "accepted" | "rejected" | "suspended"
      question_type: "mcq" | "truefalse" | "short"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["platform_admin", "institution_admin", "teacher", "student"],
      contract_status: [
        "created",
        "awaiting_institution",
        "awaiting_platform",
        "approved",
        "renewed",
        "expired",
        "cancelled",
      ],
      institution_status: [
        "pending",
        "active",
        "suspended",
        "expired",
        "approved",
        "archived",
      ],
      payment_status: ["pending", "accepted", "rejected", "suspended"],
      question_type: ["mcq", "truefalse", "short"],
    },
  },
} as const
