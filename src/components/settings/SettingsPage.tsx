import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FileArchive, Database, Brain, FloppyDisk, Eye, EyeSlash,
  Plugs, CircleNotch, CheckCircle, XCircle, Play, Stop, ArrowsClockwise,
  Wrench, WarningCircle,
} from '@phosphor-icons/react'
import { useSettings, useUpdateSettings } from '../../hooks/useSettings'
import { useHealth } from '../../hooks/useHealth'
import { Tile } from '../ui'
import { Button } from '../ui'
import { api } from '../../api/client'
import type { Settings, ConnectionTestResult, RagProcessInfo, LocalToolsInfo, ServiceStatus } from '../../types/api'
import type { ComponentType } from 'react'
import type { IconProps as PhosphorIconProps } from '@phosphor-icons/react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectOption {
  value: string
  label: string
}

interface FieldDef {
  key: keyof Settings
  label: string
  sensitive?: boolean
  placeholder?: string
  options?: SelectOption[]
}

interface ServiceSection {
  title: string
  icon: ComponentType<PhosphorIconProps>
  fields: FieldDef[]
  testService?: string
}

// ---------------------------------------------------------------------------
// Config data
// ---------------------------------------------------------------------------

const llmProviders: SelectOption[] = [
  { value: 'lmstudio', label: 'LM Studio' },
]

const serviceSections: ServiceSection[] = [
  {
    title: 'Paperless-NGX',
    icon: FileArchive,
    testService: 'paperless',
    fields: [
      { key: 'paperlessUrl', label: 'API URL', placeholder: 'http://your-nas:8777' },
      { key: 'paperlessToken', label: 'API Token', sensitive: true, placeholder: 'Your Paperless API token' },
    ],
  },
  {
    title: 'LLM Provider',
    icon: Brain,
    testService: 'llm',
    fields: [
      { key: 'llmProvider', label: 'Provider', options: llmProviders },
      { key: 'llmApiUrl', label: 'API URL', placeholder: 'http://localhost:1234' },
      { key: 'llmApiKey', label: 'API Key', sensitive: true, placeholder: 'API key (optional for LM Studio)' },
    ],
  },
  {
    title: 'Qdrant',
    icon: Database,
    testService: 'qdrant',
    fields: [
      { key: 'qdrantUrl', label: 'API URL', placeholder: 'http://your-nas:6333' },
    ],
  },
]

const fieldClassName =
  'flex-1 rounded-md border border-base-subtle-border-default bg-white px-3 py-2 text-sm text-base-foreground-default outline-focus placeholder:text-base-subtle-foreground-disabled focus:border-focus focus:outline-2 focus:outline-offset-0'


// ---------------------------------------------------------------------------
// Shared field components
// ---------------------------------------------------------------------------

function SettingsField({
  label,
  value,
  sensitive,
  placeholder,
  options,
  onChange,
}: {
  label: string
  value: string
  sensitive?: boolean
  placeholder?: string
  options?: SelectOption[]
  onChange: (v: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleVisibility = useCallback(() => {
    setVisible((v) => {
      const next = !v
      if (next) {
        requestAnimationFrame(() => {
          const el = inputRef.current
          if (el) {
            el.scrollLeft = 0
            el.setSelectionRange(0, 0)
          }
        })
      }
      return next
    })
  }, [])

  if (options) {
    return (
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-base-foreground-default">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClassName}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    )
  }

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-base-foreground-default">{label}</span>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type={sensitive && !visible ? 'password' : 'text'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClassName}
        />
        {sensitive && (
          <Button
            variant="base-outline"
            size="sm"
            iconLeft={visible ? EyeSlash : Eye}
            onPress={toggleVisibility}
            aria-label={visible ? 'Hide value' : 'Show value'}
          />
        )}
      </div>
    </label>
  )
}

function TestConnectionButton({ service }: { service: string }) {
  const [state, setState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<ConnectionTestResult | null>(null)

  async function handleTest() {
    setState('testing')
    setResult(null)
    try {
      const r = await api.testConnection(service)
      setResult(r)
      setState(r.status === 'healthy' ? 'success' : 'error')
    } catch {
      setResult({ status: 'down', latencyMs: 0, error: 'Request failed' })
      setState('error')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="base-outline"
        size="sm"
        iconLeft={state === 'testing' ? undefined : Plugs}
        isDisabled={state === 'testing'}
        onPress={handleTest}
      >
        {state === 'testing' && <CircleNotch size={20} className="shrink-0 animate-spin" />}
        {state === 'testing' ? 'Testing…' : 'Test Connection'}
      </Button>

      {state === 'success' && result && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-foreground-default">
          <CheckCircle size={14} weight="fill" />
          Connected ({result.latencyMs}ms)
        </span>
      )}

      {state === 'error' && result && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-error-foreground-default">
          <XCircle size={14} weight="fill" />
          {result.error || 'Connection failed'}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-card save component
// ---------------------------------------------------------------------------

interface ServiceCardProps {
  section: ServiceSection
  serverData: Settings
}

function ServiceCard({ section, serverData }: ServiceCardProps) {
  const updateSettings = useUpdateSettings()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const field of section.fields) {
      init[field.key] = serverData[field.key]
    }
    return init
  })
  const [saved, setSaved] = useState(false)
  const touchedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Sync from server data (e.g. after another card saves + query invalidation)
  // but skip if the user has been editing this card
  useEffect(() => {
    if (touchedRef.current) return
    const next: Record<string, string> = {}
    for (const field of section.fields) {
      next[field.key] = serverData[field.key]
    }
    setValues(next)
  }, [serverData, section.fields])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  function handleChange(key: keyof Settings, value: string) {
    touchedRef.current = true
    setSaved(false)
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const isDirty = section.fields.some((f) => values[f.key] !== serverData[f.key])

  function handleSave() {
    const updates: Partial<Settings> = {}
    for (const field of section.fields) {
      if (values[field.key] !== serverData[field.key]) {
        updates[field.key as keyof Settings] = values[field.key]
      }
    }
    if (Object.keys(updates).length === 0) return

    updateSettings.mutate(updates, {
      onSuccess: () => {
        touchedRef.current = false
        setSaved(true)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setSaved(false), 2000)
      },
    })
  }

  return (
    <Tile title={section.title} icon={section.icon}>
      <div className="flex flex-col gap-4">
        {section.fields.map(({ key, label, sensitive, placeholder, options }) => (
          <SettingsField
            key={key}
            label={label}
            value={values[key] ?? ''}
            sensitive={sensitive}
            placeholder={placeholder}
            options={options}
            onChange={(v) => handleChange(key, v)}
          />
        ))}

        {/* Action row: Test left, Save right */}
        <div className="flex items-center justify-between pt-1">
          {section.testService ? (
            <TestConnectionButton service={section.testService} />
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-success-foreground-default">
                <CheckCircle size={14} weight="fill" />
                Saved
              </span>
            )}

            {updateSettings.error && (
              <span className="text-xs text-error-foreground-default">
                {updateSettings.error.message}
              </span>
            )}

            <Button
              variant="primary-solid"
              size="sm"
              iconLeft={FloppyDisk}
              isDisabled={!isDirty || updateSettings.isPending}
              onPress={handleSave}
            >
              {updateSettings.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </Tile>
  )
}

// ---------------------------------------------------------------------------
// Local Tools section
// ---------------------------------------------------------------------------

function ToolPathStatus({ exists, path }: { exists: boolean; path: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${exists ? 'text-success-foreground-default' : 'text-error-foreground-default'}`}>
      {exists ? <CheckCircle size={14} weight="fill" /> : <WarningCircle size={14} weight="fill" />}
      <code className="font-mono text-[11px]">{path}</code>
    </span>
  )
}

function DependencyStatus({ label, status }: { label: string; status: ServiceStatus | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-base-subtle-foreground-disabled">
        <CircleNotch size={12} className="animate-spin" />
        {label}
      </span>
    )
  }

  const healthy = status === 'healthy'

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${healthy ? 'text-success-foreground-default' : 'text-error-foreground-default'}`}>
      {healthy ? <CheckCircle size={12} weight="fill" /> : <XCircle size={12} weight="fill" />}
      {label}
    </span>
  )
}

function LocalToolsSection() {
  const [info, setInfo] = useState<LocalToolsInfo | null>(null)
  const [ragInfo, setRagInfo] = useState<RagProcessInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const { data: health } = useHealth()

  const refresh = useCallback(async () => {
    try {
      const [tools, rag] = await Promise.all([
        api.localToolsInfo(),
        api.ragProcessStatus(),
      ])
      setInfo(tools)
      setRagInfo(rag)
    } catch {
      // Backend unreachable
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [refresh])

  async function handleRagAction(action: 'start' | 'stop' | 'restart') {
    setBusy(true)
    try {
      await api.ragProcessAction(action)
      setTimeout(refresh, 800)
    } finally {
      setBusy(false)
    }
  }

  const ragStatus = ragInfo?.status ?? 'stopped'

  const qdrantStatus = health?.services.qdrant.status
  const llmStatus = health?.services.lmStudio.status
  const depsReady = qdrantStatus === 'healthy' && llmStatus === 'healthy'

  const statusColors: Record<string, string> = {
    running: 'text-success-foreground-default',
    starting: 'text-warning-foreground-default',
    stopped: 'text-base-subtle-foreground-disabled',
  }

  const statusDotColors: Record<string, string> = {
    running: 'bg-success-foreground-default',
    starting: 'bg-warning-foreground-default animate-pulse',
    stopped: 'bg-base-subtle-foreground-disabled',
  }

  const statusLabels: Record<string, string> = {
    running: 'Running',
    starting: 'Starting…',
    stopped: 'Stopped',
  }

  return (
    <Tile title="Local Tools" icon={Wrench}>
      <div className="flex flex-col gap-5">
        {/* RAG Engine */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-base-foreground-default">RAG Engine</span>
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColors[ragStatus]}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${statusDotColors[ragStatus]}`} />
              {statusLabels[ragStatus]}
            </span>
          </div>

          {info && <ToolPathStatus exists={info.ragApi.exists} path={info.ragApi.path} />}

          {/* Dependency checks */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-base-subtle-foreground-default">Dependencies</span>
            <div className="flex items-center gap-3">
              <DependencyStatus label="Qdrant" status={qdrantStatus} />
              <DependencyStatus label="LLM Provider" status={llmStatus} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ragStatus === 'stopped' && (
              <Button
                variant="base-outline"
                size="sm"
                iconLeft={busy ? undefined : Play}
                isDisabled={busy || !depsReady}
                onPress={() => handleRagAction('start')}
                aria-label={!depsReady ? 'Qdrant and LLM Provider must be running first' : undefined}
              >
                {busy && <CircleNotch size={20} className="shrink-0 animate-spin" />}
                Start
              </Button>
            )}
            {ragStatus !== 'stopped' && (
              <Button
                variant="base-outline"
                size="sm"
                iconLeft={busy ? undefined : Stop}
                isDisabled={busy}
                onPress={() => handleRagAction('stop')}
              >
                {busy && <CircleNotch size={20} className="shrink-0 animate-spin" />}
                Stop
              </Button>
            )}
            <Button
              variant="base-outline"
              size="sm"
              iconLeft={ArrowsClockwise}
              isDisabled={busy || ragStatus === 'stopped'}
              onPress={() => handleRagAction('restart')}
            >
              Restart
            </Button>

            {ragStatus === 'running' && <TestConnectionButton service="rag" />}
          </div>
        </div>

        {/* Divider */}
        <hr className="border-base-subtle-border-default" />

        {/* Meta Enrichment */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-base-foreground-default">Meta Enrichment</span>
          {info && <ToolPathStatus exists={info.meta.exists} path={info.meta.path} />}
          <p className="text-xs text-base-subtle-foreground-disabled">
            Runs on demand from the Meta page — no background process.
          </p>
        </div>
      </div>
    </Tile>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const { data, isLoading, error } = useSettings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-base-subtle-foreground-default">
        Loading settings…
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-subtle-foreground-default">
        Unable to load settings: {error.message}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {serviceSections.map((section) => (
        <ServiceCard key={section.title} section={section} serverData={data} />
      ))}
      <LocalToolsSection />
    </div>
  )
}
