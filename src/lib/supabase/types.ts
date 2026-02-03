export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      teacher: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          created_at?: string
        }
      }
      assignment: {
        Row: {
          id: string
          teacher_id: string
          title: string
          description: string | null
          status: 'draft' | 'published' | 'archived'
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          title: string
          description?: string | null
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
        }
      }
      question: {
        Row: {
          id: string
          assignment_id: string
          type: 'mcq' | 'open'
          prompt: string
          choices: { id: string; text: string }[] | null
          correct_choice: string | null
          reference_answer: string | null
          rubric: string | null
          points: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          type: 'mcq' | 'open'
          prompt: string
          choices?: { id: string; text: string }[] | null
          correct_choice?: string | null
          reference_answer?: string | null
          rubric?: string | null
          points?: number
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          type?: 'mcq' | 'open'
          prompt?: string
          choices?: { id: string; text: string }[] | null
          correct_choice?: string | null
          reference_answer?: string | null
          rubric?: string | null
          points?: number
          order_index?: number
          created_at?: string
        }
      }
      share_link: {
        Row: {
          id: string
          assignment_id: string
          token: string
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          token: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          token?: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      attempt: {
        Row: {
          id: string
          assignment_id: string
          share_link_id: string | null
          student_name: string | null
          student_email: string | null
          status: 'in_progress' | 'submitted' | 'graded'
          started_at: string
          submitted_at: string | null
          mcq_score: number
          mcq_total: number
          open_score: number
          open_total: number
          total_score: number
          max_score: number
          level: string | null
          is_final: boolean
        }
        Insert: {
          id?: string
          assignment_id: string
          share_link_id?: string | null
          student_name?: string | null
          student_email?: string | null
          status?: 'in_progress' | 'submitted' | 'graded'
          started_at?: string
          submitted_at?: string | null
          mcq_score?: number
          mcq_total?: number
          open_score?: number
          open_total?: number
          total_score?: number
          max_score?: number
          level?: string | null
          is_final?: boolean
        }
        Update: {
          id?: string
          assignment_id?: string
          share_link_id?: string | null
          student_name?: string | null
          student_email?: string | null
          status?: 'in_progress' | 'submitted' | 'graded'
          started_at?: string
          submitted_at?: string | null
          mcq_score?: number
          mcq_total?: number
          open_score?: number
          open_total?: number
          total_score?: number
          max_score?: number
          level?: string | null
          is_final?: boolean
        }
      }
      answer: {
        Row: {
          id: string
          attempt_id: string
          question_id: string
          selected_choice: string | null
          answer_text: string | null
          is_correct: boolean | null
          score: number | null
          ai_feedback: string | null
          ai_graded_at: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          attempt_id: string
          question_id: string
          selected_choice?: string | null
          answer_text?: string | null
          is_correct?: boolean | null
          score?: number | null
          ai_feedback?: string | null
          ai_graded_at?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          attempt_id?: string
          question_id?: string
          selected_choice?: string | null
          answer_text?: string | null
          is_correct?: boolean | null
          score?: number | null
          ai_feedback?: string | null
          ai_graded_at?: string | null
          submitted_at?: string
        }
      }
      level_redirect: {
        Row: {
          id: string
          assignment_id: string
          level: string
          redirect_url: string
        }
        Insert: {
          id?: string
          assignment_id: string
          level: string
          redirect_url: string
        }
        Update: {
          id?: string
          assignment_id?: string
          level?: string
          redirect_url?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Teacher = Database['public']['Tables']['teacher']['Row']
export type Assignment = Database['public']['Tables']['assignment']['Row']
export type Question = Database['public']['Tables']['question']['Row']
export type ShareLink = Database['public']['Tables']['share_link']['Row']
export type Attempt = Database['public']['Tables']['attempt']['Row']
export type Answer = Database['public']['Tables']['answer']['Row']
export type LevelRedirect = Database['public']['Tables']['level_redirect']['Row']

// Extended types
export type AssignmentWithQuestions = Assignment & {
  questions: Question[]
}

export type AttemptWithAnswers = Attempt & {
  answers: (Answer & { question: Question })[]
}
