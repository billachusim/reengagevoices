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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      collection_items: {
        Row: {
          collection_id: string
          id: string
          position: number
          story_id: string
        }
        Insert: {
          collection_id: string
          id?: string
          position?: number
          story_id: string
        }
        Update: {
          collection_id?: string
          id?: string
          position?: number
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          curator_id: string | null
          description: string | null
          id: string
          is_homepage: boolean
          is_public: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          curator_id?: string | null
          description?: string | null
          id?: string
          is_homepage?: boolean
          is_public?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          curator_id?: string | null
          description?: string | null
          id?: string
          is_homepage?: boolean
          is_public?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      creator_stats: {
        Row: {
          approved_count: number
          created_at: string
          points: number
          updated_at: string
          user_id: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          approved_count?: number
          created_at?: string
          points?: number
          updated_at?: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          approved_count?: number
          created_at?: string
          points?: number
          updated_at?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      elder_languages: {
        Row: {
          elder_id: string
          language_id: string
        }
        Insert: {
          elder_id: string
          language_id: string
        }
        Update: {
          elder_id?: string
          language_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elder_languages_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elder_languages_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      elders: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          is_homepage: boolean
          name: string
          photo_url: string | null
          primary_language_id: string | null
          region_id: string | null
          slug: string
          sort_order: number
          tribe_id: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          is_homepage?: boolean
          name: string
          photo_url?: string | null
          primary_language_id?: string | null
          region_id?: string | null
          slug: string
          sort_order?: number
          tribe_id?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          is_homepage?: boolean
          name?: string
          photo_url?: string | null
          primary_language_id?: string | null
          region_id?: string | null
          slug?: string
          sort_order?: number
          tribe_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elders_primary_language_id_fkey"
            columns: ["primary_language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elders_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elders_tribe_id_fkey"
            columns: ["tribe_id"]
            isOneToOne: false
            referencedRelation: "tribes"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          elder_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          elder_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          elder_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          created_at: string
          id: string
          iso_code: string | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          iso_code?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          iso_code?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      pending_stories: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          payload: Json
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["story_status"]
          submitter_id: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          payload?: Json
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["story_status"]
          submitter_id?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          payload?: Json
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["story_status"]
          submitter_id?: string | null
        }
        Relationships: []
      }
      play_history: {
        Row: {
          id: string
          ms_listened: number
          played_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          id?: string
          ms_listened?: number
          played_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          id?: string
          ms_listened?: number
          played_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_history_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      point_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          listener_id: string | null
          points: number
          story_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          listener_id?: string | null
          points: number
          story_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          listener_id?: string | null
          points?: number
          story_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_events_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferred_language: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          preferred_language?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          country: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          region: string | null
          slug: string
          village: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          region?: string | null
          slug: string
          village?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          region?: string | null
          slug?: string
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          audio_url: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number
          elder_id: string | null
          id: string
          is_featured: boolean
          language_id: string | null
          manuscript_filename: string | null
          manuscript_url: string | null
          play_count: number
          published_at: string | null
          region_id: string | null
          slug: string
          status: Database["public"]["Enums"]["story_status"]
          submitted_by: string | null
          title: string
          transcript_english: string | null
          transcript_original: string | null
          tribe_id: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number
          elder_id?: string | null
          id?: string
          is_featured?: boolean
          language_id?: string | null
          manuscript_filename?: string | null
          manuscript_url?: string | null
          play_count?: number
          published_at?: string | null
          region_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["story_status"]
          submitted_by?: string | null
          title: string
          transcript_english?: string | null
          transcript_original?: string | null
          tribe_id?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          audio_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_seconds?: number
          elder_id?: string | null
          id?: string
          is_featured?: boolean
          language_id?: string | null
          manuscript_filename?: string | null
          manuscript_url?: string | null
          play_count?: number
          published_at?: string | null
          region_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["story_status"]
          submitted_by?: string | null
          title?: string
          transcript_english?: string | null
          transcript_original?: string | null
          tribe_id?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_elder_id_fkey"
            columns: ["elder_id"]
            isOneToOne: false
            referencedRelation: "elders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_tribe_id_fkey"
            columns: ["tribe_id"]
            isOneToOne: false
            referencedRelation: "tribes"
            referencedColumns: ["id"]
          },
        ]
      }
      story_themes: {
        Row: {
          story_id: string
          theme_id: string
        }
        Insert: {
          story_id: string
          theme_id: string
        }
        Update: {
          story_id?: string
          theme_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_themes_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_themes_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["theme_kind"]
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["theme_kind"]
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["theme_kind"]
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tribes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_pending_story:
        | {
            Args: {
              _description?: string
              _elder_name: string
              _language?: string
              _mood?: string
              _pending_id: string
              _point_award?: number
              _region?: string
              _story_type?: string
              _title: string
              _transcript?: string
              _tribe?: string
              _verify_threshold?: number
            }
            Returns: string
          }
        | {
            Args: {
              _description?: string
              _elder_name: string
              _language?: string
              _mood?: string
              _pending_id: string
              _point_award?: number
              _region?: string
              _story_type?: string
              _title: string
              _transcript?: string
              _tribe?: string
              _verify_threshold?: number
              _youtube_url?: string
            }
            Returns: string
          }
      award_listen_point: {
        Args: {
          _listen_award?: number
          _listener_id: string
          _story_id: string
          _verify_threshold?: number
        }
        Returns: undefined
      }
      create_story: {
        Args: {
          _audio_url?: string
          _cover_url?: string
          _description?: string
          _duration_seconds?: number
          _elder_name?: string
          _is_featured?: boolean
          _language?: string
          _manuscript_filename?: string
          _manuscript_url?: string
          _mood?: string
          _region?: string
          _status?: string
          _story_type?: string
          _title: string
          _transcript_english?: string
          _transcript_original?: string
          _tribe?: string
          _youtube_url?: string
        }
        Returns: string
      }
      delete_collection: {
        Args: { _collection_id: string }
        Returns: undefined
      }
      delete_elder: { Args: { _elder_id: string }; Returns: undefined }
      delete_story: { Args: { _story_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_play_count: { Args: { _story_id: string }; Returns: undefined }
      reject_pending_story: {
        Args: { _pending_id: string; _reason: string }
        Returns: undefined
      }
      search_stories: {
        Args: { q: string }
        Returns: {
          audio_url: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_seconds: number
          elder_id: string | null
          id: string
          is_featured: boolean
          language_id: string | null
          manuscript_filename: string | null
          manuscript_url: string | null
          play_count: number
          published_at: string | null
          region_id: string | null
          slug: string
          status: Database["public"]["Enums"]["story_status"]
          submitted_by: string | null
          title: string
          transcript_english: string | null
          transcript_original: string | null
          tribe_id: string | null
          updated_at: string
          youtube_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "stories"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_collection_items: {
        Args: { _collection_id: string; _story_ids: string[] }
        Returns: undefined
      }
      set_creator_verified: {
        Args: { _user_id: string; _verified: boolean }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      sync_story_format_collections: {
        Args: { _story_id: string }
        Returns: undefined
      }
      update_story: {
        Args: {
          _audio_url?: string
          _cover_url?: string
          _description?: string
          _duration_seconds?: number
          _elder_name?: string
          _is_featured?: boolean
          _language?: string
          _manuscript_filename?: string
          _manuscript_url?: string
          _mood?: string
          _regenerate_slug?: boolean
          _region?: string
          _status?: string
          _story_id: string
          _story_type?: string
          _title?: string
          _transcript_english?: string
          _transcript_original?: string
          _tribe?: string
          _youtube_url?: string
        }
        Returns: undefined
      }
      upsert_collection: {
        Args: {
          _collection_id?: string
          _cover_url?: string
          _description?: string
          _is_homepage?: boolean
          _is_public?: boolean
          _sort_order?: number
          _title?: string
        }
        Returns: string
      }
      upsert_elder: {
        Args: {
          _bio?: string
          _elder_id?: string
          _is_homepage?: boolean
          _language?: string
          _name?: string
          _photo_url?: string
          _region?: string
          _sort_order?: number
          _tribe?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      story_status: "draft" | "pending" | "published" | "rejected"
      theme_kind: "type" | "mood"
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
      app_role: ["admin", "moderator", "user"],
      story_status: ["draft", "pending", "published", "rejected"],
      theme_kind: ["type", "mood"],
    },
  },
} as const
