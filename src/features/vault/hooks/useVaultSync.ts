import { useEffect } from "react";
import type { ResearchSession } from "@/types/research";
import { saveSession } from "@/shared/lib/vault-service";

const DEBOUNCE_MS = 400;

interface UseVaultSyncOptions {
  session: ResearchSession | null;
  vaultReady: boolean;
  onSaved?: (session: ResearchSession) => void;
  onError?: (message: string) => void;
}

export function useVaultSync({
  session,
  vaultReady,
  onSaved,
  onError,
}: UseVaultSyncOptions) {
  useEffect(() => {
    if (!vaultReady || !session) return;

    const timer = window.setTimeout(() => {
      void saveSession(session)
        .then(() => {
          onSaved?.(session);
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error ? err.message : String(err);
          onError?.(message);
        });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [session, vaultReady, onSaved, onError]);
}

/** Writes immediately (e.g. right after creating a new session). */
export async function saveSessionNow(
  session: ResearchSession,
  onError?: (message: string) => void,
): Promise<void> {
  try {
    await saveSession(session);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    onError?.(message);
  }
}
