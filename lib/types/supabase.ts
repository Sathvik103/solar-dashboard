// Generated via: supabase gen types typescript --project-id <project-id>. Re-run after schema changes.

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
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      solar_profiles: {
        Row: {
          id: string
          user_id: string
          city: string
          state: string
          district: string | null
          pincode: string | null
          monthly_bill_inr: number | null
          monthly_units_kwh: number | null
          electricity_tariff_inr: number | null
          roof_area_sqft: number | null
          roof_type: string | null
          roof_orientation: string | null
          shading_level: string | null
          budget_inr: number | null
          preferred_capacity_kw: number | null
          battery_preference: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          city?: string
          state?: string
          district?: string | null
          pincode?: string | null
          monthly_bill_inr?: number | null
          monthly_units_kwh?: number | null
          electricity_tariff_inr?: number | null
          roof_area_sqft?: number | null
          roof_type?: string | null
          roof_orientation?: string | null
          shading_level?: string | null
          budget_inr?: number | null
          preferred_capacity_kw?: number | null
          battery_preference?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          city?: string
          state?: string
          district?: string | null
          pincode?: string | null
          monthly_bill_inr?: number | null
          monthly_units_kwh?: number | null
          electricity_tariff_inr?: number | null
          roof_area_sqft?: number | null
          roof_type?: string | null
          roof_orientation?: string | null
          shading_level?: string | null
          budget_inr?: number | null
          preferred_capacity_kw?: number | null
          battery_preference?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solar_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
