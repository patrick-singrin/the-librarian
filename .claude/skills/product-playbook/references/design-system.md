# Design System Reference

## Token Naming Convention

All design tokens are defined in `src/index.css` inside the `@theme static { }` block.

### Pattern
```
CSS variable:  --color-{role}-{surface}-{state}
Tailwind class: {prefix}-{role}-{surface}-{state}
```

Where `{prefix}` is `bg`, `text`, `border`, `ring`, `shadow`, `outline`, or `divide`.

### Roles (6)
| Role | Maps to | Use for |
|------|---------|---------|
| `base` | slate | Default UI elements, text, borders |
| `primary` | blue | Interactive elements, CTAs, links |
| `success` | green | Positive states, confirmations |
| `warning` | amber | Cautionary states, degraded |
| `error` | red | Error states, destructive actions |
| `info` | teal | Informational elements |

### Surfaces (8 per role)
| Surface | Use for |
|---------|---------|
| `background` | Element background fill |
| `foreground` | Text/icon color |
| `border` | Strong border |
| `subtle-background` | Light/muted background |
| `subtle-foreground` | Secondary text |
| `subtle-border` | Light border, dividers |
| `p-background` | Primary/filled variant background |
| `p-foreground` | Text on filled background (usually white) |

### States (4 per surface)
`default`, `hover`, `active`, `disabled`

### Special tokens
- `--color-focus` (teal-500): Focus ring color
- `--color-status-healthy` (oklch): Custom green for health indicators
- `--color-status-degraded` (oklch): Custom amber for degraded state
- `--color-status-down` (oklch): Custom red for down state

### Common mappings

| Instead of (WRONG) | Use (CORRECT) |
|---------------------|---------------|
| `text-gray-900` | `text-base-foreground-default` |
| `text-gray-700` | `text-base-subtle-foreground-default` |
| `text-gray-500` | `text-base-subtle-foreground-default` |
| `text-gray-400` | `text-base-foreground-disabled` |
| `bg-white` | `bg-base-background-default` |
| `bg-gray-100` | `bg-base-subtle-background-default` |
| `border-gray-200` | `border-base-subtle-border-default` |
| `border-gray-300` | `border-base-subtle-border-default` |
| `text-blue-600` | `text-primary-foreground-default` |
| `text-blue-700` | `text-primary-subtle-foreground-default` |
| `bg-blue-600` | `bg-primary-p-background-default` |
| `border-green-200` | `border-success-subtle-border-default` |
| `text-green-600` | `text-success-foreground-default` |
| `text-red-600` | `text-error-foreground-default` |
| `border-red-200` | `border-error-subtle-border-default` |
| `border-yellow-200` | `border-warning-subtle-border-default` |
| `text-amber-600` | `text-warning-foreground-default` |

### Violation detection regex

```regex
(text|bg|border|ring|shadow|outline|divide)-(gray|slate|red|green|blue|amber|teal|yellow|orange|purple|pink|indigo|violet|cyan|emerald|lime|rose|fuchsia|sky|stone|zinc|neutral)-\d{2,3}
```

This catches any raw Tailwind palette usage. Exceptions: `src/components/dev/` (dev-only files).

## Figma MCP Extraction Recipes

### Extract all color tokens from Figma
```
Tool: get_local_variables
Parameter: resolvedType: "COLOR"
```
Returns all Figma color variables with their values per mode. Cross-reference against `src/index.css` tokens.

### Inspect a component's specs
```
Tool: get_node_info
Parameter: nodeId: "<from selection or known ID>"
```
Extract: width, height, padding, gap (itemSpacing), borderRadius (cornerRadius), fills, strokes, effects.

### Map Figma colors to tokens
Figma uses RGBA with values 0-1 (not 0-255). To map a Figma fill to a token:
1. Get the RGBA values from the fill
2. Convert to hex: `Math.round(r * 255).toString(16)` etc.
3. Match against the Tailwind palette color that the token references (e.g., `--color-base-foreground-default: var(--color-slate-950)`)
4. Use the semantic token name, not the raw palette

### Extract text specs
```
Tool: scan_text_nodes
Parameter: nodeId: "<frame ID>"
```
Returns all text nodes with: content, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing.

Map font families:
- "Atkinson Hyperlegible Next" or similar sans → `font-sans`
- "Literata" or similar serif → `font-serif`
- Monospace → `font-mono`

### Export visual reference
```
Tool: export_node_as_image
Parameters: nodeId: "<ID>", format: "PNG", scale: 2
```
Use as visual reference for layout comparison. Do not rely solely on this -- always extract numerical specs.

### Get component inventory from Figma
```
Tool: get_local_components
```
Returns all Figma components. Match against `src/components/ui/index.ts` exports to identify:
- Which Figma components have code implementations
- Which Figma components are missing from code
- Which code components have no Figma equivalent
