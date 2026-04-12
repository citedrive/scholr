import { cn } from "@/lib/utils";

export interface SidebarItem {
  id: string;
  title: string;
  createdAt: Date;
}

interface SearchHistoryItemProps {
  item: SidebarItem;
  isActive: boolean;
  onSelect: (id: string) => void;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function SearchHistoryItem({
  item,
  isActive,
  onSelect,
}: SearchHistoryItemProps) {
  return (
    <button
      onClick={() => onSelect(item.id)}
      className={cn(
        "flex w-full flex-col rounded-md px-3 py-2 text-left transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground",
      )}
    >
      <p className="truncate text-sm leading-snug">{item.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatDate(item.createdAt)}
      </p>
    </button>
  );
}
