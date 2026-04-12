import { Pencil2Icon } from "@radix-ui/react-icons";
import type { ResearchSession } from "@/types/research";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SearchHistoryItem } from "./SearchHistoryItem";

interface SidebarProps {
  sessions: ResearchSession[];
  activeId: string | null;
  onNewSearch: () => void;
  onSelectSession: (id: string) => void;
}

export function Sidebar({
  sessions,
  activeId,
  onNewSearch,
  onSelectSession,
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

      <div className="px-3 pb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent
        </p>
      </div>

      <ScrollArea className="flex-1 px-2 pb-3">
        <div className="flex flex-col gap-0.5">
          {sessions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Lorem ipsum dolor sit amet.
            </p>
          ) : (
            sessions.map((sess) => (
              <SearchHistoryItem
                key={sess.id}
                item={{ id: sess.id, title: sess.query, createdAt: sess.createdAt }}
                isActive={sess.id === activeId}
                onSelect={onSelectSession}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
