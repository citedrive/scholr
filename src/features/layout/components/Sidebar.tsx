import { MixerHorizontalIcon, Pencil2Icon } from "@radix-ui/react-icons";
import { Button } from "@/shared/ui/button";

interface SidebarProps {
  onNewSearch: () => void;
  onSettingsClick: () => void;
}

export function Sidebar({ onNewSearch, onSettingsClick }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="px-2 pt-3 pb-2">
        <Button
          onClick={onNewSearch}
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 py-2 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Pencil2Icon className="size-4 shrink-0" />
          New Search
        </Button>
      </div>

      <div className="mt-auto shrink-0 border-t border-sidebar-border px-2 py-2">
        <Button
          type="button"
          onClick={onSettingsClick}
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <MixerHorizontalIcon className="size-4 shrink-0" />
          Settings
        </Button>
      </div>
    </aside>
  );
}
