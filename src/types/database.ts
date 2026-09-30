/**
 * Types for the Supabase database, in the shape `supabase gen types typescript`
 * produces. Hand-written to match supabase/migrations (Phase 2A, 2B and 2C);
 * regenerate with the Supabase CLI once it is linked, and keep the two in step.
 *
 * Insert/Update types list only the columns customers are GRANTed, so code
 * cannot even compile an attempt to write a server-controlled column. The
 * team writes only through the admin functions in `Functions`.
 */

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          role: "CUSTOMER" | "ADMIN" | "OPERATIONS" | "VENDOR" | "PARTNER";
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
          event_type:
            | "REQUEST_CREATED"
            | "REQUEST_REVIEWED"
            | "STATUS_CHANGED"
            | "CUSTOMER_COMMENT"
            | "INTERNAL_NOTE"
            | "TEAM_UPDATE"
            | "FIELD_WORK_SCHEDULED"
            | "FIELD_WORK_RESCHEDULED"
            | "FIELD_WORK_STARTED"
            | "FIELD_WORK_COMPLETED"
            | "FIELD_WORK_CANCELLED"
            | "EVIDENCE_AVAILABLE";
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
          /** INTERNAL entries (assignments, internal notes) are readable by admins only. */
          visibility: "CUSTOMER" | "INTERNAL";
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
          type: "REQUEST_RECEIVED" | "REQUEST_STATUS_CHANGED" | "REQUEST_UPDATE" | "VISIT_UPDATE" | "EVIDENCE_AVAILABLE" | "GENERAL";
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
      /** Internal staff (ADMIN / OPERATIONS). Readable by admins only; managed in the database. */
      team_members: {
        Row: {
          profile_id: string;
          is_active: boolean;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** Who on the team is responsible for a request. Admins only; written by admin_assign_request. */
      request_assignments: {
        Row: {
          request_id: string;
          assignee_id: string;
          assigned_by: string | null;
          assigned_at: Timestamp;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /**
       * Visits that carry out a request (Phase 2C). Every column may be shown to the
       * request's customer, who can read their own rows; admins read all. Written only
       * by the admin field-work functions. The team member is the request's assignee.
       */
      field_work: {
        Row: {
          id: string;
          request_id: string;
          customer_id: string;
          status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
          scheduled_start: Timestamp;
          scheduled_end: Timestamp | null;
          started_at: Timestamp | null;
          completed_at: Timestamp | null;
          cancelled_at: Timestamp | null;
          /** "Service notes" for the customer, written when the visit is completed. */
          summary: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** The team's side of a visit: instructions and execution notes. Admins only. */
      field_work_internal: {
        Row: {
          field_work_id: string;
          instructions: string | null;
          execution_notes: string | null;
          updated_at: Timestamp;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /**
       * Evidence of work (Phase 2C). Customers read a row only once it is APPROVED and
       * published (CUSTOMER_VISIBLE); admins read all. Written only by the admin evidence functions.
       */
      request_evidence: {
        Row: {
          id: string;
          request_id: string;
          customer_id: string;
          field_work_id: string | null;
          kind: "PHOTO" | "VIDEO" | "DOCUMENT";
          stage: "BEFORE" | "DURING" | "AFTER" | "GENERAL";
          title: string;
          description: string | null;
          mime_type: string;
          size_bytes: number;
          captured_at: Timestamp | null;
          review_status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
          visibility: "INTERNAL" | "CUSTOMER_VISIBLE";
          published_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /** The team's side of a piece of evidence: file location, uploader, review. Admins only. */
      request_evidence_internal: {
        Row: {
          evidence_id: string;
          storage_path: string;
          original_name: string | null;
          uploaded_by: string | null;
          reviewed_by: string | null;
          reviewed_at: Timestamp | null;
          review_note: string | null;
          published_by: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    /** Admin overviews: security_invoker views that return nothing unless the reader is an admin. */
    Views: {
      admin_request_status_counts: {
        Row: { status: Database["public"]["Tables"]["service_requests"]["Row"]["status"]; total: number };
        Relationships: [];
      };
      admin_customer_overview: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          country: string | null;
          timezone: string | null;
          created_at: Timestamp;
          property_count: number;
          request_count: number;
          open_request_count: number;
        };
        Relationships: [];
      };
      admin_property_overview: {
        Row: {
          id: string;
          name: string;
          property_type: Database["public"]["Tables"]["properties"]["Row"]["property_type"];
          city: string;
          district: string | null;
          state: string;
          status: Database["public"]["Tables"]["properties"]["Row"]["status"];
          owner_id: string;
          owner_name: string;
          created_at: Timestamp;
          updated_at: Timestamp;
          request_count: number;
          open_request_count: number;
        };
        Relationships: [];
      };
      admin_team_overview: {
        Row: {
          profile_id: string;
          full_name: string;
          email: string | null;
          role: "ADMIN" | "OPERATIONS";
          is_active: boolean;
          joined_at: Timestamp;
          open_assigned_count: number;
          total_assigned_count: number;
        };
        Relationships: [];
      };
      admin_request_inbox: {
        Row: {
          id: string;
          request_number: string;
          title: string;
          category: Database["public"]["Tables"]["service_requests"]["Row"]["category"];
          priority: Database["public"]["Tables"]["service_requests"]["Row"]["priority"];
          status: Database["public"]["Tables"]["service_requests"]["Row"]["status"];
          created_at: Timestamp;
          updated_at: Timestamp;
          customer_id: string;
          customer_name: string;
          customer_email: string | null;
          property_id: string | null;
          property_name: string | null;
          property_city: string | null;
          assignee_id: string | null;
          assignee_name: string | null;
          assigned_at: Timestamp | null;
        };
        Relationships: [];
      };
      admin_activity_feed: {
        Row: {
          id: string;
          created_at: Timestamp;
          action: string;
          entity_type: Database["public"]["Tables"]["activity_logs"]["Row"]["entity_type"];
          entity_id: string | null;
          metadata: Record<string, unknown>;
          visibility: Database["public"]["Tables"]["activity_logs"]["Row"]["visibility"];
          actor_id: string | null;
          actor_name: string | null;
          actor_role: Database["public"]["Tables"]["profiles"]["Row"]["role"] | null;
          customer_id: string | null;
          customer_name: string | null;
        };
        Relationships: [];
      };
    };
    /** Admin operations. Each refuses anyone but an active admin and raises a stable error key. */
    Functions: {
      admin_change_request_status: {
        Args: { p_request_id: string; p_expected_status: string; p_new_status: string };
        Returns: undefined;
      };
      admin_assign_request: {
        Args: { p_request_id: string; p_assignee_id: string };
        Returns: undefined;
      };
      admin_unassign_request: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      admin_add_internal_note: {
        Args: { p_request_id: string; p_body: string };
        Returns: undefined;
      };
      admin_post_customer_update: {
        Args: { p_request_id: string; p_body: string };
        Returns: undefined;
      };
      /** Phase 2C field work. Times are ISO timestamps; the database checks them in India time. */
      admin_schedule_field_work: {
        Args: { p_request_id: string; p_scheduled_start: string; p_scheduled_end: string | null; p_instructions: string | null };
        Returns: string;
      };
      admin_reschedule_field_work: {
        Args: { p_field_work_id: string; p_scheduled_start: string; p_scheduled_end: string | null; p_instructions: string | null };
        Returns: undefined;
      };
      admin_start_field_work: {
        Args: { p_field_work_id: string };
        Returns: undefined;
      };
      admin_record_field_work_notes: {
        Args: { p_field_work_id: string; p_execution_notes: string };
        Returns: undefined;
      };
      admin_complete_field_work: {
        Args: { p_field_work_id: string; p_summary: string | null; p_execution_notes: string | null };
        Returns: undefined;
      };
      admin_cancel_field_work: {
        Args: { p_field_work_id: string; p_expected_status: string };
        Returns: undefined;
      };
      /** Phase 2C evidence. The file's type and size come from Storage, the uploader from the session. */
      admin_add_evidence: {
        Args: {
          p_request_id: string;
          p_evidence_id: string;
          p_stage: string;
          p_title: string;
          p_description: string | null;
          p_captured_at: string | null;
          p_original_name: string | null;
        };
        Returns: undefined;
      };
      admin_approve_evidence: {
        Args: { p_evidence_id: string };
        Returns: undefined;
      };
      admin_reject_evidence: {
        Args: { p_evidence_id: string; p_reason: string | null };
        Returns: undefined;
      };
      admin_publish_evidence: {
        Args: { p_evidence_id: string };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Row<T extends keyof PublicTables> = PublicTables[T]["Row"];

type PublicViews = Database["public"]["Views"];
export type ViewRow<T extends keyof PublicViews> = PublicViews[T]["Row"];
export type AdminFunctionName = keyof Database["public"]["Functions"];
