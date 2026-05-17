import { useState } from "react";
import { ArchiveIcon, FileTextIcon, LayersIcon } from "@radix-ui/react-icons";
import { Button } from "@/shared/ui/button";
import { pickVaultFolder } from "@/shared/lib/vault-service";

interface VaultSetupScreenProps {
  onVaultSelected: (path: string) => void;
  errorMessage?: string | null;
}

export function VaultSetupScreen({
  onVaultSelected,
  errorMessage,
}: VaultSetupScreenProps) {
  const [picking, setPicking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function handlePickFolder() {
    setPicking(true);
    setLocalError(null);
    try {
      const path = await pickVaultFolder();
      onVaultSelected(path);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message !== "No folder selected") {
        setLocalError(message);
      }
    } finally {
      setPicking(false);
    }
  }

  const displayError = errorMessage ?? localError;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 right-1/4 size-72 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/4 size-96 rounded-full bg-muted/40 blur-3xl"
        aria-hidden
      />

      <div className="relative flex w-full max-w-lg flex-col items-center text-center">
        <div className="mb-8 flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-lg">
          <ArchiveIcon className="size-8 text-primary" aria-hidden />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Set up your vault
        </h1>
        <p className="mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
          Choose a folder on your computer — like an Obsidian vault. Your
          searches are saved there as JSON files and persist across restarts.
        </p>

        <ul className="mt-8 flex w-full flex-col gap-3 text-left">
          <FeatureRow
            icon={<FileTextIcon className="size-4" />}
            title="One file per search"
            description="Each research session is stored as a flat JSON file in your vault folder."
          />
          <FeatureRow
            icon={<LayersIcon className="size-4" />}
            title="Automatic sync"
            description="Pipeline progress is written to disk as you go."
          />
        </ul>

        {displayError && (
          <p
            role="alert"
            className="mt-6 w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {displayError}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          className="mt-10 min-w-[220px] px-8 text-base"
          disabled={picking}
          onClick={() => void handlePickFolder()}
        >
          {picking ? "Opening folder picker…" : "Choose folder"}
        </Button>

        <p className="mt-6 text-xs text-muted-foreground">
          You can change the vault folder anytime in Settings.
        </p>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 backdrop-blur-sm">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </li>
  );
}
