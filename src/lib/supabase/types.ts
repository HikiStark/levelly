export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Questionnaire question options types
export type QuestionnaireQuestionOptions =
  | { id: string; text: string }[] // MCQ options
  | { min: number; max: number; labels?: Record<string, string> } // Rating options

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
          status: 'in_progress' | 'submitted' | 'grading' | 'graded'
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
          grading_progress: number | null
          grading_total: number | null
        }
        Insert: {
          id?: string
          assignment_id: string
          share_link_id?: string | null
          student_name?: string | null
          student_email?: string | null
          status?: 'in_progress' | 'submitted' | 'grading' | 'graded'
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
          grading_progress?: number | null
          grading_total?: number | null
        }
        Update: {
          id?: string
          assignment_id?: string
          share_link_id?: string | null
          student_name?: string | null
          student_email?: string | null
          status?: 'in_progress' | 'submitted' | 'grading' | 'graded'
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
          grading_progress?: number | null
          grading_total?: number | null
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
      questionnaire: {
        Row: {
          id: string
          assignment_id: string
          title: string
          description: string | null
          is_enabled: boolean
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          title?: string
          description?: string | null
          is_enabled?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          title?: string
          description?: string | null
          is_enabled?: boolean
          created_at?: string
        }
      }
      questionnaire_question: {
        Row: {
          id: string
          questionnaire_id: string
          type: 'text' | 'rating' | 'mcq'
          prompt: string
          options: QuestionnaireQuestionOptions | null
          is_required: boolean
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          questionnaire_id: string
          type: 'text' | 'rating' | 'mcq'
          prompt: string
          options?: QuestionnaireQuestionOptions | null
          is_required?: boolean
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          questionnaire_id?: string
          type?: 'text' | 'rating' | 'mcq'
          prompt?: string
          options?: QuestionnaireQuestionOptions | null
          is_required?: boolean
          order_index?: number
          created_at?: string
        }
      }
      questionnaire_response: {
        Row: {
          id: string
          questionnaire_id: string
          attempt_id: string
          submitted_at: string
        }
        Insert: {
          id?: string
          questionnaire_id: string
          attempt_id: string
          submitted_at?: string
        }
        Update: {
          id?: string
          questionnaire_id?: string
          attempt_id?: string
          submitted_at?: string
        }
      }
      questionnaire_answer: {
        Row: {
          id: string
          response_id: string
          question_id: string
          answer_text: string | null
          answer_rating: number | null
          answer_choice: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          response_id: string
          question_id: string
          answer_text?: string | null
          answer_rating?: number | null
          answer_choice?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          response_id?: string
          question_id?: string
          answer_text?: string | null
          answer_rating?: number | null
          answer_choice?: string | null
          submitted_at?: string
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

// Questionnaire types
export type Questionnaire = Database['public']['Tables']['questionnaire']['Row']
export type QuestionnaireQuestion = Database['public']['Tables']['questionnaire_question']['Row']
export type QuestionnaireResponse = Database['public']['Tables']['questionnaire_response']['Row']
export type QuestionnaireAnswer = Database['public']['Tables']['questionnaire_answer']['Row']

export type QuestionnaireWithQuestions = Questionnaire & {
  questions: QuestionnaireQuestion[]
}

export type QuestionnaireResponseWithAnswers = QuestionnaireResponse & {
  answers: (QuestionnaireAnswer & { question: QuestionnaireQuestion })[]
}
