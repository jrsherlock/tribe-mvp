
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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      album_photos: {
        Row: {
          album_id: string | null
          caption: string | null
          created_at: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_public: boolean | null
          photo_url: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          photo_url: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_public?: boolean | null
          photo_url?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "album_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "photo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      checkin_group_shares: {
        Row: {
          checkin_id: string
          created_at: string | null
          group_id: string
        }
        Insert: {
          checkin_id: string
          created_at?: string | null
          group_id: string
        }
        Update: {
          checkin_id?: string
          created_at?: string | null
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_group_shares_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_group_shares_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string | null
          emotional_emojis: Json | null
          emotional_notes: string | null
          emotional_rating: number
          gratitude: Json | null
          id: string
          is_private: boolean | null
          mental_emojis: Json | null
          mental_notes: string | null
          mental_rating: number
          mood_emoji: string | null
          physical_emojis: Json | null
          physical_notes: string | null
          physical_rating: number
          social_emojis: Json | null
          social_notes: string | null
          social_rating: number
          spiritual_emojis: Json | null
          spiritual_notes: string | null
          spiritual_rating: number
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          checkin_date: string
          created_at?: string | null
          emotional_emojis?: Json | null
          emotional_notes?: string | null
          emotional_rating: number
          gratitude?: Json | null
          id?: string
          is_private?: boolean | null
          mental_emojis?: Json | null
          mental_notes?: string | null
          mental_rating: number
          mood_emoji?: string | null
          physical_emojis?: Json | null
          physical_notes?: string | null
          physical_rating: number
          social_emojis?: Json | null
          social_notes?: string | null
          social_rating: number
          spiritual_emojis?: Json | null
          spiritual_notes?: string | null
          spiritual_rating: number
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          checkin_date?: string
          created_at?: string | null
          emotional_emojis?: Json | null
          emotional_notes?: string | null
          emotional_rating?: number
          gratitude?: Json | null
          id?: string
          is_private?: boolean | null
          mental_emojis?: Json | null
          mental_notes?: string | null
          mental_rating?: number
          mood_emoji?: string | null
          physical_emojis?: Json | null
          physical_notes?: string | null
          physical_rating?: number
          social_emojis?: Json | null
          social_notes?: string | null
          social_rating?: number
          spiritual_emojis?: Json | null
          spiritual_notes?: string | null
          spiritual_rating?: number
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_interactions: {
        Row: {
          checkin_id: string | null
          content: string | null
          created_at: string | null
          emoji: string | null
          id: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          checkin_id?: string | null
          content?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          interaction_type: Database["public"]["Enums"]["interaction_type"]
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          checkin_id?: string | null
          content?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          interaction_type?: Database["public"]["Enums"]["interaction_type"]
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_interactions_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          created_at: string | null
          group_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          role: string
          tenant_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          role?: string
          tenant_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          role?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_albums: {
        Row: {
          cover_photo_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          photo_count: number | null
          tenant_id: string | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          photo_count?: number | null
          tenant_id?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cover_photo_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          photo_count?: number | null
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_albums_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      superusers: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tenant_members: {
        Row: {
          created_at: string | null
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          addiction_type: Database["public"]["Enums"]["addiction_type"] | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          email: string | null
          id: string
          is_public: boolean | null
          location: string | null
          phone: string | null
          sobriety_date: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          addiction_type?: Database["public"]["Enums"]["addiction_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          phone?: string | null
          sobriety_date?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          addiction_type?: Database["public"]["Enums"]["addiction_type"] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          phone?: string | null
          sobriety_date?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_user_data: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      create_tenant: {
        Args: { p_name: string; p_slug: string }
        Returns: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
      }
      get_my_role_in_tenant: {
        Args: { tenant_id_to_check: string }
        Returns: string
      }
      get_my_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_privacy_settings: {
        Args: { target_user_id: string }
        Returns: {
          is_public: boolean
        }[]
      }
    }
    Enums: {
      addiction_type: "alcohol" | "drugs" | "gambling" | "smoking" | "other"
      interaction_type: "comment" | "emoji_reaction"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      addiction_type: ["alcohol", "drugs", "gambling", "smoking", "other"],
      interaction_type: ["comment", "emoji_reaction"],
    },
  },
} as const
