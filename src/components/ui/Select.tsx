import {
  Select as AriaSelect,
  type SelectProps as AriaSelectProps,
  Button,
  ListBox,
  ListBoxItem,
  type ListBoxItemProps,
  SelectValue,
  Popover,
} from 'react-aria-components'
import { CaretDown, Check } from '@phosphor-icons/react'

export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, 'children'> {
  /** Accessible label — rendered as visually hidden if no visible label is needed */
  'aria-label'?: string
  /** Item collection (controlled) */
  items?: Iterable<T>
  /** Render function or static ListBoxItem children */
  children: React.ReactNode | ((item: T) => React.ReactNode)
  /** Optional extra class on the outer wrapper */
  className?: string
}

export function Select<T extends object>({
  children,
  items,
  className = '',
  ...props
}: SelectProps<T>) {
  return (
    <AriaSelect
      {...props}
      className={`group flex flex-col gap-1 ${className}`}
    >
      <Button
        className="flex h-9 min-w-[160px] cursor-default items-center gap-2 rounded-lg border border-base-border-default bg-base-background-default px-3 text-sm text-base-foreground-default outline-focus transition-[background-color,border-color,box-shadow]
          hover:border-base-border-hover hover:bg-base-background-hover
          pressed:bg-base-background-active
          focus-visible:outline-2 focus-visible:outline-offset-2
          disabled:cursor-not-allowed disabled:border-base-border-disabled disabled:text-base-foreground-disabled"
      >
        <SelectValue className="flex-1 text-left" />
        <CaretDown
          size={14}
          weight="bold"
          aria-hidden
          className="shrink-0 text-base-subtle-foreground-default"
        />
      </Button>
      <Popover
        className="min-w-[--trigger-width] rounded-lg border border-base-subtle-border-default bg-base-background-default p-1 shadow-md
          data-[entering]:animate-[tooltip-fade-in_150ms_ease-out]
          data-[exiting]:animate-[tooltip-fade-out_100ms_ease-in_forwards]"
        offset={4}
      >
        <ListBox
          items={items}
          className="max-h-60 overflow-auto outline-hidden"
        >
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  )
}

export function SelectItem(props: ListBoxItemProps) {
  return (
    <ListBoxItem
      {...props}
      className="flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm text-base-foreground-default outline-hidden transition-colors
        focus:bg-primary-background-hover focus:text-primary-foreground-default
        selected:font-medium"
    >
      {({ isSelected }) => (
        <>
          <span className="flex-1">{props.children as React.ReactNode}</span>
          {isSelected && (
            <Check
              size={14}
              weight="bold"
              aria-hidden
              className="shrink-0"
            />
          )}
        </>
      )}
    </ListBoxItem>
  )
}

export type { SelectProps }
