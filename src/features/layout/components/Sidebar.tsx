import {
  MixerHorizontalIcon,
  Pencil2Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import type { SearchHistoryItem } from "@/types/vault";
import { Button } from "@/shared/ui/button";

interface SidebarProps {
  items: SearchHistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewSearch: () => void;
  onSettingsClick: () => void;
}

function truncateQuery(query: string, max = 42): string {
  const trimmed = query.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function Sidebar({
  items,
  activeId,
  onSelect,
  onDelete,
  onNewSearch,
  onSettingsClick,
}: SidebarProps) {
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

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {items.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">
            No saved searches yet
          </p>
        ) : (
          items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <div
                key={item.id}
                className={[
                  "group flex items-stretch rounded-md transition-colors",
                  isActive
                    ? "bg-sidebar-accent"
                    : "hover:bg-sidebar-accent/60",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={[
                    "min-w-0 flex-1 px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground",
                  ].join(" ")}
                  title={item.query}
                >
                  <span className="line-clamp-2 leading-snug">
                    {truncateQuery(item.query)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className={[
                    "flex shrink-0 items-center justify-center px-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100",
                    isActive
                      ? "text-sidebar-accent-foreground hover:text-destructive"
                      : "text-muted-foreground hover:text-destructive",
                  ].join(" ")}
                  title="Delete search"
                  aria-label={`Delete search: ${item.query}`}
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </div>
            );
          })
        )}
      </nav>

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
