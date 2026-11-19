import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";

/**
 * Runs an admin write and reports failure instead of swallowing it.
 *
 * Toggle and delete handlers on the list pages awaited the API with no try, so
 * a rejected request was an unhandled promise rejection: nothing on screen
 * changed and nothing said why. Returns whether the action succeeded so the
 * caller can decide whether to reload.
 */
export async function runAdminAction(
  action: () => Promise<unknown>,
  failMessage = "Could not save the change. Please try again.",
): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (ex) {
    toast.error(ex instanceof ApiException ? ex.message : failMessage);
    return false;
  }
}
