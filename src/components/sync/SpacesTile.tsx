import { useState } from 'react'
import { Cube, PencilSimple, Trash, Plus, CaretDown, Info } from '@phosphor-icons/react'
import { useSpaces, useCreateSpace, useUpdateSpace, useDeleteSpace } from '../../hooks/useSyncStatus'
import { Button, Tile, Card, IconButton, TextField } from '../ui'
import type { SpaceInfo } from '../../types/api'

type FormMode = { kind: 'create' } | { kind: 'edit'; space: SpaceInfo }

export function SpacesTile() {
  const spaces = useSpaces()
  const createSpace = useCreateSpace()
  const updateSpace = useUpdateSpace()
  const deleteSpace = useDeleteSpace()

  const [form, setForm] = useState<FormMode | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Form fields
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [chunkTokens, setChunkTokens] = useState('')
  const [chunkOverlap, setChunkOverlap] = useState('')
  const [topK, setTopK] = useState('')
  const [scoreThreshold, setScoreThreshold] = useState('')

  const spacesList = spaces.data ?? []
  const mutating = createSpace.isPending || updateSpace.isPending || deleteSpace.isPending
  const error = createSpace.error || updateSpace.error || deleteSpace.error

  function openCreate() {
    setSlug('')
    setName('')
    setChunkTokens('')
    setChunkOverlap('')
    setTopK('')
    setScoreThreshold('')
    setShowAdvanced(false)
    setForm({ kind: 'create' })
    setConfirmDelete(null)
  }

  function openEdit(space: SpaceInfo) {
    setSlug(space.slug)
    setName(space.name)
    setChunkTokens('')
    setChunkOverlap('')
    setTopK('')
    setScoreThreshold('')
    setShowAdvanced(false)
    setForm({ kind: 'edit', space })
    setConfirmDelete(null)
  }

  function closeForm() {
    setForm(null)
    createSpace.reset()
    updateSpace.reset()
  }

  function handleSave() {
    const numOrUndef = (v: string) => {
      const n = Number(v)
      return v.trim() && !Number.isNaN(n) ? n : undefined
    }

    if (form?.kind === 'create') {
      createSpace.mutate(
        {
          slug: slug.trim(),
          name: name.trim(),
          chunk_tokens: numOrUndef(chunkTokens),
          chunk_overlap: numOrUndef(chunkOverlap),
          top_k: numOrUndef(topK),
          score_threshold: numOrUndef(scoreThreshold),
        },
        { onSuccess: () => setForm(null) },
      )
    } else if (form?.kind === 'edit') {
      updateSpace.mutate(
        {
          slug: form.space.slug,
          name: name.trim() || undefined,
          chunk_tokens: numOrUndef(chunkTokens),
          chunk_overlap: numOrUndef(chunkOverlap),
          top_k: numOrUndef(topK),
          score_threshold: numOrUndef(scoreThreshold),
        },
        { onSuccess: () => setForm(null) },
      )
    }
  }

  function handleDelete(slug: string) {
    deleteSpace.mutate(slug, {
      onSuccess: () => setConfirmDelete(null),
    })
  }

  const isEditing = form?.kind === 'edit'
  const canSave = form?.kind === 'create' ? slug.trim().length >= 2 && name.trim().length > 0 : name.trim().length > 0

  return (
    <Tile title="Spaces" icon={Cube}>
      <div className="flex flex-col gap-4">
        {/* Space list */}
        {spacesList.length > 0 && (
          <ul className="flex flex-col gap-1">
            {spacesList.map((s) => (
              <li key={s.slug}>
                <Card padding="sm" className="flex items-center justify-between !py-2">
                  <span className="text-sm text-base-foreground-default">
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 text-xs text-base-subtle-foreground-default">{s.slug}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {confirmDelete === s.slug ? (
                      <>
                        <span className="mr-1 text-xs text-error-foreground-default">Delete?</span>
                        <Button
                          variant="error-solid"
                          size="sm"
                          onPress={() => handleDelete(s.slug)}
                          isDisabled={mutating}
                        >
                          Yes
                        </Button>
                        <Button
                          variant="base-outline"
                          size="sm"
                          onPress={() => setConfirmDelete(null)}
                        >
                          No
                        </Button>
                      </>
                    ) : (
                      <>
                        <IconButton
                          icon={PencilSimple}
                          aria-label={`Edit ${s.name}`}
                          onPress={() => openEdit(s)}
                          isDisabled={mutating}
                        />
                        <IconButton
                          icon={Trash}
                          aria-label={`Delete ${s.name}`}
                          onPress={() => setConfirmDelete(s.slug)}
                          isDisabled={mutating}
                        />
                      </>
                    )}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {spacesList.length === 0 && !spaces.isLoading && !form && (
          <p className="text-sm text-base-subtle-foreground-default">
            No spaces defined yet. Create one to start indexing documents.
          </p>
        )}

        {/* Custom field hint */}
        <div className="flex items-start gap-2 rounded-lg border border-base-border-default bg-base-subtle-background-default px-3 py-2.5">
          <Info size={16} weight="regular" className="mt-px shrink-0 text-base-subtle-foreground-default" />
          <span className="text-xs text-base-subtle-foreground-default">
            Documents are assigned to spaces via a Paperless custom field named{' '}
            <span className="font-medium text-base-foreground-default">RAG Spaces</span>{' '}
            (type: <span className="font-medium text-base-foreground-default">String</span>).
            Set the field value to a space slug to include the document.
          </span>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default">
            {error.message}
          </div>
        )}

        {/* Inline form */}
        {form && (
          <Card padding="md">
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-medium text-base-foreground-default">
                {isEditing ? `Edit "${form.space.name}"` : 'New Space'}
              </h4>

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
                    placeholder={isEditing ? String(form.space.params.chunk_tokens) : '800'}
                  />
                  <TextField
                    label="Chunk Overlap"
                    required={false}
                    type="number"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(e.target.value)}
                    placeholder={isEditing ? String(form.space.params.chunk_overlap) : '120'}
                  />
                  <TextField
                    label="Top K"
                    required={false}
                    type="number"
                    value={topK}
                    onChange={(e) => setTopK(e.target.value)}
                    placeholder={isEditing ? String(form.space.params.top_k) : '6'}
                  />
                  <TextField
                    label="Score Threshold"
                    required={false}
                    type="number"
                    step="0.01"
                    value={scoreThreshold}
                    onChange={(e) => setScoreThreshold(e.target.value)}
                    placeholder={isEditing ? String(form.space.params.score_threshold) : '0.35'}
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
          </Card>
        )}

        {/* Add button */}
        {!form && (
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
