import { Fragment, type ReactNode } from 'react'
import {
  ArrowRight,
  Database,
  FloppyDisk,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
  WarningCircle,
  CheckCircle,
  Info,
  Heart,
} from '@phosphor-icons/react'
import {
  Button,
  type ButtonVariant,
  type ButtonSize,
  Card,
  Badge,
  type BadgeVariant,
  type BadgeType,
  type BadgeSize,
  Icon,
  type IconSize,
  IconButton,
  Indicator,
  type IndicatorVariant,
  type IndicatorSize,
  KpiTile,
  ProgressBar,
  SpaceTile,
  DocumentTile,
  Label,
  InputItem,
  TextField,
} from '../ui'

/** Stable timestamp for demo tiles (module-level to satisfy react-hooks/purity). */
const DEMO_NOW = Date.now()

/* ────────────────────────────────────────────────────── *
 *  Section wrapper — groups related examples with a
 *  heading and optional description.
 * ────────────────────────────────────────────────────── */

function Section({ title, description, children }: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Layout helpers — consistent display across all sections
 * ────────────────────────────────────────────────────── */

/** Matrix display for components with two variant axes (e.g. variant × size). */
function VariantTable({ columns, rows }: {
  columns: string[]
  rows: { label: string; cells: ReactNode[] }[]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-base-subtle-border-default">
            <th className="py-2 pr-4 text-left font-medium text-xs text-base-subtle-foreground-default">Variant</th>
            {columns.map((col) => (
              <th key={col} className="px-4 py-2 text-left font-medium text-xs text-base-subtle-foreground-default whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-base-subtle-border-default">
              <td className="py-3 pr-4 font-mono text-xs text-base-subtle-foreground-default">{row.label}</td>
              {row.cells.map((cell, i) => (
                <td key={i} className="px-4 py-3">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Single labelled example row for components without a variant matrix. */
function ExampleRow({ label, children }: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-6 border-b border-base-subtle-border-default py-3 last:border-b-0">
      <div className="w-48 shrink-0 pt-1 font-mono text-xs text-base-subtle-foreground-default">{label}</div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Buttons
 * ────────────────────────────────────────────────────── */

const buttonVariants: ButtonVariant[] = [
  'primary-solid', 'primary-outline', 'primary-ghost',
  'base-solid', 'base-outline', 'base-ghost',
  'destructive-solid', 'destructive-outline', 'destructive-ghost',
]

const buttonSizes: ButtonSize[] = ['sm', 'md', 'lg']

function ButtonSection() {
  return (
    <Section
      title="Button"
      description="9 variants (3 roles × 3 styles) × 3 sizes. Hover to see state transitions."
    >
      <VariantTable
        columns={[...buttonSizes, 'Disabled', 'Icon + text', 'Icon only']}
        rows={buttonVariants.map((variant) => ({
          label: variant,
          cells: [
            ...buttonSizes.map((size) => (
              <Button key={size} variant={variant} size={size}>Label</Button>
            )),
            <Button key="dis" variant={variant} isDisabled>Disabled</Button>,
            <Button key="it" variant={variant} iconLeft={FloppyDisk}>Save</Button>,
            <Button
              key="io"
              variant={variant}
              iconLeft={variant.startsWith('destructive') ? Trash : PencilSimple}
              aria-label={variant.startsWith('destructive') ? 'Delete' : 'Edit'}
            />,
          ],
        }))}
      />

      {/* Icon placement combinations */}
      <div className="flex flex-wrap items-center gap-3">
        <Button iconLeft={Plus}>New document</Button>
        <Button iconRight={ArrowRight} variant="base-outline">Continue</Button>
        <Button iconLeft={MagnifyingGlass} iconRight={ArrowRight} variant="base-ghost">Search</Button>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  IconButton (tiny-button)
 * ────────────────────────────────────────────────────── */

function IconButtonSection() {
  return (
    <Section
      title="Tiny Button"
      description="Figma .tiny-button — 24 px ghost button for embedding inside Label, TextField, SearchField. Icon-only or with text."
    >
      <div>
        {/* Icon-only mode (Text=false) */}
        <ExampleRow label="icon-only (default)">
          <div className="flex items-center gap-4">
            <IconButton icon={Info} aria-label="Info" />
            <IconButton icon={MagnifyingGlass} aria-label="Search" />
            <IconButton icon={PencilSimple} aria-label="Edit" />
            <IconButton icon={Trash} aria-label="Delete" />
          </div>
        </ExampleRow>
        <ExampleRow label="icon-only (disabled)">
          <IconButton icon={Heart} aria-label="Favorite" isDisabled />
        </ExampleRow>

        {/* With text mode (Text=true) */}
        <ExampleRow label="leading icon + text">
          <IconButton icon={Plus} aria-label="Add">Add</IconButton>
        </ExampleRow>
        <ExampleRow label="leading + text + trailing">
          <IconButton icon={MagnifyingGlass} iconRight={ArrowRight} aria-label="Search">Search</IconButton>
        </ExampleRow>
        <ExampleRow label="text (disabled)">
          <IconButton icon={FloppyDisk} aria-label="Save" isDisabled>Save</IconButton>
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Cards
 * ────────────────────────────────────────────────────── */

function CardSection() {
  return (
    <Section
      title="Card"
      description="Container with border, shadow, rounded-xl. Two padding sizes."
    >
      <div>
        <ExampleRow label='padding="md" (default)'>
          <Card>
            <p className="text-sm font-medium text-slate-900">Default padding — p-5 (20 px)</p>
          </Card>
        </ExampleRow>
        <ExampleRow label='padding="sm"'>
          <Card padding="sm">
            <p className="text-sm font-medium text-slate-900">Small padding — p-4 (16 px)</p>
          </Card>
        </ExampleRow>
        <ExampleRow label='as="article"'>
          <Card as="article">
            <p className="text-sm font-medium text-slate-900">
              Rendered as <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs">&lt;article&gt;</code>
            </p>
          </Card>
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Badge
 * ────────────────────────────────────────────────────── */

const badgeVariants: BadgeVariant[] = ['base', 'primary', 'success', 'warning', 'error', 'info']
const badgeTypes: BadgeType[] = ['solid', 'outline']
const badgeSizes: BadgeSize[] = ['sm', 'xs']

/** Map badge variant → matching indicator variant (base/primary default to success) */
const badgeIndicator: Record<BadgeVariant, IndicatorVariant> = {
  base: 'success',
  primary: 'success',
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
}

function BadgeSection() {
  return (
    <Section
      title="Badge"
      description="Pill-shaped chip with indicator dot and optional icon. 6 roles × 2 types × 2 sizes."
    >
      <VariantTable
        columns={[...badgeSizes, 'Icon + indicator', 'Icon only', 'Text only']}
        rows={badgeVariants.flatMap((variant) =>
          badgeTypes.map((type) => ({
            label: `${variant}-${type}`,
            cells: [
              ...badgeSizes.map((size) => (
                <Badge key={size} variant={variant} type={type} size={size} indicator={badgeIndicator[variant]}>
                  Badge
                </Badge>
              )),
              <Badge key="ii" variant={variant} type={type} indicator={badgeIndicator[variant]} icon={CheckCircle}>
                Synced
              </Badge>,
              <Badge key="io" variant={variant} type={type} icon={Heart}>Label</Badge>,
              <Badge key="to" variant={variant} type={type}>Label</Badge>,
            ],
          }))
        )}
      />

      {/* Composition examples */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="primary" indicator="success" icon={CheckCircle}>Synced</Badge>
        <Badge variant="warning" type="outline" indicator="warning" icon={WarningCircle}>Missing metadata</Badge>
        <Badge variant="error" indicator="error" icon={Info} size="xs">Error</Badge>
        <Badge variant="success" type="outline" indicator="success" size="xs">Healthy</Badge>
        <Badge variant="base" indicator="info">Indicator only</Badge>
        <Badge variant="info" type="outline" icon={Heart}>Icon only</Badge>
        <Badge variant="info">Text only</Badge>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Icon
 * ────────────────────────────────────────────────────── */

const iconSizes: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl']

function IconSection() {
  return (
    <Section
      title="Icon"
      description="Phosphor wrapper with 5 size presets. xl uses bold weight."
    >
      <div>
        {iconSizes.map((s) => (
          <ExampleRow key={s} label={`size="${s}"`}>
            <Icon icon={Heart} size={s} />
          </ExampleRow>
        ))}
        <ExampleRow label="Colored (lg)">
          <div className="flex items-center gap-4">
            <Icon icon={CheckCircle} size="lg" className="text-green-600" />
            <Icon icon={WarningCircle} size="lg" className="text-amber-600" />
            <Icon icon={Info} size="lg" className="text-teal-600" />
          </div>
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Indicator
 * ────────────────────────────────────────────────────── */

const indicatorVariants: IndicatorVariant[] = ['success', 'warning', 'error', 'info']
const indicatorSizes: IndicatorSize[] = ['xs', 'sm']

function IndicatorSection() {
  return (
    <Section
      title="Indicator"
      description="Status dot from Figma .indicator component. 4 variants × 2 sizes. White ring for background separation."
    >
      <VariantTable
        columns={indicatorSizes.map(String)}
        rows={indicatorVariants.map((variant) => ({
          label: variant,
          cells: indicatorSizes.map((size) => (
            <Indicator key={size} variant={variant} size={size} />
          )),
        }))}
      />

      {/* Composition: dot + label */}
      <div className="flex flex-wrap items-center gap-6">
        {indicatorVariants.map((variant) => (
          <span key={variant} className="flex items-center gap-1.5 text-sm">
            <Indicator variant={variant} size="xs" />
            <span className="capitalize text-slate-700">{variant}</span>
          </span>
        ))}
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Label
 * ────────────────────────────────────────────────────── */

function LabelSection() {
  return (
    <Section
      title="Label"
      description="Form label with required/optional indicator, info tooltip, and helper text."
    >
      <div className="max-w-lg">
        <ExampleRow label="required + helper + info">
          <Label
            helperText="This field is mandatory."
            infoTip="We need your full legal name as it appears on official documents."
          >
            Full Name
          </Label>
        </ExampleRow>
        <ExampleRow label="optional + helper">
          <Label required={false} helperText="Any additional notes for the team.">
            Notes
          </Label>
        </ExampleRow>
        <ExampleRow label="required + info (no helper)">
          <Label infoTip="Must be a valid email address.">Email</Label>
        </ExampleRow>
        <ExampleRow label="optional (minimal)">
          <Label required={false}>Middle Name</Label>
        </ExampleRow>
        <ExampleRow label="with input composition">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="demo-input"
              helperText="Enter your preferred display name."
              infoTip="This will be shown publicly."
            >
              Display Name
            </Label>
            <input
              id="demo-input"
              type="text"
              placeholder="e.g. johndoe"
              className="rounded-md border border-base-subtle-border-default bg-white px-3 py-2 text-sm text-base-foreground-default outline-focus placeholder:text-base-subtle-foreground-disabled focus:border-focus focus:outline-2 focus:outline-offset-0"
            />
          </div>
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  InputItem
 * ────────────────────────────────────────────────────── */

function InputItemSection() {
  return (
    <Section
      title="InputItem"
      description="Raw styled input (.input-item). 40px height, prefix/suffix support, error state. Use inside TextField for full composition."
    >
      <div className="max-w-lg">
        <ExampleRow label="default">
          <InputItem placeholder="Default" />
        </ExampleRow>
        <ExampleRow label='prefix="https://"'>
          <InputItem placeholder="With prefix" prefix="https://" />
        </ExampleRow>
        <ExampleRow label='suffix=".com"'>
          <InputItem placeholder="With suffix" suffix=".com" />
        </ExampleRow>
        <ExampleRow label="prefix + suffix">
          <InputItem prefix="$" placeholder="0.00" suffix="USD" />
        </ExampleRow>
        <ExampleRow label="error">
          <InputItem placeholder="Error state" error />
        </ExampleRow>
        <ExampleRow label="disabled">
          <InputItem placeholder="Disabled" disabled />
        </ExampleRow>
        <ExampleRow label="filled value">
          <InputItem defaultValue="Filled value" />
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  TextField
 * ────────────────────────────────────────────────────── */

function TextFieldSection() {
  return (
    <Section
      title="TextField"
      description="Composed field: Label + InputItem + error text. Full form field with validation."
    >
      <div className="max-w-lg">
        <ExampleRow label="required + helper + info">
          <TextField
            label="Full Name"
            placeholder="Enter your name"
            helperText="As it appears on official documents."
            infoTip="We need your legal name for verification."
          />
        </ExampleRow>
        <ExampleRow label="optional + prefix">
          <TextField
            label="Website"
            placeholder="example.com"
            prefix="https://"
            required={false}
            helperText="Your personal or company website."
          />
        </ExampleRow>
        <ExampleRow label="error state">
          <TextField
            label="Email"
            type="email"
            placeholder="you@example.com"
            errorText="Please enter a valid email address."
          />
        </ExampleRow>
        <ExampleRow label="prefix + suffix">
          <TextField
            label="Price"
            prefix="$"
            suffix="USD"
            placeholder="0.00"
            required={false}
          />
        </ExampleRow>
        <ExampleRow label="disabled">
          <TextField
            label="Username"
            placeholder="Choose a username"
            disabled
            helperText="Contact support to change your username."
          />
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  KpiTile
 * ────────────────────────────────────────────────────── */

function KpiTileSection() {
  const now = DEMO_NOW
  return (
    <Section
      title="KpiTile"
      description="Dashboard tile with big centered KPI value, optional badge/icon, and relative-time footer."
    >
      <div>
        <ExampleRow label="default (number + timestamp)">
          <div className="flex gap-4">
            <KpiTile className="w-[300px]" title="Documents" value={12847} updatedAt={now - 3 * 60_000} />
            <KpiTile className="w-[300px]" title="Indexed Chunks" value={11903} updatedAt={now - 45 * 60_000} />
          </div>
        </ExampleRow>
        <ExampleRow label="loading">
          <KpiTile className="w-[300px]" title="Loading" value={null} loading updatedAt={now} />
        </ExampleRow>
        <ExampleRow label="with badge">
          <KpiTile
            className="w-[300px]"
            title="With Badge"
            value={99}
            badge={{ label: 'Healthy', indicator: 'success' }}
            updatedAt={now - 5 * 60_000}
          />
        </ExampleRow>
        <ExampleRow label="with icon">
          <KpiTile className="w-[300px]" title="With Icon" value="OK" icon={CheckCircle} updatedAt={now - 30 * 3600_000} />
        </ExampleRow>
        <ExampleRow label="null value / no timestamp">
          <div className="flex gap-4">
            <KpiTile className="w-[300px]" title="Null Value" value={null} />
            <KpiTile className="w-[300px]" title="No Timestamp" value={42} />
          </div>
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  SpaceTile
 * ────────────────────────────────────────────────────── */

function SpaceTileSection() {
  return (
    <Section
      title="SpaceTile"
      description="Per-space sync tile with progress bar and action button in a grey footer."
    >
      <div>
        <ExampleRow label="partially synced">
          <SpaceTile
            className="w-[300px]"
            title="Work Projects"
            subtitle="work-projects"
            icon={Database}
            badge={{ label: 'Syncing', indicator: 'warning' }}
            indexed={148}
            total={312}
            onOpenSpace={() => undefined}
          />
        </ExampleRow>
        <ExampleRow label="fully synced">
          <SpaceTile
            className="w-[300px]"
            title="Personal Notes"
            subtitle="personal-notes"
            icon={Database}
            badge={{ label: 'Synced', indicator: 'success' }}
            indexed={42}
            total={42}
            onOpenSpace={() => undefined}
          />
        </ExampleRow>
        <ExampleRow label="empty space (no documents)">
          <SpaceTile
            className="w-[300px]"
            title="Archive"
            subtitle="archive"
            icon={Database}
            indexed={0}
            total={0}
          />
        </ExampleRow>
        <ExampleRow label="without subtitle / without action">
          <SpaceTile
            className="w-[300px]"
            title="Minimal"
            indexed={7}
            total={10}
          />
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  ProgressBar
 * ────────────────────────────────────────────────────── */

function ProgressBarSection() {
  return (
    <Section
      title="ProgressBar"
      description="Reusable progress indicator with label, value fraction, and percentage. Teal when partial, green when complete."
    >
      <div className="max-w-sm">
        <ExampleRow label="0% (empty)">
          <ProgressBar label="Processed" value={0} total={2} />
        </ExampleRow>
        <ExampleRow label="50% (partial)">
          <ProgressBar label="Processed" value={1} total={2} />
        </ExampleRow>
        <ExampleRow label="100% (complete)">
          <ProgressBar label="Processed" value={2} total={2} />
        </ExampleRow>
        <ExampleRow label="large numbers">
          <ProgressBar label="Indexed" value={8472} total={12000} />
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  DocumentTile
 * ────────────────────────────────────────────────────── */

function DocumentTileSection() {
  return (
    <Section
      title="DocumentTile"
      description="Header-only card for document entries. Primary badge shows the space slug."
    >
      <div>
        <ExampleRow label="with space badge">
          <DocumentTile
            title="Invoice Q4-2025.pdf"
            documentId={1234}
            spaceName="finance"
          />
        </ExampleRow>
        <ExampleRow label="without space">
          <DocumentTile
            title="Unassigned Document"
            documentId={5678}
          />
        </ExampleRow>
        <ExampleRow label="minimal (title only)">
          <DocumentTile title="Draft notes" />
        </ExampleRow>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Color Roles Overview
 * ────────────────────────────────────────────────────── */

const roles = ['base', 'primary', 'success', 'warning', 'error', 'info'] as const

const paletteLabels: Record<typeof roles[number], string> = {
  base: 'slate / gray',
  primary: 'blue',
  success: 'green',
  warning: 'amber',
  error: 'red',
  info: 'teal',
}

/** Key tokens that capture the essence of each role. */
const overviewTokens = [
  { label: 'Prominent bg', prop: 'p-background', state: 'default' },
  { label: 'Prominent fg', prop: 'p-foreground', state: 'default', isFg: true },
  { label: 'Foreground', prop: 'foreground', state: 'default', isFg: true },
  { label: 'Border', prop: 'border', state: 'default', isBorder: true },
  { label: 'Subtle bg', prop: 'subtle-background', state: 'default' },
  { label: 'Subtle fg', prop: 'subtle-foreground', state: 'default', isFg: true },
  { label: 'Background hover', prop: 'background', state: 'hover' },
  { label: 'Background active', prop: 'background', state: 'active' },
] as const

function ColorRolesSection() {
  return (
    <Section
      title="Color Roles"
      description="At-a-glance comparison of all 6 semantic roles with key tokens."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-4 text-left font-medium text-slate-500">Role</th>
              {overviewTokens.map((t) => (
                <th key={t.label} className="px-1 py-2 text-center font-medium text-slate-500 whitespace-nowrap">
                  {t.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role} className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <span className="font-semibold text-slate-800">{role}</span>
                  <br />
                  <span className="text-slate-400">{paletteLabels[role]}</span>
                </td>
                {overviewTokens.map((t) => {
                  const token = `--color-${role}-${t.prop}-${t.state}`
                  return (
                    <td key={t.label} className="px-1 py-2">
                      {'isFg' in t && t.isFg ? (
                        <div
                          className="mx-auto flex h-10 w-14 items-center justify-center rounded border border-slate-200 text-sm font-bold"
                          style={{ color: `var(${token})` }}
                          title={token}
                        >
                          Aa
                        </div>
                      ) : 'isBorder' in t && t.isBorder ? (
                        <div
                          className="mx-auto h-10 w-14 rounded border-2"
                          style={{ borderColor: `var(${token})` }}
                          title={token}
                        />
                      ) : (
                        <div
                          className="mx-auto h-10 w-14 rounded border border-slate-200"
                          style={{ backgroundColor: `var(${token})` }}
                          title={token}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Semantic Color Tokens (full grid)
 * ────────────────────────────────────────────────────── */
const properties = ['background', 'foreground', 'subtle-background', 'subtle-foreground', 'p-background', 'p-foreground', 'border', 'subtle-border'] as const
const states = ['default', 'hover', 'active', 'disabled'] as const

function TokenSwatch({ role, property, state }: {
  role: string
  property: string
  state: string
}) {
  const tokenName = `--color-${role}-${property}-${state}`
  const isForeground = property.includes('foreground')

  return (
    <div
      className="h-8 w-full rounded border border-slate-200"
      style={
        isForeground
          ? { backgroundColor: 'white', color: `var(${tokenName})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }
          : { backgroundColor: `var(${tokenName})` }
      }
      title={tokenName}
    >
      {isForeground && 'Aa'}
    </div>
  )
}

function TokenSection() {
  return (
    <Section
      title="Semantic Color Tokens"
      description="6 roles × 8 properties × 4 states = 192 tokens. Hover swatches for CSS variable names."
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 text-left font-medium text-slate-500">Token</th>
              {states.map((s) => (
                <th key={s} className="w-20 px-1 py-2 text-center font-medium text-slate-500">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <Fragment key={role}>
                <tr>
                  <td
                    colSpan={5}
                    className="pt-4 pb-1 font-semibold text-slate-700"
                  >
                    {role}
                  </td>
                </tr>
                {properties.map((prop) => (
                  <tr key={`${role}-${prop}`} className="border-b border-slate-50">
                    <td className="py-1 pr-3 font-mono text-slate-500">
                      {prop}
                    </td>
                    {states.map((state) => (
                      <td key={state} className="px-1 py-1">
                        <TokenSwatch role={role} property={prop} state={state} />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

/* ────────────────────────────────────────────────────── *
 *  Page
 * ────────────────────────────────────────────────────── */

export function ComponentsDemo() {
  return (
    <div className="space-y-12 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Component Library</h1>
        <p className="mt-1 text-sm text-slate-500">
          Interactive showcase of all shared UI primitives and design tokens.
        </p>
      </div>

      <ButtonSection />
      <IconButtonSection />
      <CardSection />
      <BadgeSection />
      <IconSection />
      <IndicatorSection />
      <LabelSection />
      <InputItemSection />
      <TextFieldSection />
      <KpiTileSection />
      <ProgressBarSection />
      <SpaceTileSection />
      <DocumentTileSection />
      <ColorRolesSection />
      <TokenSection />
    </div>
  )
}
