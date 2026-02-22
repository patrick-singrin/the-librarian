import { type ReactNode } from 'react'
import {
  Dialog as AriaDialog,
  Heading,
  Modal,
  ModalOverlay,
} from 'react-aria-components'

interface DialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Called when open state changes (e.g. backdrop click, Escape key) */
  onOpenChange: (open: boolean) => void
  /** Optional heading rendered at the top of the dialog */
  title?: string
  children: ReactNode
  className?: string
}

/**
 * Dialog — modal overlay wrapping React Aria ModalOverlay + Modal + Dialog.
 *
 * Centered overlay with backdrop blur. White card with rounded corners.
 * Pressing Escape or clicking the backdrop closes the dialog via `onOpenChange`.
 */
export function Dialog({
  isOpen,
  onOpenChange,
  title,
  children,
  className = '',
}: DialogProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-foreground-default/40 backdrop-blur-sm"
    >
      <Modal className={`w-full max-w-md rounded-xl border border-base-subtle-border-default bg-base-background-default p-6 shadow-lg outline-none ${className}`}>
        <AriaDialog className="outline-none">
          {title && (
            <Heading slot="title" className="mb-4 text-lg font-semibold text-base-foreground-default">
              {title}
            </Heading>
          )}
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  )
}

export type { DialogProps }
