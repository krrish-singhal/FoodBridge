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
      donation_categories: {
        Row: {
          id: string
          name: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          role: 'PROVIDER' | 'NGO' | 'ADMIN' | 'CSR'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          role?: 'PROVIDER' | 'NGO' | 'ADMIN' | 'CSR'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          role?: 'PROVIDER' | 'NGO' | 'ADMIN' | 'CSR'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          id: string
          name: string
          type: 'RESTAURANT' | 'HOTEL' | 'EVENT_ORGANIZER' | 'CATERER' | 'NGO' | 'SUPERMARKET' | 'OTHER'
          address: string
          city: string
          state: string | null
          country: string
          postal_code: string | null
          location: string // PostGIS geography
          contact_person: string
          phone: string
          email: string
          website: string | null
          description: string | null
          capacity_meals: number | null
          verification_status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
          public_id: string | null
          operating_radius_km: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: 'RESTAURANT' | 'HOTEL' | 'EVENT_ORGANIZER' | 'CATERER' | 'NGO' | 'SUPERMARKET' | 'OTHER'
          address: string
          city: string
          state?: string | null
          country: string
          postal_code?: string | null
          location: string // WKT string or PostGIS specific format
          contact_person: string
          phone: string
          email: string
          website?: string | null
          description?: string | null
          capacity_meals?: number | null
          verification_status?: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
          public_id?: string | null
          operating_radius_km?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: 'RESTAURANT' | 'HOTEL' | 'EVENT_ORGANIZER' | 'CATERER' | 'NGO' | 'SUPERMARKET' | 'OTHER'
          address?: string
          city?: string
          state?: string | null
          country?: string
          postal_code?: string | null
          location?: string
          contact_person?: string
          phone?: string
          email?: string
          website?: string | null
          description?: string | null
          capacity_meals?: number | null
          verification_status?: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
          public_id?: string | null
          operating_radius_km?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      donations: {
        Row: {
          id: string
          provider_id: string
          category_id: string
          food_name: string
          quantity: number
          quantity_unit: string
          meals_estimate: number
          food_type: string
          prepared_at: string
          consume_before: string
          pickup_location: string
          pickup_address: string
          description: string | null
          status: 'AVAILABLE' | 'MATCHED' | 'PICKUP_SCHEDULED' | 'PICKED_UP' | 'DELIVERED' | 'DISTRIBUTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED'
          urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          category_id: string
          food_name: string
          quantity: number
          quantity_unit: string
          meals_estimate: number
          food_type: string
          prepared_at: string
          consume_before: string
          pickup_location: string
          pickup_address: string
          description?: string | null
          status?: 'AVAILABLE' | 'MATCHED' | 'PICKUP_SCHEDULED' | 'PICKED_UP' | 'DELIVERED' | 'DISTRIBUTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED'
          urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          provider_id?: string
          category_id?: string
          food_name?: string
          quantity?: number
          quantity_unit?: string
          meals_estimate?: number
          food_type?: string
          prepared_at?: string
          consume_before?: string
          pickup_location?: string
          pickup_address?: string
          description?: string | null
          status?: 'AVAILABLE' | 'MATCHED' | 'PICKUP_SCHEDULED' | 'PICKED_UP' | 'DELIVERED' | 'DISTRIBUTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED'
          urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          donation_id: string
          ngo_id: string
          status: 'PENDING' | 'NOTIFIED' | 'ACCEPTED' | 'REJECTED' | 'QUANTITY_CHANGE_REQUESTED' | 'TIME_CHANGE_REQUESTED' | 'EXPIRED' | 'FAILED'
          score: number
          score_breakdown: Json | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          donation_id: string
          ngo_id: string
          status?: 'PENDING' | 'NOTIFIED' | 'ACCEPTED' | 'REJECTED' | 'QUANTITY_CHANGE_REQUESTED' | 'TIME_CHANGE_REQUESTED' | 'EXPIRED' | 'FAILED'
          score: number
          score_breakdown?: Json | null
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          donation_id?: string
          ngo_id?: string
          status?: 'PENDING' | 'NOTIFIED' | 'ACCEPTED' | 'REJECTED' | 'QUANTITY_CHANGE_REQUESTED' | 'TIME_CHANGE_REQUESTED' | 'EXPIRED' | 'FAILED'
          score?: number
          score_breakdown?: Json | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pickups: {
        Row: {
          id: string
          match_id: string
          scheduled_time: string
          status: 'SCHEDULED' | 'CONFIRMED' | 'ON_THE_WAY' | 'OTP_VERIFIED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED'
          coordinator_name: string
          coordinator_phone: string
          vehicle_details: string | null
          failure_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          scheduled_time: string
          status?: 'SCHEDULED' | 'CONFIRMED' | 'ON_THE_WAY' | 'OTP_VERIFIED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED'
          coordinator_name: string
          coordinator_phone: string
          vehicle_details?: string | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          scheduled_time?: string
          status?: 'SCHEDULED' | 'CONFIRMED' | 'ON_THE_WAY' | 'OTP_VERIFIED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED'
          coordinator_name?: string
          coordinator_phone?: string
          vehicle_details?: string | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      donation_allergens: {
        Row: {
          id: string
          donation_id: string
          allergen: string
          created_at: string
        }
        Insert: {
          id?: string
          donation_id: string
          allergen: string
          created_at?: string
        }
        Update: {
          id?: string
          donation_id?: string
          allergen?: string
          created_at?: string
        }
        Relationships: []
      }
      donation_safety_checklists: {
        Row: {
          id?: string
          donation_id: string
          proper_storage: boolean
          safe_packaging: boolean
          temp_controlled: boolean
          created_at?: string
          completed_at?: string
        }
        Insert: {
          id?: string
          donation_id: string
          proper_storage: boolean
          safe_packaging: boolean
          temp_controlled: boolean
          created_at?: string
          completed_at?: string
        }
        Update: {
          id?: string
          donation_id?: string
          proper_storage?: boolean
          safe_packaging?: boolean
          temp_controlled?: boolean
          created_at?: string
          completed_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_notifications: boolean
          sms_notifications: boolean
          push_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_notifications?: boolean
          sms_notifications?: boolean
          push_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          sms_notifications?: boolean
          push_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reliability_scores: {
        Row: {
          id?: string
          organization_id: string
          score: number
          total_completed?: number
          total_failed?: number
          last_calculated_at?: string
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          organization_id: string
          score: number
          total_completed?: number
          total_failed?: number
          last_calculated_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          score?: number
          total_completed?: number
          total_failed?: number
          last_calculated_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      pickup_otp: {
        Row: {
          pickup_id: string
          otp_hash: string
          expires_at: string
          is_used: boolean
          attempts: number
          created_at: string
        }
        Insert: {
          pickup_id: string
          otp_hash: string
          expires_at: string
          is_used?: boolean
          attempts?: number
          created_at?: string
        }
        Update: {
          pickup_id?: string
          otp_hash?: string
          expires_at?: string
          is_used?: boolean
          attempts?: number
          created_at?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          id: string
          match_id: string | null
          reviewer_org_id: string
          target_org_id: string
          score: number
          review: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id?: string | null
          reviewer_org_id: string
          target_org_id: string
          score: number
          review?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string | null
          reviewer_org_id?: string
          target_org_id?: string
          score?: number
          review?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
