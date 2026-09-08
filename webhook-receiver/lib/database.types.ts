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
      conversations: {
        Row: {
          created_at: string | null
          id: string
          messenger_id: string
          token_usage: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          messenger_id: string
          token_usage?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          messenger_id?: string
          token_usage?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_info: {
        Row: {
          customer_address: string | null
          customer_phone: string | null
          driver_id: string | null
          id: string
          order_id: number
        }
        Insert: {
          customer_address?: string | null
          customer_phone?: string | null
          driver_id?: string | null
          id?: string
          order_id: number
        }
        Update: {
          customer_address?: string | null
          customer_phone?: string | null
          driver_id?: string | null
          id?: string
          order_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_info_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "delivery_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_info_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_drivers: {
        Row: {
          availability_status: Database["public"]["Enums"]["driver_availability_enum"]
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["driver_availability_enum"]
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["driver_availability_enum"]
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          active: boolean
          active_toppings: string[]
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          active_toppings?: string[]
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          active_toppings?: string[]
          id?: string
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          message_text: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_text: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          message_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          item_name: string
          order_id: number
          quantity: number
          toppings: string | null
        }
        Insert: {
          id?: string
          item_name: string
          order_id: number
          quantity?: number
          toppings?: string | null
        }
        Update: {
          id?: string
          item_name?: string
          order_id?: number
          quantity?: number
          toppings?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          active_status: Database["public"]["Enums"]["active_status_enum"]
          additional_info: string | null
          conversation_id: string | null
          created_at: string
          id: number
          order_status: Database["public"]["Enums"]["order_status_enum"]
          order_type: Database["public"]["Enums"]["order_type_enum"]
        }
        Insert: {
          active_status?: Database["public"]["Enums"]["active_status_enum"]
          additional_info?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: never
          order_status?: Database["public"]["Enums"]["order_status_enum"]
          order_type: Database["public"]["Enums"]["order_type_enum"]
        }
        Update: {
          active_status?: Database["public"]["Enums"]["active_status_enum"]
          additional_info?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: never
          order_status?: Database["public"]["Enums"]["order_status_enum"]
          order_type?: Database["public"]["Enums"]["order_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          display_name: string
          id: string
        }
        Insert: {
          display_name: string
          id: string
        }
        Update: {
          display_name?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_conversation_and_log_message: {
        Args: { p_message_text: string; p_messenger_id: string }
        Returns: {
          conversation_id: string
          is_new_conversation: boolean
        }[]
      }
      get_or_create_order: {
        Args: {
          p_conversation_id: string
          p_order_type: Database["public"]["Enums"]["order_type_enum"]
        }
        Returns: number
      }
    }
    Enums: {
      active_status_enum: "active" | "completed" | "cancelled"
      driver_availability_enum: "active" | "inactive"
      order_status_enum: "new" | "in_progress" | "ready"
      order_type_enum: "pickup" | "delivery"
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
      active_status_enum: ["active", "completed", "cancelled"],
      driver_availability_enum: ["active", "inactive"],
      order_status_enum: ["new", "in_progress", "ready"],
      order_type_enum: ["pickup", "delivery"],
    },
  },
} as const
