"use server";

import { revalidatePath } from "next/cache";
import { portalRoutes } from "@/config/routes";
import { toFieldErrors } from "@/lib/validation/leads";
import { CHECK_FIELDS, TRY_AGAIN, type ActionState } from "../form-state";
import { logPortalError, requireCustomer } from "../session";
import { formFields, isUuid, profileSchema } from "../validation";

/* Profile and notification Server Actions. */

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCustomer(portalRoutes.profile);
  const parsed = profileSchema.safeParse(formFields(formData, ["fullName", "phone", "country", "timezone"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };

  const { error } = await viewer.supabase.from("profiles").update(parsed.data).eq("id", viewer.profile.id);
  if (error) {
    logPortalError("update profile", error, { profileId: viewer.profile.id });
    return { status: "error", message: TRY_AGAIN };
  }
  revalidatePath("/app", "layout");
  return { status: "success", message: "Your profile has been saved." };
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const viewer = await requireCustomer(portalRoutes.notifications);
  if (!isUuid(notificationId)) return;
  const { error } = await viewer.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", viewer.profile.id)
    .is("read_at", null);
  if (error) logPortalError("mark notification read", error, { profileId: viewer.profile.id, notificationId });
  revalidatePath("/app", "layout");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const viewer = await requireCustomer(portalRoutes.notifications);
  const { error } = await viewer.supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", viewer.profile.id)
    .is("read_at", null);
  if (error) logPortalError("mark all notifications read", error, { profileId: viewer.profile.id });
  revalidatePath("/app", "layout");
}
