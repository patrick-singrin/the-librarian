# Component Architecture Patterns

## Gold Standard: Button.tsx

`src/components/ui/Button.tsx` is the reference implementation. All new components should follow its patterns.

### Required patterns

1. **Named exports only** -- no `export default`
   ```tsx
   export function MyComponent({ ... }: MyComponentProps) { }
   export type { MyComponentProps }
   ```

2. **Typed props interface** -- exported separately
   ```tsx
   interface MyComponentProps {
     variant?: MyVariant
     size?: MySize
     className?: string
     children: ReactNode
   }
   ```

3. **Accept `className` prop** -- for composition by parent components
   ```tsx
   <div className={`base-classes ${className}`}>
   ```

4. **Variant/size Records** -- use `Record<Variant, string>` for Tailwind class mappings
   ```tsx
   const variantClasses: Record<MyVariant, string> = {
     'primary': 'bg-primary-p-background-default text-primary-p-foreground-default ...',
     'base': 'bg-base-p-background-default text-base-p-foreground-default ...',
   }
   ```

5. **Semantic token mapping comment** -- document which token pattern is used
   ```tsx
   /*
    * Semantic token mapping:
    * solid   → {role}/p-background + {role}/p-foreground
    * outline → {role}/border + {role}/foreground
    * ghost   → {role}/foreground → {role}/subtle-background on hover
    */
   ```

6. **React Aria integration** -- wrap interactive elements with React Aria components
   ```tsx
   import { Button as AriaButton } from 'react-aria-components'
   ```
   Note: ONLY `src/components/ui/` files may import from `react-aria-components` directly. All other files must import from `@/components/ui`.

7. **Phosphor icon typing** -- use `ComponentType<PhosphorIconProps>` for icon props
   ```tsx
   import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'
   iconLeft?: ComponentType<PhosphorIconProps>
   ```

8. **Accessibility** -- icon-only variants require `aria-label`
   ```tsx
   interface ButtonIconOnly extends ButtonBaseProps {
     children?: never
     'aria-label': string
   }
   ```

### Barrel export

After creating a new `ui/` component, add it to `src/components/ui/index.ts`:
```tsx
export { MyComponent } from './MyComponent'
export type { MyComponentProps, MyVariant } from './MyComponent'
```

## Composition Hierarchy

Existing component relationships:

```
Card (base container)
├── StatTile (Card + label/value layout)
│   └── WarnTile (warning-themed StatTile)
└── Tile (article-based container with title/icon/badge/footer)
    └── KpiTile (Tile with large centered value)

Button (interactive)
└── IconButton (inline icon + optional text variant)

InputItem (low-level input wrapper)
└── TextField (InputItem + Label + error handling)
    └── Label (with required indicator, info tooltip, helper text)

Badge (chip with optional indicator)
Indicator (status dot)
Icon (Phosphor icon wrapper with size presets)
Tooltip (React Aria tooltip with animation)
NavItem (sidebar navigation link)
Select / SelectItem (React Aria dropdown)
```

When composing, check this hierarchy first. If a parent component exists that matches your need, extend it rather than building from scratch.

## Component naming

- PascalCase for files and export names: `ServiceCard.tsx`, `export function ServiceCard`
- Types suffixed with purpose: `ButtonProps`, `ButtonVariant`, `ButtonSize`
- Feature components go in `src/components/{feature}/`: `health/`, `sync/`, `meta/`, `search/`, `settings/`
- Reusable primitives go in `src/components/ui/`

## When to create a new ui/ component

A component belongs in `ui/` if:
- It's used (or will be used) in 2+ different features
- It represents a design system primitive (not business logic)
- It has a corresponding Figma component

A component stays in `{feature}/` if:
- It's specific to one feature's business logic
- It composes ui/ components but adds domain-specific behavior

## Icon usage

Always use the `<Icon>` wrapper from `src/components/ui/Icon.tsx`:
```tsx
import { Icon } from '@/components/ui'
import { Heart } from '@phosphor-icons/react'

<Icon icon={Heart} size="md" />
```

Available sizes: `xs` (14), `sm` (18), `md` (22), `lg` (28), `xl` (36).

NEVER: paste inline `<svg>` elements, import from other icon libraries, or use Phosphor icons without the `<Icon>` wrapper.
