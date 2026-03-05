import { useState, useRef, useCallback } from 'react'
import {
  Brain, Plus, Plugs, Trash, PencilSimple, Power,
  CircleNotch, CheckCircle, XCircle, Eye, EyeSlash,
} from '@phosphor-icons/react'
import { Tile, Button, Badge, Dialog, IconButton } from '../ui'
import { api } from '../../api/client'
import {
  useLlmSources,
  useCreateLlmSource,
  useUpdateLlmSource,
  useDeleteLlmSource,
  useActivateLlmSource,
} from '../../hooks/useLlmSources'
import type { LlmSource, LlmSourceCreateRequest, ConnectionTestResult } from '../../types/api'

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const fieldClassName =
  'flex-1 rounded-md border border-base-subtle-border-default bg-white px-3 py-2 text-sm text-base-foreground-default outline-focus placeholder:text-base-subtle-foreground-disabled focus:border-focus focus:outline-2 focus:outline-offset-0'

// ---------------------------------------------------------------------------
// Test Connection (per-source)
// ---------------------------------------------------------------------------

function TestButton({ sourceId }: { sourceId: string }) {
  const [state, setState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<ConnectionTestResult | null>(null)

  async function handleTest() {
    setState('testing')
    setResult(null)
    try {
      const r = await api.testLlmSource(sourceId)
      setResult(r)
      setState(r.status === 'healthy' ? 'success' : 'error')
    } catch {
      setResult({ status: 'down', latencyMs: 0, error: 'Request failed' })
      setState('error')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="base-outline"
        size="sm"
        iconLeft={state === 'testing' ? undefined : Plugs}
        isDisabled={state === 'testing'}
        onPress={handleTest}
      >
        {state === 'testing' && <CircleNotch size={16} className="shrink-0 animate-spin" />}
        {state === 'testing' ? 'Testing…' : 'Test'}
      </Button>

      {state === 'success' && result && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-success-foreground-default">
          <CheckCircle size={14} weight="fill" />
          {result.latencyMs}ms
        </span>
      )}
      {state === 'error' && result && (
        <span className="inline-flex max-w-[160px] items-center gap-1 truncate text-xs font-medium text-error-foreground-default">
          <XCircle size={14} weight="fill" className="shrink-0" />
          {result.error || 'Failed'}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Source Card
// ---------------------------------------------------------------------------

function SourceCard({
  source,
  onEdit,
}: {
  source: LlmSource
  onEdit: (s: LlmSource) => void
}) {
  const activate = useActivateLlmSource()
  const deleteMut = useDeleteLlmSource()

  return (
    <div className="flex flex-col gap-2.5 rounded-md border border-base-subtle-border-default bg-base-subtle-background-default p-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-base-foreground-default">{source.name}</span>
        {source.isActive && (
          <Badge variant="success" type="outline" size="xs">Active</Badge>
        )}
        <span className="ml-auto" />
        <IconButton
          icon={PencilSimple}
          variant="base"
          size="xs"
          aria-label="Edit source"
          onPress={() => onEdit(source)}
        />
        {!source.isActive && (
          <IconButton
            icon={Trash}
            variant="base"
            size="xs"
            aria-label="Delete source"
            isDisabled={deleteMut.isPending}
            onPress={() => deleteMut.mutate(source.id)}
          />
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-0.5 text-xs text-base-subtle-foreground-default">
        <span className="truncate font-mono text-[11px]">{source.baseUrl}</span>
        <span>Model: <span className="font-medium text-base-foreground-default">{source.model}</span></span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-0.5">
        <TestButton sourceId={source.id} />
        {!source.isActive && (
          <Button
            variant="base-outline"
            size="sm"
            iconLeft={Power}
            isDisabled={activate.isPending}
            onPress={() => activate.mutate(source.id)}
          >
            {activate.isPending ? 'Activating…' : 'Activate'}
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Add / Edit Dialog
// ---------------------------------------------------------------------------

function SourceFormDialog({
  isOpen,
  onOpenChange,
  source,
}: {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** If non-null, we're editing */
  source: LlmSource | null
}) {
  const create = useCreateLlmSource()
  const update = useUpdateLlmSource()

  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)
  const keyRef = useRef<HTMLInputElement>(null)

  const isEditing = !!source

  // Reset form whenever dialog opens
  const prevOpen = useRef(false)
  if (isOpen && !prevOpen.current) {
    // Just opened — seed values
    if (source) {
      // Editing: pre-fill (apiKey stays empty → keep existing)
      setName(source.name)
      setBaseUrl(source.baseUrl)
      setApiKey('')
      setModel(source.model)
    } else {
      setName('')
      setBaseUrl('')
      setApiKey('')
      setModel('')
    }
    setKeyVisible(false)
  }
  prevOpen.current = isOpen

  const isPending = create.isPending || update.isPending
  const canSubmit = name.trim() && baseUrl.trim() && model.trim() && !isPending

  function handleSubmit() {
    if (!canSubmit) return

    if (isEditing && source) {
      const data: Record<string, string> = { name, baseUrl, model }
      if (apiKey) data.apiKey = apiKey // only send if user typed a new key
      update.mutate(
        { id: source.id, data },
        { onSuccess: () => onOpenChange(false) },
      )
    } else {
      const body: LlmSourceCreateRequest = { name, baseUrl, apiKey, model }
      create.mutate(body, { onSuccess: () => onOpenChange(false) })
    }
  }

  const toggleKeyVisibility = useCallback(() => {
    setKeyVisible((v) => {
      const next = !v
      if (next) {
        requestAnimationFrame(() => {
          const el = keyRef.current
          if (el) {
            el.scrollLeft = 0
            el.setSelectionRange(0, 0)
          }
        })
      }
      return next
    })
  }, [])

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit LLM Source' : 'Add LLM Source'}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-base-foreground-default">Name</span>
          <input
            type="text"
            value={name}
            placeholder="e.g. T-Systems LLM Hub"
            onChange={(e) => setName(e.target.value)}
            className={fieldClassName}
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-base-foreground-default">Base URL</span>
          <input
            type="text"
            value={baseUrl}
            placeholder="https://llm.2.t-systems.net"
            onChange={(e) => setBaseUrl(e.target.value)}
            className={fieldClassName}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-base-foreground-default">API Key</span>
          <div className="flex items-center gap-2">
            <input
              ref={keyRef}
              type={keyVisible ? 'text' : 'password'}
              value={apiKey}
              placeholder={isEditing ? 'Leave blank to keep current' : 'API key (optional for LM Studio)'}
              onChange={(e) => setApiKey(e.target.value)}
              className={fieldClassName}
            />
            <Button
              variant="base-outline"
              size="sm"
              iconLeft={keyVisible ? EyeSlash : Eye}
              onPress={toggleKeyVisibility}
              aria-label={keyVisible ? 'Hide API key' : 'Show API key'}
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-base-foreground-default">Model</span>
          <input
            type="text"
            value={model}
            placeholder="e.g. gpt-4o-mini"
            onChange={(e) => setModel(e.target.value)}
            className={fieldClassName}
          />
        </label>

        {(create.error || update.error) && (
          <p className="text-xs text-error-foreground-default">
            {(create.error || update.error)?.message}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="base-outline" size="sm" onPress={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary-solid"
            size="sm"
            isDisabled={!canSubmit}
            type="submit"
          >
            {isPending ? 'Saving…' : isEditing ? 'Save' : 'Add Source'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main Section
// ---------------------------------------------------------------------------

export function LlmSourcesSection() {
  const { data: sources, isLoading } = useLlmSources()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSource, setEditingSource] = useState<LlmSource | null>(null)

  function handleAdd() {
    setEditingSource(null)
    setDialogOpen(true)
  }

  function handleEdit(source: LlmSource) {
    setEditingSource(source)
    setDialogOpen(true)
  }

  return (
    <Tile title="LLM Sources" icon={Brain}>
      <div className="flex flex-col gap-3">
        {isLoading && (
          <p className="text-xs text-base-subtle-foreground-disabled">Loading…</p>
        )}

        {!isLoading && sources?.length === 0 && (
          <p className="text-xs text-base-subtle-foreground-disabled">
            No LLM sources configured. Add one to get started.
          </p>
        )}

        {sources?.map((source) => (
          <SourceCard key={source.id} source={source} onEdit={handleEdit} />
        ))}

        <Button
          variant="base-outline"
          size="sm"
          iconLeft={Plus}
          onPress={handleAdd}
        >
          Add Source
        </Button>
      </div>

      <SourceFormDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        source={editingSource}
      />
    </Tile>
  )
}
