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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      availability_alerts: {
        Row: {
          category: string | null
          created_at: string
          customer_id: string
          farmer_id: string | null
          id: string
          is_active: boolean | null
          listing_id: string | null
          triggered_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          customer_id: string
          farmer_id?: string | null
          id?: string
          is_active?: boolean | null
          listing_id?: string | null
          triggered_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          customer_id?: string
          farmer_id?: string | null
          id?: string
          is_active?: boolean | null
          listing_id?: string | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_alerts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_partner_status: {
        Row: {
          id: string
          partner_id: string
          status: string
          updated_at: string
          last_assigned_at: string | null
        }
        Insert: {
          id?: string
          partner_id: string
          status?: string
          updated_at?: string
          last_assigned_at?: string | null
        }
        Update: {
          id?: string
          partner_id?: string
          status?: string
          updated_at?: string
          last_assigned_at?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          address_line: string
          city: string
          created_at: string
          customer_id: string
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          pincode: string
          state: string
          updated_at: string
        }
        Insert: {
          address_line: string
          city: string
          created_at?: string
          customer_id: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          pincode: string
          state: string
          updated_at?: string
        }
        Update: {
          address_line?: string
          city?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          pincode?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_cart: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          listing_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          listing_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          listing_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_cart_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          contact_disabled_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_address_id: string | null
          delivery_preference: string | null
          dispatched_at: string | null
          estimated_delivery: string | null
          farmer_contact_visible: boolean | null
          farmer_id: string
          farmer_notes: string | null
          id: string
          listing_id: string
          notes: string | null
          packed_at: string | null
          quantity: number
          status: string
          total_price: number
          updated_at: string
          delivery_partner_id: string | null
          delivery_status: string | null
          pickup_time: string | null
          delivered_time: string | null
        }
        Insert: {
          contact_disabled_at?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_preference?: string | null
          dispatched_at?: string | null
          estimated_delivery?: string | null
          farmer_contact_visible?: boolean | null
          farmer_id: string
          farmer_notes?: string | null
          id?: string
          listing_id: string
          notes?: string | null
          packed_at?: string | null
          quantity: number
          status?: string
          total_price: number
          updated_at?: string
          delivery_partner_id?: string | null
          delivery_status?: string | null
          pickup_time?: string | null
          delivered_time?: string | null
        }
        Update: {
          contact_disabled_at?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_address_id?: string | null
          delivery_preference?: string | null
          dispatched_at?: string | null
          estimated_delivery?: string | null
          farmer_contact_visible?: boolean | null
          farmer_id?: string
          farmer_notes?: string | null
          id?: string
          listing_id?: string
          notes?: string | null
          packed_at?: string | null
          quantity?: number
          status?: string
          total_price?: number
          updated_at?: string
          delivery_partner_id?: string | null
          delivery_status?: string | null
          pickup_time?: string | null
          delivered_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          last_recommendations: Json | null
          preferred_categories: string[] | null
          preferred_farmers: string[] | null
          recommendations_updated_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          last_recommendations?: Json | null
          preferred_categories?: string[] | null
          preferred_farmers?: string[] | null
          recommendations_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          last_recommendations?: Json | null
          preferred_categories?: string[] | null
          preferred_farmers?: string[] | null
          recommendations_updated_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customer_wishlist: {
        Row: {
          created_at: string
          customer_id: string
          farmer_id: string | null
          id: string
          listing_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          farmer_id?: string | null
          id?: string
          listing_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          farmer_id?: string | null
          id?: string
          listing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_wishlist_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      disease_records: {
        Row: {
          confidence: string | null
          created_at: string
          detection_method: string
          disease_name: string | null
          farmer_id: string
          id: string
          image_url: string | null
          symptoms: string[] | null
          treatment_recommendations: Json | null
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          detection_method: string
          disease_name?: string | null
          farmer_id: string
          id?: string
          image_url?: string | null
          symptoms?: string[] | null
          treatment_recommendations?: Json | null
        }
        Update: {
          confidence?: string | null
          created_at?: string
          detection_method?: string
          disease_name?: string | null
          farmer_id?: string
          id?: string
          image_url?: string | null
          symptoms?: string[] | null
          treatment_recommendations?: Json | null
        }
        Relationships: []
      }
      farmer_calendar: {
        Row: {
          completed: boolean | null
          created_at: string
          crop_type: string | null
          description: string | null
          event_date: string
          event_type: string
          farmer_id: string
          id: string
          notification_sent: boolean | null
          reminder_enabled: boolean | null
          suggested_by_ai: boolean | null
          title: string
          updated_at: string
          weather_dependent: boolean | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string
          crop_type?: string | null
          description?: string | null
          event_date: string
          event_type: string
          farmer_id: string
          id?: string
          notification_sent?: boolean | null
          reminder_enabled?: boolean | null
          suggested_by_ai?: boolean | null
          title: string
          updated_at?: string
          weather_dependent?: boolean | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string
          crop_type?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          farmer_id?: string
          id?: string
          notification_sent?: boolean | null
          reminder_enabled?: boolean | null
          suggested_by_ai?: boolean | null
          title?: string
          updated_at?: string
          weather_dependent?: boolean | null
        }
        Relationships: []
      }
      farmer_ratings: {
        Row: {
          created_at: string
          customer_id: string
          farmer_id: string
          id: string
          order_id: string
          rating: number
          review: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          farmer_id: string
          id?: string
          order_id: string
          rating: number
          review?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          farmer_id?: string
          id?: string
          order_id?: string
          rating?: number
          review?: string | null
        }
        Relationships: []
      }
      marketplace_listings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          farmer_id: string
          farming_method: string | null
          harvest_date: string | null
          id: string
          image_url: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          price: number
          quantity: number
          status: string
          title: string
          unit: string
          updated_at: string
          variety: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          farmer_id: string
          farming_method?: string | null
          harvest_date?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          price: number
          quantity: number
          status?: string
          title: string
          unit?: string
          updated_at?: string
          variety?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          farmer_id?: string
          farming_method?: string | null
          harvest_date?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          price?: number
          quantity?: number
          status?: string
          title?: string
          unit?: string
          updated_at?: string
          variety?: string | null
        }
        Relationships: []
      }
      marketplace_orders: {
        Row: {
          buyer_id: string
          created_at: string
          farmer_id: string
          id: string
          listing_id: string
          notes: string | null
          quantity: number
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          farmer_id: string
          id?: string
          listing_id: string
          notes?: string | null
          quantity: number
          status?: string
          total_price: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
          listing_id?: string
          notes?: string | null
          quantity?: number
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_invoices: {
        Row: {
          generated_at: string
          id: string
          invoice_number: string
          order_id: string
          pdf_url: string | null
        }
        Insert: {
          generated_at?: string
          id?: string
          invoice_number: string
          order_id: string
          pdf_url?: string | null
        }
        Update: {
          generated_at?: string
          id?: string
          invoice_number?: string
          order_id?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          farmer_id: string
          id: string
          merchant_id: string
          notes: string | null
          product_id: string
          quantity: number
          status: string
          total_price: number
          updated_at: string
          delivery_partner_id: string | null
          delivery_status: string | null
          pickup_time: string | null
          delivered_time: string | null
        }
        Insert: {
          created_at?: string
          farmer_id: string
          id?: string
          merchant_id: string
          notes?: string | null
          product_id: string
          quantity: number
          status?: string
          total_price: number
          updated_at?: string
          delivery_partner_id?: string | null
          delivery_status?: string | null
          pickup_time?: string | null
          delivered_time?: string | null
        }
        Update: {
          created_at?: string
          farmer_id?: string
          id?: string
          merchant_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          status?: string
          total_price?: number
          updated_at?: string
          delivery_partner_id?: string | null
          delivery_status?: string | null
          pickup_time?: string | null
          delivered_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          merchant_id: string
          name: string
          price: number
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          merchant_id: string
          name: string
          price: number
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          merchant_id?: string
          name?: string
          price?: number
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
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
      farmer_public_profiles: {
        Row: {
          avg_rating: number | null
          city: string | null
          crops_grown: string[] | null
          farmer_id: string | null
          full_name: string | null
          state: string | null
          total_reviews: number | null
          total_sales: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "farmer" | "merchant" | "customer" | "logistics"
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
      app_role: ["farmer", "merchant", "customer", "logistics"],
    },
  },
} as const
