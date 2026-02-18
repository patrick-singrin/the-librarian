import { type ElementType, type HTMLAttributes, type ReactNode } from 'react'

type CardPadding = 'sm' | 'md'

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType
  padding?: CardPadding
  children: ReactNode
  className?: string
}

const paddingClasses: Record<CardPadding, string> = {
  sm: 'p-4',
  md: 'p-5',
}

export function Card({
  as: Component = 'div',
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <Component
      className={`rounded-xl border border-base-subtle-border-default bg-base-background-default shadow-sm ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}

export type { CardProps, CardPadding }
