import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import { Dialog, DialogPortal } from '@/components/ui/dialog';

// Cream or Maroon Panel, hairline ring, no shadow
export const DIALOG_SURFACE =
  'grid gap-4 rounded-lg bg-popover p-4 pb-0 text-sm text-popover-foreground ring-1 ring-foreground/10';

// Flat scrim, locked while sending
export function RedeemShell({
  open,
  locked,
  onClose,
  onCloseFocus,
  children,
}: {
  open: boolean;
  locked: boolean;
  onClose: () => void;
  // Focus target on close
  onCloseFocus: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !locked) onClose();
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Overlay
          data-slot="dialog-overlay"
          className="fixed inset-0 z-50 bg-black/50 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          onEscapeKeyDown={(event) => locked && event.preventDefault()}
          onInteractOutside={(event) => locked && event.preventDefault()}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onCloseFocus();
          }}
          className={`${DIALOG_SURFACE} fixed top-1/2 left-1/2 z-50 max-h-[calc(100svh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none sm:max-w-sm`}
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
