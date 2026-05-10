import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Cross2Icon } from "@radix-ui/react-icons";
import { cn } from "@/shared/lib/utils";

function DialogRoot(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal {...props} />;
}

function DialogBackdrop({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/50 transition-[opacity,backdrop-filter] data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

function DialogViewport({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Viewport>) {
  return (
    <DialogPrimitive.Viewport
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 outline-none",
        className,
      )}
      {...props}
    />
  );
}

function DialogPopup({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup>) {
  return (
    <DialogPrimitive.Popup
      className={cn(
        "relative z-50 w-full max-w-lg rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogClose({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return (
    <DialogPrimitive.Close
      aria-label="Close"
      className={cn(
        "absolute right-4 top-4 rounded-md p-1 text-muted-foreground opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    >
      {children ?? <Cross2Icon className="size-4" aria-hidden />}
    </DialogPrimitive.Close>
  );
}

export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogViewport,
  DialogPopup,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
