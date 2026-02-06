export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Question type enum
export type QuestionType = 'mcq' | 'open' | 'slider' | 'image_map'

// Slider configuration for slider questions
export interface SliderConfig {
  min: number
  max: number
  step: number
  correct_value: number
  tolerance: number // Answer is correct if within +/- tolerance
}

// Image map flag configuration
export interface ImageMapFlag {
  id: string
  x: number // 0-1 relative to image width
  y: number // 0-1 relative to image height
  label: string
  answer_type: 'text' | 'mcq' | 'slider'
  correct_answer: string
  choices?: { id: string; text: string }[] // For MCQ flags
  slider_config?: SliderConfig // For slider flags
  reference_answer?: string // For text flags (AI grading)
  points: number
}

// Image map configuration for image-map questions
export interface ImageMapConfig {
  base_image_url: string
  flags: ImageMapFlag[]
}

// Questionnaire question options types
export type QuestionnaireQuestionOptions =
  | { id: string; text: string }[] // MCQ options
  | { min: number; max: number; labels?: Record<string, string> } // Rating options

// Session status type
export type JourneyStatus = 'in_progress' | 'completed'

export interface Database {
  public: {
    Tables: {
      session: {
        Row: {
          id: string
          assignment_id: string
          title: string
          description: string | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          title: string
          description?: string | null
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          title?: string
          description?: string | null
          order_index?: number
          created_at?: string
        }
      }
      student_journey: {
        Row: {
          id: string
          assignment_id: string
          share_link_id: string | null
          student_name: string | null
          student_email: string | null
          current_session_index: number
          overall_status: JourneyStatus
          overall_level: string | null
          total_score: number
          max_score: number
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          assignment_id: string
          share_link_id?: string | null
          student_name?: string | null
          student_email?: string | null
          current_session_index?: number
          overall_status?: JourneyStatus
          overall_level?: string | null
          total_score?: number
          max_score?: number
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          assignment_id?: string
          share_link_id?: string | null
          student_name?: string | null
          student_email?: string | null
          current_session_index?: number
          overall_status?: JourneyStatus
          overall_level?: string | null
          total_score?: number
          max_score?: number
          started_at?: string
          completed_at?: string | null
        }
      }
      teacher: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string
          created_at: string
          data_consent_given: boolean
          data_consent_timestamp: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email: string
          created_at?: string
          data_consent_given?: boolean
          data_consent_timestamp?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string
          created_at?: string
          data_consent_given?: boolean
          data_consent_timestamp?: string | null
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
          show_correct_answers: boolean
          show_ai_feedback: boolean
        }
        Insert: {
          id?: string
          teacher_id: string
          title: string
          description?: string | null
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          show_correct_answers?: boolean
          show_ai_feedback?: boolean
        }
        Update: {
          id?: string
          teacher_id?: string
          title?: string
          description?: string | null
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          show_correct_answers?: boolean
          show_ai_feedback?: boolean
        }
      }
      question: {
        Row: {
          id: string
          assignment_id: string
          session_id: string | null
          type: QuestionType
          prompt: string
          choices: { id: string; text: string }[] | null
          correct_choice: string | null
          reference_answer: string | null
          rubric: string | null
          points: number
          order_index: number
          created_at: string
          image_url: string | null
          slider_config: SliderConfig | null
          image_map_config: ImageMapConfig | null
        }
        Insert: {
          id?: string
          assignment_id: string
          session_id?: string | null
          type: QuestionType
          prompt: string
          choices?: { id: string; text: string }[] | null
          correct_choice?: string | null
          reference_answer?: string | null
          rubric?: string | null
          points?: number
          order_index: number
          created_at?: string
          image_url?: string | null
          slider_config?: SliderConfig | null
          image_map_config?: ImageMapConfig | null
        }
        Update: {
          id?: string
          assignment_id?: string
          session_id?: string | null
          type?: QuestionType
          prompt?: string
          choices?: { id: string; text: string }[] | null
          correct_choice?: string | null
          reference_answer?: string | null
          rubric?: string | null
          points?: number
          order_index?: number
          created_at?: string
          image_url?: string | null
          slider_config?: SliderConfig | null
          image_map_config?: ImageMapConfig | null
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
          session_id: string | null
          journey_id: string | null
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
          session_id?: string | null
          journey_id?: string | null
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
          session_id?: string | null
          journey_id?: string | null
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
          slider_value: number | null
          image_map_answers: Record<string, string> | null
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
          slider_value?: number | null
          image_map_answers?: Record<string, string> | null
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
          slider_value?: number | null
          image_map_answers?: Record<string, string> | null
        }
      }
      level_redirect: {
        Row: {
          id: string
          assignment_id: string
          session_id: string | null
          level: string
          redirect_type: 'link' | 'embed'
          redirect_url: string | null
          embed_code: string | null
        }
        Insert: {
          id?: string
          assignment_id: string
          session_id?: string | null
          level: string
          redirect_type?: 'link' | 'embed'
          redirect_url?: string | null
          embed_code?: string | null
        }
        Update: {
          id?: string
          assignment_id?: string
          session_id?: string | null
          level?: string
          redirect_type?: 'link' | 'embed'
          redirect_url?: string | null
          embed_code?: string | null
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
export type Session = Database['public']['Tables']['session']['Row']
export type StudentJourney = Database['public']['Tables']['student_journey']['Row']

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

// Session-related extended types
export type SessionWithQuestions = Session & {
  questions: Question[]
}

export type AssignmentWithSessions = Assignment & {
  sessions: Session[]
}

export type AssignmentWithSessionsAndQuestions = Assignment & {
  sessions: SessionWithQuestions[]
}

export type StudentJourneyWithAttempts = StudentJourney & {
  attempts: (Attempt & { session: Session | null })[]
}

export type AttemptWithSession = Attempt & {
  session: Session | null
}
