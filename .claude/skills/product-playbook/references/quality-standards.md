# Quality Standards

## Accessibility

### Required patterns
- **Interactive elements**: Use React Aria Components (`Button`, `Link`, `TextField`, `Select`, etc.) for ALL interactive elements. Never use raw `<button>`, `<input>`, `<select>` -- wrap them via the `ui/` components.
- **Color + text pairing**: Never convey information through color alone. Every status indicator (Indicator component) must be accompanied by a text label.
- **Live regions**: Use `role="status"` for non-critical live updates (health checks, sync progress). Use `role="alert"` for errors that need immediate attention.
- **Semantic HTML**: Use `<article>` for self-contained content units (cards, tiles), `<section>` for page sections with headings, `<header>`/`<footer>` for container headers/footers, `<nav>` for navigation.
- **Icon-only buttons**: Always provide `aria-label` when a button has no visible text.
- **Keyboard navigation**: All interactive elements must be reachable and operable via keyboard. React Aria handles this when used correctly.
- **Focus management**: Use `--color-focus` (teal-500) for focus rings via `outline-focus` Tailwind utility. Ensure visible focus indicators on all interactive elements.

### Pattern: accessible status display
```tsx
<span role="status" className="flex items-center gap-1.5">
  <Indicator variant={statusVariant} size="xs" />
  {statusLabel}  {/* Text always accompanies the color indicator */}
</span>
```

## German Copy

All user-facing text MUST be in German. This includes:
- Button labels
- Form labels and placeholders
- Error messages
- Status text and descriptions
- Empty state messages
- Tooltips
- Navigation items
- Page headings

### Patterns
- Button labels: concise verbs ("Speichern", "Abbrechen", "Aktualisieren")
- Error messages: "[Was ist passiert]. [Was der Nutzer tun kann]."
  Example: "Verbindung fehlgeschlagen. Bitte die Einstellungen pruefen."
- Status text: short and factual ("Gesund", "Eingeschraenkt", "Nicht erreichbar")
- Empty states: friendly and helpful ("Keine Dokumente gefunden. Neue Dokumente werden automatisch erkannt.")

NEVER let AI generate English text for the UI. If unsure about German phrasing, flag it to the user rather than guessing.

## Naming Conventions

### Files
- **Components**: PascalCase -- `ServiceCard.tsx`, `KpiTile.tsx`
- **Hooks**: camelCase with `use` prefix -- `useHealth.ts`, `useSyncStatus.ts`
- **Types**: PascalCase file, PascalCase exports -- `api.ts` with `ServiceHealth`, `OverviewStats`
- **Utilities**: camelCase -- `relativeTime.ts`, `formatBytes.ts`
- **Directories**: kebab-case or single lowercase word -- `ui/`, `health/`, `sync/`

### Exports
- **Named exports ONLY** -- no `export default` anywhere
- **Components**: `export function ComponentName`
- **Types**: `export type { Props, Variant }` at the bottom of the file
- **Hooks**: `export function useHookName`

### Variables and functions
- camelCase for variables and functions
- PascalCase for types, interfaces, and components
- UPPER_SNAKE_CASE only for true constants (e.g., `const MAX_RETRIES = 3`)

## File Taxonomy

```
src/
├── api/
│   └── client.ts              # API client (SSOT for all HTTP calls)
├── components/
│   ├── ui/                    # Reusable primitives (design system)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── index.ts           # Barrel export (SSOT for available components)
│   │   └── ...
│   ├── layout/                # App shell, sidebar, layout components
│   ├── health/                # Health monitoring feature
│   ├── sync/                  # RAG sync feature
│   ├── meta/                  # Meta enrichment feature
│   ├── search/                # Search feature
│   ├── settings/              # Settings feature
│   └── dev/                   # Dev-only components (excluded from audits)
├── hooks/                     # Custom hooks (SSOT for data access)
├── types/
│   └── api.ts                 # API types (SSOT for data models)
└── index.css                  # Design tokens (SSOT for visual design)
```

### Where to put new files
- Reusable UI primitive → `src/components/ui/` + add to barrel export
- Feature-specific component → `src/components/{feature}/`
- Data hook → `src/hooks/use{Domain}.ts`
- API type → `src/types/api.ts`
- New API method → `src/api/client.ts`

NEVER create: `helpers.ts`, `utils.ts` (too generic), `misc/` directories, or files outside this taxonomy without explicit user approval.

## Spacing Conventions

Use Tailwind's spacing scale only. NEVER use arbitrary values like `gap-[13px]` or `p-[7px]`.

### Standard spacing
| Context | Spacing | Tailwind |
|---------|---------|----------|
| Page sections | 24px | `gap-6` |
| Between cards/tiles | 16px | `gap-4` |
| Card internal padding | 16px | `p-4` |
| Card internal spacing | 12px | `gap-3` |
| Inline items | 8px | `gap-2` |
| Tight inline (icon+text) | 6px | `gap-1.5` |
| Small padding (badges) | 4-8px | `px-2 py-0.5` |

### Typography
- Page headings: `text-lg font-semibold`
- Section headings: `text-base font-semibold`
- Card titles: `text-sm font-semibold`
- Body text: `text-sm`
- Small/meta text: `text-xs`
- All text uses `font-sans` (Atkinson Hyperlegible Next) by default

## Error Handling

### The 5 states of data-driven components

Every component that displays server data must handle these states:

1. **Loading**: Show appropriate loading indicator (skeleton for layout-heavy, spinner for actions)
2. **Empty**: Show helpful message in German ("Keine Eintraege gefunden")
3. **Populated**: Normal display
4. **Error**: Show error message with `role="alert"`, use error token colors, suggest action
5. **Stale/Refreshing**: Optionally show a subtle refresh indicator (e.g., `isFetching` from React Query)

### Error display pattern
```tsx
{isError && (
  <p role="alert" className="text-sm text-error-foreground-default">
    {error.message}
  </p>
)}
```

Use `error-foreground-default` for error text, `error-subtle-background-default` + `error-subtle-border-default` for error containers.
