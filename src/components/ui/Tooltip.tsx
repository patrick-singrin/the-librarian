import { type ReactNode } from 'react'
import {
  Tooltip as AriaTooltip,
  TooltipTrigger,
  OverlayArrow,
  type TooltipProps as AriaTooltipProps,
} from 'react-aria-components'

type Placement = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  /** Trigger element — must be focusable (button, link, etc.) */
  children: ReactNode
  /** Tooltip body content */
  content: ReactNode
  /** Placement relative to trigger */
  placement?: Placement
  /** Delay before showing (ms) */
  delay?: number
  /** Delay before hiding (ms) */
  closeDelay?: number
}

export function Tooltip({
  children,
  content,
  placement = 'bottom',
  delay = 700,
  closeDelay = 0,
}: TooltipProps) {
  return (
    <TooltipTrigger delay={delay} closeDelay={closeDelay}>
      {children}
      <AriaTooltip
        placement={placement}
        offset={8}
        className="rounded-lg border border-base-subtle-border-default bg-base-background-default px-3 py-2 text-xs shadow-md
          data-[entering]:animate-[tooltip-fade-in_150ms_ease-out]
          data-[exiting]:animate-[tooltip-fade-out_100ms_ease-in_forwards]"
      >
        {({ placement: resolvedPlacement }) => (
          <>
            <OverlayArrow>
              <svg
                width={8}
                height={8}
                viewBox="0 0 8 8"
                className={resolvedPlacement === 'bottom' ? 'rotate-180' : resolvedPlacement === 'left' ? '-rotate-90' : resolvedPlacement === 'right' ? 'rotate-90' : ''}
              >
                <path d="M0 0 L4 4 L8 0" className="fill-base-background-default stroke-base-subtle-border-default" />
              </svg>
            </OverlayArrow>
            {content}
          </>
        )}
      </AriaTooltip>
    </TooltipTrigger>
  )
}

export type { TooltipProps }
