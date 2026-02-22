import { useState } from 'react'
import { Cube, Plus, CaretDown } from '@phosphor-icons/react'
import { useCreateSpace, useUpdateSpace } from '../../hooks/useSyncStatus'
import { Button, Tile, Card, TextField } from '../ui'
import type { SpaceInfo } from '../../types/api'

type FormMode = { kind: 'create' } | { kind: 'edit'; space: SpaceInfo }

interface SpacesTileProps {
  /** When true, hides the bottom "Add Space" button (parent renders it elsewhere) */
  hideAddButton?: boolean
  /** When true, auto-opens the create form */
  formOpen?: boolean
  /** Called when the form is closed */
  onFormClose?: () => void
  /** 'tile' wraps in Tile component (default), 'bare' renders form content only (for Dialog) */
  renderMode?: 'tile' | 'bare'
}

export function SpacesTile({ hideAddButton, formOpen, onFormClose, renderMode = 'tile' }: SpacesTileProps = {}) {
  const createSpace = useCreateSpace()
  const updateSpace = useUpdateSpace()

  const [form, setForm] = useState<FormMode | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Form fields
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [chunkTokens, setChunkTokens] = useState('')
  const [chunkOverlap, setChunkOverlap] = useState('')
  const [topK, setTopK] = useState('')
  const [scoreThreshold, setScoreThreshold] = useState('')

  const mutating = createSpace.isPending || updateSpace.isPending
  const error = createSpace.error || updateSpace.error

  function openCreate() {
    setSlug('')
    setName('')
    setChunkTokens('')
    setChunkOverlap('')
    setTopK('')
    setScoreThreshold('')
    setShowAdvanced(false)
    setForm({ kind: 'create' })
  }

  // Derive active form: internal state takes precedence, parent prop opens create form
  const activeForm = form ?? (formOpen ? { kind: 'create' as const } : null)
  const isEditing = activeForm?.kind === 'edit'

  function closeForm() {
    setForm(null)
    setSlug('')
    setName('')
    setChunkTokens('')
    setChunkOverlap('')
    setTopK('')
    setScoreThreshold('')
    setShowAdvanced(false)
    createSpace.reset()
    updateSpace.reset()
    onFormClose?.()
  }

  function handleSave() {
    const numOrUndef = (v: string) => {
      const n = Number(v)
      return v.trim() && !Number.isNaN(n) ? n : undefined
    }

    if (activeForm?.kind === 'create') {
      createSpace.mutate(
        {
          slug: slug.trim(),
          name: name.trim(),
          chunk_tokens: numOrUndef(chunkTokens),
          chunk_overlap: numOrUndef(chunkOverlap),
          top_k: numOrUndef(topK),
          score_threshold: numOrUndef(scoreThreshold),
        },
        { onSuccess: () => { setForm(null); onFormClose?.() } },
      )
    } else if (activeForm?.kind === 'edit') {
      updateSpace.mutate(
        {
          slug: activeForm.space.slug,
          name: name.trim() || undefined,
          chunk_tokens: numOrUndef(chunkTokens),
          chunk_overlap: numOrUndef(chunkOverlap),
          top_k: numOrUndef(topK),
          score_threshold: numOrUndef(scoreThreshold),
        },
        { onSuccess: () => { setForm(null); onFormClose?.() } },
      )
    }
  }

  const canSave = activeForm?.kind === 'create' ? slug.trim().length >= 2 && name.trim().length > 0 : name.trim().length > 0

  // ── Form fields (shared between tile and bare modes) ──
  const formFields = activeForm && (
    <div className="flex flex-col gap-3">
      {renderMode === 'tile' && (
        <h4 className="text-sm font-medium text-base-foreground-default">
          {isEditing ? `Edit "${activeForm.space.name}"` : 'New Space'}
        </h4>
      )}

      {!isEditing && (
        <TextField
          label="Slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
          placeholder="e.g. work-projects"
          helperText="Lowercase letters, numbers, hyphens. 2-30 chars."
        />
      )}

      <TextField
        label="Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Work Projects"
      />

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-xs text-base-subtle-foreground-default hover:text-base-foreground-default transition-colors cursor-pointer"
      >
        <CaretDown
          size={12}
          weight="bold"
          className={`transition-transform ${showAdvanced ? 'rotate-0' : '-rotate-90'}`}
        />
        Advanced parameters
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Chunk Tokens"
            required={false}
            type="number"
            value={chunkTokens}
            onChange={(e) => setChunkTokens(e.target.value)}
            placeholder={isEditing ? String(activeForm.space.params.chunk_tokens) : '800'}
          />
          <TextField
            label="Chunk Overlap"
            required={false}
            type="number"
            value={chunkOverlap}
            onChange={(e) => setChunkOverlap(e.target.value)}
            placeholder={isEditing ? String(activeForm.space.params.chunk_overlap) : '120'}
          />
          <TextField
            label="Top K"
            required={false}
            type="number"
            value={topK}
            onChange={(e) => setTopK(e.target.value)}
            placeholder={isEditing ? String(activeForm.space.params.top_k) : '6'}
          />
          <TextField
            label="Score Threshold"
            required={false}
            type="number"
            step="0.01"
            value={scoreThreshold}
            onChange={(e) => setScoreThreshold(e.target.value)}
            placeholder={isEditing ? String(activeForm.space.params.score_threshold) : '0.35'}
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="primary-solid"
          size="sm"
          onPress={handleSave}
          isDisabled={!canSave || mutating}
        >
          {mutating ? 'Saving…' : 'Save'}
        </Button>
        <Button
          variant="base-outline"
          size="sm"
          onPress={closeForm}
          isDisabled={mutating}
        >
          Cancel
        </Button>
      </div>
    </div>
  )

  // ── Bare mode: form content only (for use inside Dialog) ──
  if (renderMode === 'bare') {
    return (
      <div className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default">
            {error.message}
          </div>
        )}
        {formFields}
      </div>
    )
  }

  // ── Tile mode: wrapped in Tile component ──
  return (
    <Tile title="Spaces" icon={Cube}>
      <div className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default">
            {error.message}
          </div>
        )}

        {activeForm && (
          <Card padding="md">
            {formFields}
          </Card>
        )}

        {!activeForm && !hideAddButton && (
          <Button
            variant="base-outline"
            iconLeft={Plus}
            onPress={openCreate}
            isDisabled={mutating}
          >
            Add Space
          </Button>
        )}
      </div>
    </Tile>
  )
}
