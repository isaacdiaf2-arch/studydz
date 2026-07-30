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
          id: string
          institution_id: string
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
          id?: string
          institution_id: string
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
          id?: string
          institution_id?: string
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
            foreignKeyName: "exams_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
          id: string
          institution_id: string
          mime_type: string | null
          name: string
          owner_id: string
          subject_id: string | null
          url: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          institution_id: string
          mime_type?: string | null
          name: string
          owner_id: string
          subject_id?: string | null
          url: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          mime_type?: string | null
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
            foreignKeyName: "files_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
      institutions: {
        Row: {
          address: string | null
          commercial_register: string | null
          commune: string
          created_at: string
          email: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string | null
          phone: string
          primary_color: string | null
          status: Database["public"]["Enums"]["institution_status"]
          subscription_end: string | null
          type: string
          wilaya: string
        }
        Insert: {
          address?: string | null
          commercial_register?: string | null
          commune: string
          created_at?: string
          email: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id?: string | null
          phone: string
          primary_color?: string | null
          status?: Database["public"]["Enums"]["institution_status"]
          subscription_end?: string | null
          type: string
          wilaya: string
        }
        Update: {
          address?: string | null
          commercial_register?: string | null
          commune?: string
          created_at?: string
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          phone?: string
          primary_color?: string | null
          status?: Database["public"]["Enums"]["institution_status"]
          subscription_end?: string | null
          type?: string
          wilaya?: string
        }
        Relationships: []
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
          id: string
          institution_id: string
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
          id?: string
          institution_id: string
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
          id?: string
          institution_id?: string
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
            foreignKeyName: "lessons_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
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
      schedules: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string | null
          id: string
          institution_id: string
          start_time: string
          subject_id: string | null
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time?: string | null
          id?: string
          institution_id: string
          start_time: string
          subject_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string | null
          id?: string
          institution_id?: string
          start_time?: string
          subject_id?: string | null
          teacher_id?: string | null
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
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
      current_institution: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_institution_admin: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
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
      institution_status: "pending" | "active" | "suspended" | "expired"
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
      institution_status: ["pending", "active", "suspended", "expired"],
      payment_status: ["pending", "accepted", "rejected", "suspended"],
      question_type: ["mcq", "truefalse", "short"],
    },
  },
} as const
