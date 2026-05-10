import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, ChevronUpIcon } from "@radix-ui/react-icons";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import {
  CHAT_MODEL_OPTIONS,
  type ChatModelId,
} from "@/shared/types/chat-model";

export type { ChatModelId };
export { CHAT_MODEL_OPTIONS };

interface ChatInputProps {
  onSubmit: (content: string) => void;
  disabled?: boolean;
  borderless?: boolean;
  model?: ChatModelId;
  defaultModel?: ChatModelId;
  onModelChange?: (id: ChatModelId) => void;
  enabledModelIds: ChatModelId[];
}

export function ChatInput({
  onSubmit,
  disabled = false,
  borderless = false,
  model: modelControlled,
  defaultModel = CHAT_MODEL_OPTIONS[0].id,
  onModelChange,
  enabledModelIds,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [internalModel, setInternalModel] = useState<ChatModelId>(defaultModel);
  const [menuOpen, setMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isControlled = modelControlled !== undefined;
  const selectedId = isControlled ? modelControlled : internalModel;

  function setModel(id: ChatModelId) {
    onModelChange?.(id);
    if (!isControlled) setInternalModel(id);
  }

  const pickerOptions = CHAT_MODEL_OPTIONS.filter((m) =>
    enabledModelIds.includes(m.id),
  );

  const selectedLabel =
    pickerOptions.find((m) => m.id === selectedId)?.label ??
    pickerOptions[0]?.label ??
    "No model";

  const pickerDisabled = pickerOptions.length === 0;

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (pickerDisabled && menuOpen) {
      setMenuOpen(false);
    }
  }, [pickerDisabled, menuOpen]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  const card = (
    <div className="rounded-2xl border border-border bg-background shadow-sm">
      <Textarea
        ref={textareaRef}
        rows={3}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="Ask a research question…"
        disabled={disabled}
        className="min-h-[80px] max-h-[200px] resize-none overflow-y-auto border-none bg-transparent px-4 pt-3 pb-2 text-sm leading-relaxed shadow-none focus-visible:ring-0 focus-visible:border-none"
      />

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            disabled={pickerDisabled}
            onClick={() => {
              if (pickerDisabled) return;
              setMenuOpen((o) => !o);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            aria-label={
              pickerDisabled
                ? "No model providers enabled — open Settings"
                : "Choose model"
            }
            title={
              pickerDisabled
                ? "Enable a provider in Settings to choose a model"
                : undefined
            }
          >
            {selectedLabel}
            <ChevronUpIcon className="size-3 text-muted-foreground" />
          </button>
          {menuOpen && !pickerDisabled ? (
            <ul
              className="absolute bottom-full left-0 z-20 mb-1 min-w-40 rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-md"
              role="listbox"
              aria-label="Model"
            >
              {pickerOptions.map((opt) => (
                <li key={opt.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.id === selectedId}
                    className="flex w-full items-center px-3 py-2 text-left text-xs hover:bg-accent"
                    onClick={() => {
                      setModel(opt.id);
                      setMenuOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!value.trim() || disabled}
          size="icon"
          className="size-8 shrink-0 rounded-lg"
          aria-label="Send message"
        >
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );

  if (borderless) {
    return <div className="w-full">{card}</div>;
  }

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="mx-auto max-w-3xl">
        {card}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Enter sends the message. Shift+Enter adds a line.
        </p>
      </div>
    </div>
  );
}
