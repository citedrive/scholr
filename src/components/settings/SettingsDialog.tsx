import {
  CHAT_MODEL_OPTIONS,
  type ChatModelId,
} from "@/components/chat/ChatInput";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogViewport,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ProviderModelSettings } from "@/lib/model-settings";
import { enabledModelIds } from "@/lib/model-settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Record<ChatModelId, ProviderModelSettings>;
  onSettingsChange: (
    next: Record<ChatModelId, ProviderModelSettings>,
  ) => void;
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: SettingsDialogProps) {
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
              {CHAT_MODEL_OPTIONS.map((opt) => {
                const row = settings[opt.id];
                return (
                  <div
                    key={opt.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">{opt.label}</span>
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
