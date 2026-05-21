import type { RequestRecordList } from "../types/request";

/**
 * A user can open a new collaboration request only when none of their
 * existing requests is still on the "form completion" step
 * (`form_complete !== '2'` means at least one is incomplete).
 *
 * Returns `true` when the list is empty, undefined or null.
 */
export const allowedRequestCreation = (
  requests: RequestRecordList | undefined | null,
): boolean =>
  requests === undefined ||
  requests === null ||
  requests.length === 0 ||
  requests.filter((r) => r.form_complete !== "2").length === 0;
