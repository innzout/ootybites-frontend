import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Shown when an admin list fails to load.
 *
 * Without it a failed request fell through to the empty state, so a network
 * blip read as "you have no vendors" - and an admin could reasonably start
 * re-creating records that were there all along. Always offers a retry.
 */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-white px-4 py-14 text-center">
      <AlertTriangle className="h-6 w-6 text-accent-600" aria-hidden="true" />
      <p className="font-semibold text-ink">Could not load {what}.</p>
      <p className="max-w-sm text-sm text-muted">
        This is a connection problem, not missing data. Check that the API is running, then try again.
      </p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
