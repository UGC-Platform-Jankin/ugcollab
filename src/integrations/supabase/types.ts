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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      brand_profiles: {
        Row: {
          business_name: string
          business_type: string
          country: string | null
          created_at: string
          description: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          business_name: string
          business_type: string
          country?: string | null
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          business_name?: string
          business_type?: string
          country?: string | null
          created_at?: string
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      campaign_applications: {
        Row: {
          agreed_price_per_video: number | null
          agreed_video_count: number | null
          campaign_id: string
          cover_letter: string
          created_at: string
          creator_user_id: string
          id: string
          pricing_status: string | null
          proposed_price_per_video: number | null
          proposed_video_count: number | null
          status: string
          updated_at: string
          videos_delivered: number
        }
        Insert: {
          agreed_price_per_video?: number | null
          agreed_video_count?: number | null
          campaign_id: string
          cover_letter: string
          created_at?: string
          creator_user_id: string
          id?: string
          pricing_status?: string | null
          proposed_price_per_video?: number | null
          proposed_video_count?: number | null
          status?: string
          updated_at?: string
          videos_delivered?: number
        }
        Update: {
          agreed_price_per_video?: number | null
          agreed_video_count?: number | null
          campaign_id?: string
          cover_letter?: string
          created_at?: string
          creator_user_id?: string
          id?: string
          pricing_status?: string | null
          proposed_price_per_video?: number | null
          proposed_video_count?: number | null
          status?: string
          updated_at?: string
          videos_delivered?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_invites: {
        Row: {
          brand_user_id: string
          campaign_id: string
          created_at: string
          creator_user_id: string
          id: string
          message: string | null
          proposed_price_per_video: number | null
          proposed_video_count: number | null
          status: string
        }
        Insert: {
          brand_user_id: string
          campaign_id: string
          created_at?: string
          creator_user_id: string
          id?: string
          message?: string | null
          proposed_price_per_video?: number | null
          proposed_video_count?: number | null
          status?: string
        }
        Update: {
          brand_user_id?: string
          campaign_id?: string
          created_at?: string
          creator_user_id?: string
          id?: string
          message?: string | null
          proposed_price_per_video?: number | null
          proposed_video_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_invites_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_resources: {
        Row: {
          campaign_id: string
          content: string | null
          created_at: string
          display_order: number
          file_url: string | null
          id: string
          title: string
          type: string
        }
        Insert: {
          campaign_id: string
          content?: string | null
          created_at?: string
          display_order?: number
          file_url?: string | null
          id?: string
          title: string
          type?: string
        }
        Update: {
          campaign_id?: string
          content?: string | null
          created_at?: string
          display_order?: number
          file_url?: string | null
          id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_resources_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_user_id: string
          budget: number | null
          calendly_enabled: boolean
          calendly_link: string | null
          campaign_length_days: number | null
          campaign_type: string
          communication_type: string
          created_at: string
          description: string | null
          expected_video_count: number
          external_comm_link: string | null
          group_chat_enabled: boolean
          id: string
          is_free_product: boolean
          max_creators: number
          platforms: string[] | null
          posting_schedule_enabled: boolean
          price_per_video: number | null
          pricing_mode: string
          request_contact_types: string[] | null
          requirements: string | null
          status: string
          target_regions: string[]
          title: string
          total_budget: number | null
          updated_at: string
          videos_mode: string
        }
        Insert: {
          brand_user_id: string
          budget?: number | null
          calendly_enabled?: boolean
          calendly_link?: string | null
          campaign_length_days?: number | null
          campaign_type?: string
          communication_type?: string
          created_at?: string
          description?: string | null
          expected_video_count?: number
          external_comm_link?: string | null
          group_chat_enabled?: boolean
          id?: string
          is_free_product?: boolean
          max_creators?: number
          platforms?: string[] | null
          posting_schedule_enabled?: boolean
          price_per_video?: number | null
          pricing_mode?: string
          request_contact_types?: string[] | null
          requirements?: string | null
          status?: string
          target_regions?: string[]
          title: string
          total_budget?: number | null
          updated_at?: string
          videos_mode?: string
        }
        Update: {
          brand_user_id?: string
          budget?: number | null
          calendly_enabled?: boolean
          calendly_link?: string | null
          campaign_length_days?: number | null
          campaign_type?: string
          communication_type?: string
          created_at?: string
          description?: string | null
          expected_video_count?: number
          external_comm_link?: string | null
          group_chat_enabled?: boolean
          id?: string
          is_free_product?: boolean
          max_creators?: number
          platforms?: string[] | null
          posting_schedule_enabled?: boolean
          price_per_video?: number | null
          pricing_mode?: string
          request_contact_types?: string[] | null
          requirements?: string | null
          status?: string
          target_regions?: string[]
          title?: string
          total_budget?: number | null
          updated_at?: string
          videos_mode?: string
        }
        Relationships: []
      }
      chat_participants: {
        Row: {
          chat_room_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          chat_room_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          chat_room_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          name: string | null
          type: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          type?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          type?: string
        }
        Relationships: []
      }
      contact_shares: {
        Row: {
          campaign_id: string
          contact_type: string
          contact_value: string
          created_at: string
          creator_user_id: string
          id: string
        }
        Insert: {
          campaign_id: string
          contact_type: string
          contact_value: string
          created_at?: string
          creator_user_id: string
          id?: string
        }
        Update: {
          campaign_id?: string
          contact_type?: string
          contact_value?: string
          created_at?: string
          creator_user_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_shares_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_spotlights: {
        Row: {
          created_at: string
          creator_user_id: string
          display_order: number
          headline: string | null
          id: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          creator_user_id: string
          display_order?: number
          headline?: string | null
          id?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          creator_user_id?: string
          display_order?: number
          headline?: string | null
          id?: string
          visible?: boolean
        }
        Relationships: []
      }
      homepage_brands: {
        Row: {
          brand_name: string
          created_at: string
          display_order: number
          id: string
          logo_url: string | null
          visible: boolean
          website_url: string | null
        }
        Insert: {
          brand_name: string
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          visible?: boolean
          website_url?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string
          display_order?: number
          id?: string
          logo_url?: string | null
          visible?: boolean
          website_url?: string | null
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          chat_room_id: string
          content: string
          created_at: string
          id: string
          pinned: boolean
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          chat_room_id: string
          content: string
          created_at?: string
          id?: string
          pinned?: boolean
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          chat_room_id?: string
          content?: string
          created_at?: string
          id?: string
          pinned?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      past_collaborations: {
        Row: {
          brand_name: string
          created_at: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          brand_name: string
          created_at?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          brand_name?: string
          created_at?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      posted_video_links: {
        Row: {
          created_at: string
          id: string
          platform: string
          schedule_event_id: string | null
          submission_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          schedule_event_id?: string | null
          submission_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          schedule_event_id?: string | null
          submission_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "posted_video_links_schedule_event_id_fkey"
            columns: ["schedule_event_id"]
            isOneToOne: false
            referencedRelation: "posting_schedule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posted_video_links_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "video_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      posting_schedule: {
        Row: {
          campaign_id: string
          created_at: string
          description: string
          event_date: string
          id: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description: string
          event_date: string
          id?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string
          event_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posting_schedule_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          content_types: string[] | null
          country: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          content_types?: string[] | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          content_types?: string[] | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved: boolean
          content: string
          created_at: string
          id: string
          rating: number
          reviewer_type: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          content: string
          created_at?: string
          id?: string
          rating?: number
          reviewer_type?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          content?: string
          created_at?: string
          id?: string
          rating?: number
          reviewer_type?: string
          user_id?: string
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          access_token: string | null
          average_views: number | null
          connected_at: string
          followers_count: number | null
          following_count: number | null
          id: string
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          profile_picture_url: string | null
          profile_url: string | null
          refresh_token: string | null
          updated_at: string
          user_id: string
          video_count: number | null
        }
        Insert: {
          access_token?: string | null
          average_views?: number | null
          connected_at?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          profile_picture_url?: string | null
          profile_url?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id: string
          video_count?: number | null
        }
        Update: {
          access_token?: string | null
          average_views?: number | null
          connected_at?: string
          followers_count?: number | null
          following_count?: number | null
          id?: string
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          profile_picture_url?: string | null
          profile_url?: string | null
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
          video_count?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_submissions: {
        Row: {
          campaign_id: string
          created_at: string
          creator_user_id: string
          feedback: string | null
          id: string
          status: string
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_user_id: string
          feedback?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_user_id?: string
          feedback?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_chat_participant: {
        Args: { _room_id: string; _user_id: string }
        Returns: undefined
      }
      create_chat_room:
        | {
            Args: { _campaign_id: string; _name: string; _type: string }
            Returns: string
          }
        | {
            Args: {
              _campaign_id: string
              _other_user_id: string
              _type: string
            }
            Returns: string
          }
      find_or_create_private_room: {
        Args: { _campaign_id: string; _other_user_id: string; _user_id: string }
        Returns: string
      }
      force_insert_chat_room: {
        Args: { _campaign_id: string; _name: string; _type: string }
        Returns: string
      }
      get_campaign_creator_emails: {
        Args: { _campaign_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_private_rooms: {
        Args: { _campaign_id: string; _user_id: string }
        Returns: {
          last_msg_at: string
          last_msg_content: string
          other_avatar_url: string
          other_business_name: string
          other_display_name: string
          other_user_id: string
          room_id: string
          room_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_participant: { Args: { _chat_room_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
