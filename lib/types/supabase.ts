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
