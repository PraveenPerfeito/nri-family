"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { portalRoutes } from "@/config/routes";
import { toFieldErrors } from "@/lib/validation/leads";
import { cancellableRequestStatuses } from "../domain";
import { CHECK_FIELDS, TRY_AGAIN, type ActionState } from "../form-state";
import { logPortalError, requireCustomer } from "../session";
import { formFields, isUuid, serviceRequestSchema } from "../validation";

/*
 * Service request Server Actions.
 *
 * Creating a request is one INSERT. In the same database transaction, triggers
 * assign the request number, and write the first timeline event
 * (REQUEST_CREATED), the activity entry and the in-app notification — so the
 * four records are created together or not at all.
 */

const FIELDS = ["propertyId", "category", "title", "description", "priority"];

export async function createRequestAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCustomer(portalRoutes.newRequest);
  const parsed = serviceRequestSchema.safeParse(formFields(formData, FIELDS));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };
  const input = parsed.data;

  // Ownership check with a clear message. RLS rejects someone else's property regardless.
  if (input.property_id) {
    const { data: property, error } = await viewer.supabase
      .from("properties")
      .select("id")
      .eq("id", input.property_id)
      .eq("owner_id", viewer.profile.id)
      .maybeSingle();
    if (error) {
      logPortalError("check request property", error, { profileId: viewer.profile.id });
      return { status: "error", message: TRY_AGAIN };
    }
    if (!property) return { status: "error", message: CHECK_FIELDS, fieldErrors: { propertyId: "Please choose one of your properties." } };
  }

  const { data, error } = await viewer.supabase.from("service_requests").insert(input).select("id").single();
  if (error || !data) {
    logPortalError("create request", error, { profileId: viewer.profile.id });
    return { status: "error", message: "We couldn't submit your request. Nothing was saved — please try again." };
  }
  revalidatePath("/app", "layout");
  redirect(`${portalRoutes.request(data.id)}?saved=created`);
}

/** The only change a customer can make to a request: cancel it before the team starts. */
export async function cancelRequestAction(requestId: string): Promise<ActionState> {
  const viewer = await requireCustomer(portalRoutes.requests);
  if (!isUuid(requestId)) return { status: "error", message: "This request could not be found." };

  const { data, error } = await viewer.supabase
    .from("service_requests")
    .update({ status: "CANCELLED" })
    .eq("id", requestId)
    .eq("customer_id", viewer.profile.id)
    .in("status", cancellableRequestStatuses)
    .select("id")
    .maybeSingle();
  if (error) {
    logPortalError("cancel request", error, { profileId: viewer.profile.id, requestId });
    return { status: "error", message: TRY_AGAIN };
  }
  if (!data) return { status: "error", message: "This request can no longer be cancelled here: our team has already started on it." };
  revalidatePath("/app", "layout");
  redirect(`${portalRoutes.request(requestId)}?saved=cancelled`);
}
