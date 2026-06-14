// Supabase database types for the Increment backend.
// Generated with generate_typescript_types after the 2026-06-11 schema
// migrations (backend/initial-design). Regenerate whenever migrations change.
// Note: `workouts` and `user_profiles` are the LEGACY Swift-app tables, kept
// during the dual-run period; new client code should use the normalized
// tables (workout_sessions, profiles, ...).

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
      barcode_products: {
        Row: {
          barcode: string
          basis: string | null
          calories: number | null
          carbs_g: number
          created_at: string
          fat_g: number
          protein_g: number
          serving_size: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          barcode: string
          basis?: string | null
          calories?: number | null
          carbs_g?: number
          created_at?: string
          fat_g?: number
          protein_g?: number
          serving_size?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string
          basis?: string | null
          calories?: number | null
          carbs_g?: number
          created_at?: string
          fat_g?: number
          protein_g?: number
          serving_size?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      body_weight_goals: {
        Row: {
          created_at: string
          current_weight: number
          start_date: string
          starting_weight: number
          target_date: string
          target_weight: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_weight: number
          start_date: string
          starting_weight: number
          target_date: string
          target_weight: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_weight?: number
          start_date?: string
          starting_weight?: number
          target_date?: string
          target_weight?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_weight_logs: {
        Row: {
          created_at: string
          id: string
          measured_on: string
          source: string
          updated_at: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_on: string
          source?: string
          updated_at?: string
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_on?: string
          source?: string
          updated_at?: string
          user_id?: string
          weight?: number
        }
        Relationships: []
      }
      exercise_goals: {
        Row: {
          created_at: string
          current_weight: number
          exercise_id: string | null
          exercise_name: string
          id: string
          target_date: string | null
          target_weight: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_weight?: number
          exercise_id?: string | null
          exercise_name: string
          id?: string
          target_date?: string | null
          target_weight: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_weight?: number
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          target_date?: string | null
          target_weight?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_goals_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_sets: {
        Row: {
          created_at: string
          id: string
          position: number
          reps: number
          updated_at: string
          user_id: string
          weight: number
          workout_exercise_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          reps?: number
          updated_at?: string
          user_id: string
          weight?: number
          workout_exercise_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          reps?: number
          updated_at?: string
          user_id?: string
          weight?: number
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legacy_exercise_map: {
        Row: {
          created_at: string
          exercise_id: string
          original_name: string
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          original_name: string
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          original_name?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_exercise_map_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      macro_targets: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          protein_g: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          protein_g?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          protein_g?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_ingredients: {
        Row: {
          carbs_g: number
          created_at: string
          fat_g: number
          id: string
          meal_id: string
          name: string
          position: number
          protein_g: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          meal_id: string
          name: string
          position?: number
          protein_g?: number
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          fat_g?: number
          id?: string
          meal_id?: string
          name?: string
          position?: number
          protein_g?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_ingredients_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          calories: number | null
          carbs_g: number
          category: Database["public"]["Enums"]["meal_category"]
          created_at: string
          eaten_at: string | null
          eaten_on: string
          edited: boolean
          fat_g: number
          id: string
          protein_g: number
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number
          category: Database["public"]["Enums"]["meal_category"]
          created_at?: string
          eaten_at?: string | null
          eaten_on?: string
          edited?: boolean
          fat_g?: number
          id?: string
          protein_g?: number
          source?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number
          category?: Database["public"]["Enums"]["meal_category"]
          created_at?: string
          eaten_at?: string | null
          eaten_on?: string
          edited?: boolean
          fat_g?: number
          id?: string
          protein_g?: number
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string
          calorie_target: number | null
          created_at: string
          default_gym: string | null
          display_name: string
          units: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string
          calorie_target?: number | null
          created_at?: string
          default_gym?: string | null
          display_name?: string
          units?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string
          calorie_target?: number | null
          created_at?: string
          default_gym?: string | null
          display_name?: string
          units?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      split_day_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          position: number
          split_day_id: string
          target_reps: number | null
          target_weight: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          position?: number
          split_day_id: string
          target_reps?: number | null
          target_weight?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          position?: number
          split_day_id?: string
          target_reps?: number | null
          target_weight?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_day_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_day_exercises_split_day_id_fkey"
            columns: ["split_day_id"]
            isOneToOne: false
            referencedRelation: "split_days"
            referencedColumns: ["id"]
          },
        ]
      }
      split_days: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tracked_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          position: number
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          position?: number
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracked_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          bio: string | null
          body_weight_goal: Json | null
          created_at: string | null
          email: string
          goals: Json | null
          name: string
          profile_image_url: string | null
          updated_at: string | null
          user_id: string
          workout_split: Json | null
          workouts_goal: Json | null
        }
        Insert: {
          bio?: string | null
          body_weight_goal?: Json | null
          created_at?: string | null
          email: string
          goals?: Json | null
          name: string
          profile_image_url?: string | null
          updated_at?: string | null
          user_id: string
          workout_split?: Json | null
          workouts_goal?: Json | null
        }
        Update: {
          bio?: string | null
          body_weight_goal?: Json | null
          created_at?: string | null
          email?: string
          goals?: Json | null
          name?: string
          profile_image_url?: string | null
          updated_at?: string | null
          user_id?: string
          workout_split?: Json | null
          workouts_goal?: Json | null
        }
        Relationships: []
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          position: number
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          position?: number
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          position?: number
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_frequency_goals: {
        Row: {
          created_at: string
          monthly_target: number
          updated_at: string
          user_id: string
          weekly_target: number
        }
        Insert: {
          created_at?: string
          monthly_target?: number
          updated_at?: string
          user_id: string
          weekly_target?: number
        }
        Update: {
          created_at?: string
          monthly_target?: number
          updated_at?: string
          user_id?: string
          weekly_target?: number
        }
        Relationships: []
      }
      workout_sessions: {
        Row: {
          body_weight: number | null
          created_at: string
          duration_seconds: number | null
          id: string
          notes: string | null
          performed_at: string
          progress_photo_path: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body_weight?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          performed_at: string
          progress_photo_path?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body_weight?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          notes?: string | null
          performed_at?: string
          progress_photo_path?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          body_weight: number | null
          created_at: string | null
          date: string
          duration: number | null
          exercises: Json
          id: string
          name: string
          notes: string | null
          progress_photo_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          body_weight?: number | null
          created_at?: string | null
          date: string
          duration?: number | null
          exercises?: Json
          id?: string
          name: string
          notes?: string | null
          progress_photo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          body_weight?: number | null
          created_at?: string | null
          date?: string
          duration?: number | null
          exercises?: Json
          id?: string
          name?: string
          notes?: string | null
          progress_photo_url?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      meal_category: "breakfast" | "lunch" | "dinner" | "snacks"
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
      meal_category: ["breakfast", "lunch", "dinner", "snacks"],
    },
  },
} as const
