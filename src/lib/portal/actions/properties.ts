"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { portalRoutes } from "@/config/routes";
import { toFieldErrors } from "@/lib/validation/leads";
import { CHECK_FIELDS, TRY_AGAIN, type ActionState } from "../form-state";
import { logPortalError, requireCustomer } from "../session";
import { formFields, isUuid, propertySchema } from "../validation";

/*
 * Property Server Actions. Each one: verify the customer, validate input,
 * write as that customer (RLS and column privileges apply; ownership is set by
 * the database, never taken from the form), then revalidate. The activity log
 * entry is written by a database trigger in the same transaction.
 */

const FIELDS = ["name", "propertyType", "addressLine1", "addressLine2", "city", "district", "postalCode", "ownershipType", "notes"];
const NOT_YOURS = "This property may have been removed or you may not have access to it.";

export async function createPropertyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCustomer(portalRoutes.newProperty);
  const parsed = propertySchema.safeParse(formFields(formData, FIELDS));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };

  const { data, error } = await viewer.supabase.from("properties").insert(parsed.data).select("id").single();
  if (error || !data) {
    logPortalError("create property", error, { profileId: viewer.profile.id });
    return { status: "error", message: "We couldn't save this property. Please try again." };
  }
  revalidatePath("/app", "layout");
  redirect(`${portalRoutes.property(data.id)}?saved=created`);
}

export async function updatePropertyAction(propertyId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCustomer(isUuid(propertyId) ? portalRoutes.editProperty(propertyId) : portalRoutes.properties);
  if (!isUuid(propertyId)) return { status: "error", message: NOT_YOURS };
  const parsed = propertySchema.safeParse(formFields(formData, FIELDS));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };

  const { data, error } = await viewer.supabase
    .from("properties")
    .update(parsed.data)
    .eq("id", propertyId)
    .eq("owner_id", viewer.profile.id)
    .select("id")
    .maybeSingle();
  if (error) {
    logPortalError("update property", error, { profileId: viewer.profile.id, propertyId });
    return { status: "error", message: TRY_AGAIN };
  }
  if (!data) return { status: "error", message: NOT_YOURS };
  revalidatePath("/app", "layout");
  redirect(`${portalRoutes.property(propertyId)}?saved=updated`);
}

export async function deletePropertyAction(propertyId: string): Promise<ActionState> {
  const viewer = await requireCustomer(portalRoutes.properties);
  if (!isUuid(propertyId)) return { status: "error", message: NOT_YOURS };

  // Requests keep their history, so a property that has any cannot be removed
  // (the database enforces this too, with a foreign key).
  const { count, error: countError } = await viewer.supabase
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", viewer.profile.id)
    .eq("property_id", propertyId);
  if (countError) {
    logPortalError("count property requests", countError, { profileId: viewer.profile.id, propertyId });
    return { status: "error", message: TRY_AGAIN };
  }
  if ((count ?? 0) > 0) {
    return { status: "error", message: "This property has service requests, so it can't be removed. Their history stays with the property." };
  }

  const { data, error } = await viewer.supabase.from("properties").delete().eq("id", propertyId).eq("owner_id", viewer.profile.id).select("id");
  if (error) {
    logPortalError("delete property", error, { profileId: viewer.profile.id, propertyId });
    return { status: "error", message: TRY_AGAIN };
  }
  if (!data || data.length === 0) return { status: "error", message: NOT_YOURS };
  revalidatePath("/app", "layout");
  redirect(`${portalRoutes.properties}?saved=deleted`);
}
