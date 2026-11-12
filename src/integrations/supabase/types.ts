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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      test_runs: {
        Row: {
          browser: string
          checks: Json
          completed_at: string | null
          created_at: string
          critical_count: number
          device: string
          duration_ms: number | null
          id: string
          instructions: string | null
          is_sample: boolean
          issues_count: number
          mode: string
          profile: string
          score: number | null
          status: string
          suite_id: string | null
          summary: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          browser?: string
          checks?: Json
          completed_at?: string | null
          created_at?: string
          critical_count?: number
          device?: string
          duration_ms?: number | null
          id?: string
          instructions?: string | null
          is_sample?: boolean
          issues_count?: number
          mode?: string
          profile: string
          score?: number | null
          status?: string
          suite_id?: string | null
          summary?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          browser?: string
          checks?: Json
          completed_at?: string | null
          created_at?: string
          critical_count?: number
          device?: string
          duration_ms?: number | null
          id?: string
          instructions?: string | null
          is_sample?: boolean
          issues_count?: number
          mode?: string
          profile?: string
          score?: number | null
          status?: string
          suite_id?: string | null
          summary?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suites: {
        Row: {
          browsers: string[]
          created_at: string
          description: string | null
          devices: string[]
          enabled: boolean
          id: string
          is_sample: boolean
          name: string
          profile: string
          schedule: string
          target_url: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          browsers?: string[]
          created_at?: string
          description?: string | null
          devices?: string[]
          enabled?: boolean
          id?: string
          is_sample?: boolean
          name: string
          profile?: string
          schedule?: string
          target_url: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          browsers?: string[]
          created_at?: string
          description?: string | null
          devices?: string[]
          enabled?: boolean
          id?: string
          is_sample?: boolean
          name?: string
          profile?: string
          schedule?: string
          target_url?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          default_browser: string
          default_device: string
          default_profile: string
          display_name: string | null
          live_probe: boolean
          notify_on_failure: boolean
          pass_threshold: number
          updated_at: string
          user_id: string
          weekly_digest: boolean
        }
        Insert: {
          default_browser?: string
          default_device?: string
          default_profile?: string
          display_name?: string | null
          live_probe?: boolean
          notify_on_failure?: boolean
          pass_threshold?: number
          updated_at?: string
          user_id: string
          weekly_digest?: boolean
        }
        Update: {
          default_browser?: string
          default_device?: string
          default_profile?: string
          display_name?: string | null
          live_probe?: boolean
          notify_on_failure?: boolean
          pass_threshold?: number
          updated_at?: string
          user_id?: string
          weekly_digest?: boolean
        }
        Relationships: []
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
    Enums: {},
  },
} as const