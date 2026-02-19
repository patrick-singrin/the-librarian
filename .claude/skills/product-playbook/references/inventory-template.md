# Inventory Generation Template

Instructions for generating `inventory.md` from the current codebase. Run this whenever the inventory is stale or missing.

## Step 1: Discover token file

Look for design tokens in order of priority:
1. `src/index.css` -- search for `@theme` block (Tailwind v4 CSS-first config)
2. `tailwind.config.ts` or `tailwind.config.js` -- search for `theme.extend.colors` (Tailwind v3)
3. Any `.css` file with `--color-*` custom property definitions
4. `tokens.json` or `design-tokens.json` (JSON token format)

Extract all `--color-*` custom properties. Organize by role, surface, and state.

**Token naming pattern:** `--color-{role}-{surface}-{state}`
- Roles: base, primary, success, warning, error, info (+ any custom)
- Surfaces: background, foreground, border, subtle-background, subtle-foreground, subtle-border, p-background, p-foreground
- States: default, hover, active, disabled

Also extract: font families (`--font-*`), status colors (`--color-status-*`), focus color (`--color-focus`).

## Step 2: Discover UI components

Look for barrel export files in order:
1. `src/components/ui/index.ts` (or `.tsx`)
2. `src/components/index.ts`
3. `src/components/primitives/index.ts`

For each exported component, record:
- **Name**: The export name
- **File**: Source file path
- **Props**: Key props (variants, sizes, required props)
- **Composes**: Which other ui/ components it uses internally

## Step 3: Discover hooks

Glob for `src/hooks/use*.ts` (or `.tsx`).

For each hook, read the file and record:
- **Name**: Hook function name
- **Query key**: The TanStack React Query key (e.g., `['health']`)
- **Interval**: `refetchInterval` value if set
- **Returns**: Key return properties (data type, mutations)
- **Depends on**: Other hooks or API methods used

## Step 4: Discover API types

Read `src/types/api.ts` (or equivalent).

List all exported types and interfaces with a one-line description of each.

## Step 5: Discover API client

Read `src/api/client.ts` (or equivalent).

List all API methods with their HTTP method, path, and return type.

## Output format

Write the inventory to `references/inventory.md` in this format:

```markdown
# Project Inventory
Generated: [date]
Source files: [list of files scanned]

## Design Tokens
Token file: `[path]`
Pattern: `--color-{role}-{surface}-{state}` → Tailwind: `{bg|text|border}-{role}-{surface}-{state}`

### Roles
- **base** (→ slate): background, foreground, border, subtle-*, p-* × default/hover/active/disabled
- **primary** (→ blue): ...
[etc.]

### Special tokens
- Focus: `--color-focus` (teal-500)
- Status: `--color-status-{healthy|degraded|down}` (oklch)
- Fonts: `--font-sans`, `--font-serif`, `--font-mono`

## UI Components
Barrel: `[path]`

| Component | Props | Variants | Composes |
|-----------|-------|----------|----------|
| Button | variant, size, iconLeft, iconRight | 9 variants (3 roles × 3 styles), 3 sizes | AriaButton, Icon |
[etc.]

## Data Hooks
Directory: `[path]`

| Hook | Query Key | Interval | Returns |
|------|-----------|----------|---------|
| useHealth | ['health'] | 30s | HealthResponse |
[etc.]

## API Types
File: `[path]`

| Type | Description |
|------|-------------|
| ServiceHealth | status, latencyMs, error? |
[etc.]

## API Client
File: `[path]`

| Method | HTTP | Path | Returns |
|--------|------|------|---------|
| api.health | GET | /api/health | HealthResponse |
[etc.]
```

## Staleness detection

The inventory is stale if any of these files were modified since the `Generated` date:
- Token file (`src/index.css`)
- Component barrel (`src/components/ui/index.ts`)
- Any file in `src/hooks/`
- `src/types/api.ts`
- `src/api/client.ts`
