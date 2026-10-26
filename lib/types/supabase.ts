export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]


/** Compact table definition: Insert requires only `Req` keys, Update is fully partial. */
type Tbl<Row, Req extends keyof Row> = {
  Row: Row
  Insert: Pick<Row, Req> & Partial<Omit<Row, Req>>
  Update: Partial<Row>
  Relationships: []
}

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
            foreignKeyName: 'solar_profiles_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      documents: {
        Row: {
          id: string
          title: string
          source: string
          source_url: string
          organization: string
          document_type: string
          location_scope: string
          publication_date: string | null
          effective_date: string | null
          version: string | null
          content_hash: string
          status: 'draft' | 'published' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          source: string
          source_url: string
          organization: string
          document_type: string
          location_scope?: string
          publication_date?: string | null
          effective_date?: string | null
          version?: string | null
          content_hash: string
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          source?: string
          source_url?: string
          organization?: string
          document_type?: string
          location_scope?: string
          publication_date?: string | null
          effective_date?: string | null
          version?: string | null
          content_hash?: string
          status?: 'draft' | 'published' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          id: string
          document_id: string
          chunk_index: number
          content: string
          token_count: number
          page_number: number | null
          section_title: string | null
          metadata: Json
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          chunk_index: number
          content: string
          token_count?: number
          page_number?: number | null
          section_title?: string | null
          metadata?: Json
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          chunk_index?: number
          content?: string
          token_count?: number
          page_number?: number | null
          section_title?: string | null
          metadata?: Json
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'document_chunks_document_id_fkey'
            columns: ['document_id']
            referencedRelation: 'documents'
            referencedColumns: ['id']
          }
        ]
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string
          citations: Json
          tool_calls: Json
          trace_events: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string
          citations?: Json
          tool_calls?: Json
          trace_events?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: 'user' | 'assistant' | 'system' | 'tool'
          content?: string
          citations?: Json
          tool_calls?: Json
          trace_events?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      agent_runs: {
        Row: {
          id: string
          user_id: string
          conversation_id: string | null
          request: string
          status: 'running' | 'completed' | 'failed'
          tools_used: Json
          retrieval_count: number
          verification_status: string
          latency_ms: number
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id?: string | null
          request: string
          status?: 'running' | 'completed' | 'failed'
          tools_used?: Json
          retrieval_count?: number
          verification_status?: string
          latency_ms?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string | null
          request?: string
          status?: 'running' | 'completed' | 'failed'
          tools_used?: Json
          retrieval_count?: number
          verification_status?: string
          latency_ms?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'agent_runs_conversation_id_fkey'
            columns: ['conversation_id']
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_runs_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      consumption_history: Tbl<{
        id: string; user_id: string; record_date: string; month: string; year: number
        consumption_kwh: number; peak_demand_kw: number | null; bill_amount: number
        units_imported: number | null; units_exported: number | null; tariff_rate: number | null
        source: string; created_at: string
      }, 'user_id' | 'record_date' | 'month' | 'year' | 'consumption_kwh' | 'bill_amount' | 'source'>
      electricity_bills: Tbl<{
        id: string; user_id: string; billing_period_start: string; billing_period_end: string
        units_consumed: number; fixed_charge: number; energy_charge: number; taxes: number
        other_charges: number | null; total_bill: number; tariff_category: string
        tariff_rate: number; created_at: string
      }, 'user_id' | 'billing_period_start' | 'billing_period_end' | 'units_consumed' | 'energy_charge' | 'total_bill' | 'tariff_rate'>
      solar_systems: Tbl<{
        id: string; user_id: string; capacity_kw: number; panel_count: number | null
        panel_wattage: number | null; inverter_capacity_kw: number | null; installation_cost: number
        subsidy_amount: number; net_cost: number; installation_date: string | null
        installer: string | null; system_status: string; created_at: string
      }, 'user_id' | 'capacity_kw' | 'installation_cost' | 'net_cost'>
      solar_generation_history: Tbl<{
        id: string; user_id: string; system_id: string | null; record_date: string
        generation_kwh: number; exported_kwh: number; self_consumed_kwh: number
        grid_import_kwh: number; peak_generation_kw: number | null; solar_irradiance: number | null
        weather_condition: string | null; source: string; created_at: string
      }, 'user_id' | 'record_date' | 'generation_kwh' | 'source'>
      profiles: Tbl<{
        id: string; full_name: string | null; email: string; phone: string | null; city: string
        district: string | null; state: string; pincode: string | null
        latitude: number | null; longitude: number | null; created_at: string; updated_at: string
      }, 'id' | 'email'>
      regional_statistics: Tbl<{
        id: string; state: string; district: string; city: string; pincode: string | null
        record_date: string; average_solar_irradiance: number; average_generation_per_kw: number
        average_monthly_consumption: number; average_electricity_tariff: number
        average_roof_area: number; adoption_rate: number; installed_capacity_mw: number
        average_system_size_kw: number; average_payback_years: number
        average_monthly_savings: number; co2_reduction_tonnes: number; source: string
        created_at: string
      }, 'district' | 'city' | 'record_date'>
      tariff_history: Tbl<{
        id: string; state: string; discom: string; category: string; slab_name: string
        min_units: number; max_units: number; rate_per_unit: number; effective_from: string
        effective_to: string | null; source: string; created_at: string
      }, 'slab_name' | 'min_units' | 'max_units' | 'rate_per_unit' | 'effective_from'>
      recommendation_history: Tbl<{
        id: string; user_id: string; query: string; recommended_capacity_kw: number
        alternative_capacity_kw: number | null; estimated_generation: number
        estimated_savings: number; net_cost: number; payback_years: number
        confidence: number | null; reasoning: string; evidence: Json; created_at: string
      }, 'user_id' | 'query' | 'recommended_capacity_kw' | 'estimated_generation' | 'estimated_savings' | 'net_cost' | 'payback_years' | 'reasoning'>
      saved_scenarios: Tbl<{
        id: string; user_id: string; name: string; monthly_consumption_kwh: number
        monthly_bill_inr: number; roof_area_sqft: number; tariff_inr: number; capacity_kw: number
        subsidy_inr: number; shading_level: string; calculated_savings_inr: number
        calculated_payback_years: number; created_at: string
      }, 'user_id' | 'name' | 'monthly_consumption_kwh' | 'monthly_bill_inr' | 'roof_area_sqft' | 'capacity_kw' | 'calculated_savings_inr' | 'calculated_payback_years'>
      dashboard_preferences: Tbl<{
        id: string; user_id: string; enabled_widgets: Json; created_at: string; updated_at: string
      }, 'user_id'>
      ml_datasets: Tbl<{
        id: string; user_id: string | null; dataset_type: string; feature_schema: Json
        record_count: number; date_range_start: string | null; date_range_end: string | null
        source: string; created_at: string
      }, 'dataset_type'>
      ml_predictions: Tbl<{
        id: string; user_id: string; prediction_type: string; prediction_date: string
        predicted_value: number; actual_value: number | null; unit: string; model_version: string
        confidence: number | null; metadata: Json | null; created_at: string
      }, 'user_id' | 'prediction_type' | 'prediction_date' | 'predicted_value'>
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_document_chunks: {
        Args: {
          query_embedding: string | number[]
          match_count?: number
          similarity_threshold?: number
          filter_location_scope?: string | null
          filter_document_type?: string | null
          filter_organization?: string | null
        }
        Returns: {
          chunk_id: string
          document_id: string
          content: string
          similarity: number
          page_number: number | null
          section_title: string | null
          chunk_index: number
          document_title: string
          organization: string
          source_url: string
          document_type: string
          location_scope: string
          publication_date: string | null
          effective_date: string | null
          version: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
