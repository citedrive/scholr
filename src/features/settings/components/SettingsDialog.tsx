import { useEffect, useState } from "react";
import {
  CHAT_MODEL_OPTIONS,
  type ChatModelId,
} from "@/shared/types/chat-model";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogViewport,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import type { ProviderModelSettings } from "@/shared/lib/model-settings";
import { enabledModelIds } from "@/shared/lib/model-settings";
import { setApiKey, hasApiKey } from "@/shared/lib/model-service";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Record<ChatModelId, ProviderModelSettings>;
  onSettingsChange: (
    next: Record<ChatModelId, ProviderModelSettings>,
  ) => void;
  vaultPath: string | null;
  onChangeVault: () => void;
}

function shortenPath(path: string, max = 48): string {
  if (path.length <= max) return path;
  const head = Math.floor((max - 1) / 2);
  const tail = max - 1 - head;
  return `${path.slice(0, head)}…${path.slice(-tail)}`;
}

const PROVIDERS_WITH_KEYS: ChatModelId[] = ["chatgpt", "claude"];

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  vaultPath,
  onChangeVault,
}: SettingsDialogProps) {
  const [keyInputs, setKeyInputs] = useState<Partial<Record<ChatModelId, string>>>({});
  const [keyStatuses, setKeyStatuses] = useState<Partial<Record<ChatModelId, boolean>>>({});
  const [saving, setSaving] = useState<Partial<Record<ChatModelId, boolean>>>({});

  useEffect(() => {
    if (!open) return;
    setKeyInputs({});
    Promise.all(
      PROVIDERS_WITH_KEYS.map(async (id) => {
        const has = await hasApiKey(id).catch(() => false);
        return [id, has] as const;
      }),
    ).then((entries) => {
      setKeyStatuses(Object.fromEntries(entries));
    });
  }, [open]);

  function updateProvider(
    id: ChatModelId,
    patch: Partial<ProviderModelSettings>,
  ) {
    onSettingsChange({
      ...settings,
      [id]: { ...settings[id], ...patch },
    });
  }

  function handleEnabledChange(id: ChatModelId, checked: boolean) {
    if (!checked) {
      const candidate = {
        ...settings,
        [id]: { ...settings[id], enabled: false },
      };
      if (enabledModelIds(candidate).length === 0) {
        return;
      }
    }
    updateProvider(id, { enabled: checked });
  }

  async function handleSaveKey(id: ChatModelId) {
    const key = keyInputs[id]?.trim() ?? "";
    setSaving((prev) => ({ ...prev, [id]: true }));
    try {
      await setApiKey(id, key);
      setKeyStatuses((prev) => ({ ...prev, [id]: key.length > 0 }));
      setKeyInputs((prev) => ({ ...prev, [id]: "" }));
    } finally {
      setSaving((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogViewport>
          <DialogPopup className="max-h-[min(90vh,560px)] overflow-y-auto">
            <DialogClose />
            <DialogTitle>Model settings</DialogTitle>
            <DialogDescription className="mt-2">
              Choose which providers appear in chat and set the model id for
              each. At least one provider must stay enabled.
            </DialogDescription>

            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <span className="text-sm font-medium">Vault</span>
                <p className="text-xs text-muted-foreground">
                  Folder where searches are stored as JSON files.
                </p>
                <p
                  className="truncate font-mono text-xs text-foreground"
                  title={vaultPath ?? undefined}
                >
                  {vaultPath ? shortenPath(vaultPath) : "No folder selected"}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="self-start"
                  onClick={onChangeVault}
                >
                  Change vault folder
                </Button>
              </div>

              {CHAT_MODEL_OPTIONS.map((opt) => {
                const row = settings[opt.id];
                const needsKey = PROVIDERS_WITH_KEYS.includes(opt.id);
                const hasSavedKey = keyStatuses[opt.id] ?? false;
                const inputVal = keyInputs[opt.id] ?? "";
                const isSaving = saving[opt.id] ?? false;

                return (
                  <div
                    key={opt.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{opt.label}</span>
                        {needsKey && hasSavedKey && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                            <span className="size-1.5 rounded-full bg-green-500" />
                            Key saved
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Active
                        </span>
                        <Switch
                          checked={row.enabled}
                          onCheckedChange={(checked) =>
                            handleEnabledChange(opt.id, checked)
                          }
                        />
                      </div>
                    </div>

                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        Model id
                      </span>
                      <Input
                        value={row.modelName}
                        onChange={(e) =>
                          updateProvider(opt.id, {
                            modelName: e.target.value,
                          })
                        }
                        placeholder="e.g. gpt-4o"
                        disabled={!row.enabled}
                        autoComplete="off"
                      />
                    </label>

                    {needsKey && (
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          API key
                        </span>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            value={inputVal}
                            onChange={(e) =>
                              setKeyInputs((prev) => ({
                                ...prev,
                                [opt.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveKey(opt.id);
                            }}
                            placeholder={
                              hasSavedKey
                                ? "Key saved — paste new to replace"
                                : "Paste API key…"
                            }
                            autoComplete="off"
                            className="flex-1 font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={inputVal.trim().length === 0 || isSaving}
                            onClick={() => handleSaveKey(opt.id)}
                          >
                            {isSaving ? "Saving…" : "Save"}
                          </Button>
                        </div>
                        {hasSavedKey && (
                          <button
                            type="button"
                            className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                            onClick={async () => {
                              await setApiKey(opt.id, "");
                              setKeyStatuses((prev) => ({
                                ...prev,
                                [opt.id]: false,
                              }));
                            }}
                          >
                            Clear saved key
                          </button>
                        )}
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </DialogPopup>
        </DialogViewport>
      </DialogPortal>
    </Dialog>
  );
}
