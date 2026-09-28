/**
 * Types for the Supabase database, in the shape `supabase gen types typescript`
 * produces. Hand-written to match supabase/migrations (Phase 2A); regenerate
 * with the Supabase CLI once it is linked, and keep the two in step.
 *
 * Insert/Update types list only the columns customers are GRANTed, so code
 * cannot even compile an attempt to write a server-controlled column.
 */

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          role: "CUSTOMER" | "ADMIN" | "VENDOR" | "PARTNER";
          full_name: string;
          email: string | null;
          phone: string | null;
          country: string | null;
          timezone: string | null;
          avatar_url: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: never;
        Update: {
          full_name?: string;
          phone?: string | null;
          country?: string | null;
          timezone?: string | null;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          property_type: "HOUSE" | "APARTMENT" | "LAND" | "COMMERCIAL" | "AGRICULTURAL_LAND" | "OTHER";
          address_line_1: string | null;
          address_line_2: string | null;
          city: string;
          district: string | null;
          state: string;
          postal_code: string | null;
          country: string;
          ownership_type: "SOLE" | "JOINT" | "FAMILY" | "POWER_OF_ATTORNEY" | "OTHER" | null;
          notes: string | null;
          status: "ACTIVE" | "UNDER_REVIEW" | "INACTIVE";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          name: string;
          property_type: Database["public"]["Tables"]["properties"]["Row"]["property_type"];
          city: string;
          address_line_1?: string | null;
          address_line_2?: string | null;
          district?: string | null;
          postal_code?: string | null;
          ownership_type?: Database["public"]["Tables"]["properties"]["Row"]["ownership_type"];
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["properties"]["Insert"]>;
        Relationships: [
          { foreignKeyName: "properties_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      service_requests: {
        Row: {
          id: string;
          request_number: string;
          customer_id: string;
          property_id: string | null;
          category:
            | "PROPERTY_INSPECTION"
            | "MAINTENANCE"
            | "CLEANING"
            | "GARDEN_MAINTENANCE"
            | "SECURITY_CHECK"
            | "DOCUMENT_ASSISTANCE"
            | "RENTAL_MANAGEMENT"
            | "FAMILY_ASSISTANCE"
            | "OTHER";
          title: string;
          description: string | null;
          priority: "NORMAL" | "URGENT";
          status: "SUBMITTED" | "UNDER_REVIEW" | "ASSIGNED" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "COMPLETED" | "CANCELLED";
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          category: Database["public"]["Tables"]["service_requests"]["Row"]["category"];
          title: string;
          property_id?: string | null;
          description?: string | null;
          priority?: Database["public"]["Tables"]["service_requests"]["Row"]["priority"];
        };
        /** Customers may only cancel (enforced by RLS). */
        Update: { status?: "CANCELLED" };
        Relationships: [
          { foreignKeyName: "service_requests_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "service_requests_property_id_fkey"; columns: ["property_id"]; isOneToOne: false; referencedRelation: "properties"; referencedColumns: ["id"] },
        ];
      };
      service_request_events: {
        Row: {
          id: string;
          request_id: string;
          event_type: "REQUEST_CREATED" | "REQUEST_REVIEWED" | "STATUS_CHANGED" | "CUSTOMER_COMMENT";
          title: string;
          description: string | null;
          visibility: "CUSTOMER" | "INTERNAL";
          metadata: Record<string, unknown>;
          created_by: string | null;
          created_at: Timestamp;
        };
        Insert: never;
        Update: never;
        Relationships: [
          { foreignKeyName: "service_request_events_request_id_fkey"; columns: ["request_id"]; isOneToOne: false; referencedRelation: "service_requests"; referencedColumns: ["id"] },
        ];
      };
      activity_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          customer_id: string | null;
          action: string;
          entity_type: "PROFILE" | "PROPERTY" | "SERVICE_REQUEST";
          entity_id: string | null;
          metadata: Record<string, unknown>;
          created_at: Timestamp;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "REQUEST_RECEIVED" | "REQUEST_STATUS_CHANGED" | "GENERAL";
          title: string;
          message: string;
          entity_type: "PROPERTY" | "SERVICE_REQUEST" | null;
          entity_id: string | null;
          read_at: Timestamp | null;
          created_at: Timestamp;
        };
        Insert: never;
        Update: { read_at?: Timestamp | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Row<T extends keyof PublicTables> = PublicTables[T]["Row"];
