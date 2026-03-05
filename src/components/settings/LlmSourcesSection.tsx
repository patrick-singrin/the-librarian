import { useState, useRef, useCallback } from 'react'
import {
  Brain, Plus, Plugs, Trash, PencilSimple, Power,
  CircleNotch, CheckCircle, XCircle, Eye, EyeSlash,
  CaretDown, MagnifyingGlass,
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
import type { LlmSource, LlmSourceCreateRequest, LlmModel, ConnectionTestResult } from '../../types/api'

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

  // Model picker state
  const [models, setModels] = useState<LlmModel[]>([])
  const [modelsFetching, setModelsFetching] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [modelsOpen, setModelsOpen] = useState(false)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

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
    setModels([])
    setModelsError(null)
    setModelsOpen(false)
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

  const fetchAvailableModels = useCallback(async () => {
    if (!baseUrl.trim()) return
    setModelsFetching(true)
    setModelsError(null)
    try {
      const list = isEditing && source
        ? await api.fetchLlmModels(source.id)
        : await api.discoverLlmModels(baseUrl.trim(), apiKey)
      setModels(list)
      if (list.length > 0) {
        setModelsOpen(true)
      } else {
        setModelsError('No models returned')
      }
    } catch (e) {
      setModelsError((e as Error).message)
      setModels([])
    } finally {
      setModelsFetching(false)
    }
  }, [baseUrl, apiKey, isEditing, source])

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

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-base-foreground-default">Model</span>
          <div className="relative" ref={modelDropdownRef}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={model}
                  placeholder="e.g. gpt-4o-mini"
                  onChange={(e) => { setModel(e.target.value); setModelsOpen(false) }}
                  className={fieldClassName}
                />
                {models.length > 0 && (
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-base-subtle-foreground-default hover:text-base-foreground-default"
                    onClick={() => setModelsOpen((v) => !v)}
                    tabIndex={-1}
                  >
                    <CaretDown size={14} />
                  </button>
                )}
              </div>
              <Button
                variant="base-outline"
                size="sm"
                iconLeft={modelsFetching ? undefined : MagnifyingGlass}
                isDisabled={modelsFetching || !baseUrl.trim()}
                onPress={fetchAvailableModels}
              >
                {modelsFetching && <CircleNotch size={16} className="shrink-0 animate-spin" />}
                {modelsFetching ? 'Loading…' : 'Fetch'}
              </Button>
            </div>

            {modelsOpen && models.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-base-subtle-border-default bg-white shadow-lg">
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`w-full px-3 py-1.5 text-left text-sm hover:bg-base-subtle-background-default ${
                      m.id === model ? 'bg-base-subtle-background-default font-medium text-base-foreground-default' : 'text-base-subtle-foreground-default'
                    }`}
                    onClick={() => { setModel(m.id); setModelsOpen(false) }}
                  >
                    {m.id}
                    {m.owned_by && (
                      <span className="ml-2 text-xs text-base-subtle-foreground-disabled">{m.owned_by}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {modelsError && (
              <p className="mt-1 text-xs text-error-foreground-default">{modelsError}</p>
            )}
          </div>
        </div>

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
