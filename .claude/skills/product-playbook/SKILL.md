---
name: product-playbook
description: >
  Enforce design consistency, component reuse, and architectural patterns when building
  UI features. Use when creating components, building pages, implementing Figma designs,
  or any frontend work. Activates automatically on component/design/UI tasks, or
  explicitly via /product-playbook. Modes: create-component, create-ui, prototype, audit, consult.
---

# Product Playbook

## Principles

**Search before build. Compose before create. Report what you invent.**

Every aspect of this product has a Single Source of Truth (SSOT). Before writing any code, identify the relevant SSOT and work FROM it -- never guess, interpret, or reinvent.

| Aspect | SSOT file | Rule |
|--------|-----------|------|
| Design tokens | `src/index.css` `@theme` block | NEVER use raw Tailwind palette colors (e.g. `text-gray-500`). Use semantic tokens: `text-base-subtle-foreground-default` |
| UI components | `src/components/ui/index.ts` | ALWAYS import from this barrel. NEVER rebuild Card/Badge/Button from scratch |
| Data hooks | `src/hooks/use*.ts` | ALWAYS reuse existing hooks. NEVER use raw `useState`+`useEffect` for server data |
| API client | `src/api/client.ts` | ALL API calls go through `api.*`. NEVER use `fetch()` directly in components |
| TypeScript types | `src/types/api.ts` | ALWAYS import types from here. NEVER define inline types for API data |
| Icons | `<Icon>` from `src/components/ui/Icon.tsx` | ALWAYS use the Icon wrapper. NEVER paste inline SVGs or import icon libraries directly |
| Accessibility | React Aria Components | Use for ALL interactive elements. Pair color with text label. `role="status"` for live, `role="alert"` for errors |
| Copy language | German | ALL user-facing text MUST be in German. Labels, errors, placeholders, status text |
| Figma designs | Figma (via MCP) | Figma is the source of truth for visual design. Extract specs, don't interpret |

## Pre-Flight Checklist

MANDATORY before any component, page, or UI work. Do NOT skip this.

1. **Load inventory**: Read `references/inventory.md` in this skill directory. If missing or stale (source files changed since generation), regenerate it following `references/inventory-template.md`.

2. **Figma cross-reference** (when Figma MCP is connected):
   - Call `get_local_variables` with `resolvedType: "COLOR"` to pull Figma color tokens
   - Compare against tokens in `src/index.css` -- flag any gaps
   - Call `get_local_components` and match against the `ui/index.ts` component list

3. **Search for existing patterns**: Before building the requested feature, grep the codebase for similar implementations. Report what you find: "Found N existing usages of similar patterns in [files]."

4. **Report readiness**: Tell the user: "Inventory: N tokens, N components, N hooks. [Figma status]. Ready to proceed in [mode]."

## Modes

### create-component

Build a new reusable UI component for `src/components/ui/`.

**Rules:**
- ONLY use design tokens from `src/index.css`. Zero raw Tailwind palette colors.
- Check inventory for existing sub-components to compose (Icon, Indicator, Badge, Card, etc.)
- Follow existing patterns from `Button.tsx` as the gold standard: variant/size Records, React Aria integration, Phosphor icon typing, named exports, typed props interface
- Accept `className` prop for composition
- Add the component to `src/components/ui/index.ts` barrel export
- Export both the component and its types
- NEVER modify any existing component file

**With Figma:**
- Use `get_node_info` on the target node to extract dimensions, padding, gap, border-radius, fills, strokes
- Use `scan_text_nodes` for typography specs (family, size, weight, line-height)
- Map every Figma fill/stroke color to the nearest `--color-*` token. See `references/design-system.md`.
- If a Figma color has no matching token, report the gap to the user

**Output:** Working `.tsx` file with typed props, token mapping comments, barrel export update.

### create-ui

Build a page or feature section by composing existing components and hooks.

**Rules:**
- Produce a **mapping table** FIRST, before writing code:

  ```
  | Figma element | Existing component | Notes |
  |---------------|--------------------|-------|
  | Status card   | Card + Indicator   |       |
  | Health label  | Badge              |       |
  | Detail panel  | MISSING            | Proposed: DetailPanel with ... |
  ```

- **HARD STOP** when a needed component does not exist. Report to user with proposed spec. Do not silently create inline markup.
- **HARD STOP** when a needed hook does not exist. Report to user with proposed API shape.
- Import types from `src/types/api.ts`. Never define inline.
- Handle all 5 states for data-driven components: loading, empty, populated, error, stale/refreshing.
- Never modify existing `ui/` component definitions to fit new usage. Propose a new variant or new component instead.
- All user-facing text in German.

### prototype

Build quickly but track every deviation.

**Rules:**
- May create new components and hooks as needed
- Must track ALL deviations in a `DEVIATIONS.md` report at the project root:

  ```markdown
  # Deviations Report -- [Feature Name]

  ## New Components Created
  1. `ComponentName` -- inline at `src/components/{feature}/`
     - Reason: No existing equivalent
     - Formalize: Extract to `src/components/ui/`, add to barrel export

  ## New Hooks Created
  ...

  ## Hardcoded Values
  ...
  ```

- Mark inline creations with `// TODO(playbook): Extract to ui/` comments
- After prototyping, present the deviations summary to the user

### audit

Scan existing code for violations.

**Checks:**
1. **Raw Tailwind palette colors**: Grep for pattern `(text|bg|border|ring|shadow|outline|divide)-(gray|slate|red|green|blue|amber|teal|yellow|orange|purple|pink|indigo|violet|cyan|emerald|lime|rose|fuchsia|sky|stone|zinc|neutral)-\d`
2. **Inline types**: Search for inline interface/type definitions that duplicate `types/api.ts`
3. **Direct fetch calls**: Search for `fetch(` in component files (should use `api.*` via hooks)
4. **Inline SVGs**: Search for `<svg` in component files (should use `<Icon>`)
5. **Missing barrel exports**: Check if any `ui/` component isn't exported from `index.ts`
6. **English text**: Scan for English labels/placeholders in German-language app

**Output:** Violation table with file:line, violation type, current value, suggested fix.
Exception: `src/components/dev/` files are excluded (dev-only).

### consult

Discuss architecture, design, and UX decisions with full project context.

**Activation:** Load ALL reference files (design-system, component-patterns, data-layer, quality-standards) + inventory upfront. If Figma MCP is connected, pull current variables and components as discussion input.

**Rules:**
- Ground every opinion in the project's actual SSOTs — cite specific files, tokens, components, hooks
- When asked about a trade-off, present concrete options referencing what exists in the codebase
- Flag when a proposed idea would conflict with existing patterns or SSOTs
- Ask clarifying questions rather than assuming intent
- If the discussion reaches a decision, summarize it as a concrete next step mapped to one of the other 4 modes (e.g. "This would be a `create-component` task for a new Alert primitive")
- NEVER produce implementation code — only reasoning, options, and recommendations

**Topics:**
- **Architecture**: Component boundaries, hook composition, data flow decisions
- **Design system**: Token gaps, when to add new tokens/roles, ui/ vs feature/ placement
- **UX patterns**: State handling for flows, error surfacing strategies, loading approaches
- **Data layer**: Polling vs. push, derived hooks vs. separate queries, cache invalidation
- **Figma ↔ Code drift**: Missing tokens, unimplemented components, spec mismatches

## Reference Files

Load these as needed -- don't load all at once:

- **`references/design-system.md`** -- Token naming convention, color mapping, Figma MCP extraction recipes. Load when doing any color/token/Figma work.
- **`references/component-patterns.md`** -- Component architecture, composition hierarchy, React Aria patterns, props conventions. Load when creating or modifying components.
- **`references/data-layer.md`** -- React Query conventions, hook structure, API client patterns, type usage. Load when creating hooks or data-fetching logic.
- **`references/quality-standards.md`** -- Accessibility, German copy, naming conventions, file taxonomy, spacing rules. Load when reviewing or finalizing work.
- **`references/inventory.md`** -- Auto-generated project inventory. Always load during pre-flight.

## Definition of Done

Before any commit or PR, verify:

- [ ] TypeScript compiles with no errors (`tsc -b`)
- [ ] ESLint passes (`npm run lint`) -- includes custom design token rules
- [ ] No raw Tailwind palette colors in any component
- [ ] No `console.log` in committed code
- [ ] All user-facing text in German
- [ ] New reusable components exported from `src/components/ui/index.ts`
- [ ] New data-fetching wrapped in hooks in `src/hooks/`
- [ ] Loading, error, and empty states handled for data-driven components
- [ ] Interactive elements use React Aria Components
- [ ] Color indicators paired with text labels
- [ ] Keyboard navigable

## Examples

### Audit: ServiceCard.tsx violations

```
/product-playbook audit ServiceCard
```

| File:Line | Current | Fix |
|-----------|---------|-----|
| ServiceCard.tsx:18 | `border-green-200` | `border-success-subtle-border-default` |
| ServiceCard.tsx:20 | `border-yellow-200` | `border-warning-subtle-border-default` |
| ServiceCard.tsx:21 | `border-red-200` | `border-error-subtle-border-default` |
| ServiceCard.tsx:30 | `text-gray-900` | `text-base-foreground-default` |
| ServiceCard.tsx:41 | `text-gray-500` | `text-base-subtle-foreground-default` |
| ServiceCard.tsx:44 | `text-red-600` | `text-error-foreground-default` |

### create-ui: Reuse discovery

User asks: "Build a health status card for a service"

Pre-flight finds:
- Existing components: `Card` (container), `Indicator` (status dot), `Badge` (label+indicator)
- Existing hook: `useServiceHealth(service)` returns `{ health, isHealthy, isDown, isStarting }`
- Existing implementation: `ServiceCard.tsx` already does this (with token violations)

Response: "Found existing `ServiceCard.tsx` at `src/components/health/ServiceCard.tsx` that matches this request but has 5 token violations. Recommend refactoring it instead of creating a new one."

### create-component: Token mapping

User asks: "Create an alert banner with icon, message, and dismiss button"

Pre-flight finds:
- Sub-components to compose: `Icon` (icon slot), `IconButton` (dismiss button with X icon)
- 6 inline alert patterns across HealthDashboard.tsx, SearchPage.tsx, SyncPage.tsx
- No existing `Alert` component in ui/

Response: "Found 6 inline alert patterns. Recommend creating a reusable `Alert` component that replaces all inline instances. Will use `{role}-subtle-background-default` + `{role}-subtle-border-default` + `{role}-foreground-default` token pattern. Composing Icon + IconButton for slots."

### consult: Component placement decision

User asks: "Should ServiceCard be a ui/ component or stay in health/?"

Consult loads inventory and component-patterns.md, then reasons:
- **Reuse criterion**: ui/ components must be used in 2+ features. ServiceCard is currently only in health/.
- **Design primitive criterion**: ui/ represents design system primitives, not business logic. ServiceCard contains health-specific status logic (isHealthy, isDown, isStarting).
- **Composition**: ServiceCard composes Card + Indicator + Badge — all ui/ primitives. This is the expected pattern for feature components.
- **Recommendation**: Keep in `health/`. If a second feature needs a similar card, extract the shared layout to a new `StatusCard` in ui/ and keep the health-specific logic in `health/ServiceCard`.
- **Next step**: If you want to extract → `create-component` mode for a generic `StatusCard`.
