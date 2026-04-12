import { useRef, useState } from "react";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  CounterClockwiseClockIcon,
  CrossCircledIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
interface ChatInputProps {
  onSubmit: (content: string) => void;
  disabled?: boolean;
  borderless?: boolean;
}

export function ChatInput({
  onSubmit,
  disabled = false,
  borderless = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      {/* Text area */}
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

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        {/* Left controls */}
        <div className="flex items-center gap-1.5">
          {/* Agent selector */}
          <button className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
            <CrossCircledIcon className="size-3.5 text-muted-foreground" />
            Research agent
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </button>

          {/* Mode selector */}
          <button className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent">
            General
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </button>

          {/* History */}
          <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <CounterClockwiseClockIcon className="size-3.5" />
          </button>

          {/* Attach */}
          <button className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <PlusIcon className="size-3.5" />
          </button>
        </div>

        {/* Send button */}
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
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      </div>
    </div>
  );
}
