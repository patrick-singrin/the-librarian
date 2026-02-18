import { useState, useEffect } from 'react'
import { useMetaPending, useMetaEnrich, useMetaJobStatus } from '../../hooks/useMetaStatus'
import { useSettings, useUpdateSettings } from '../../hooks/useSettings'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { useTick } from '../../hooks/useTick'
import { Button, Tile, Card, TextField } from '../ui'
import type { TileBadge } from '../ui'
import {
  Atom,
  ArrowsClockwise,
  Wrench,
  GearSix,
  FloppyDisk,
} from '@phosphor-icons/react'

export function MetaPage() {
  const pending = useMetaPending()
  const enrich = useMetaEnrich()
  const paperless = useServiceHealth('paperless')
  const settings = useSettings()
  const updateSettings = useUpdateSettings()
  const [jobStarted, setJobStarted] = useState(false)
  const jobStatus = useMetaJobStatus(jobStarted)

  // Keep relative timestamps fresh
  useTick(60_000)

  // Local form state for tag configuration
  const [tagName, setTagName] = useState('')
  const [tagId, setTagId] = useState('')

  // Seed form from fetched settings
  useEffect(() => {
    if (settings.data) {
      setTagName(settings.data.metaNewTagName ?? '')
      setTagId(settings.data.metaNewTagId ?? '')
    }
  }, [settings.data])

  const docs = pending.data?.results ?? []
  const count = pending.data?.count ?? 0
  const loading = pending.isLoading

  const isRunning = jobStatus.data?.running ?? false
  const jobDone = jobStarted && jobStatus.data && !isRunning && jobStatus.data.exitCode !== null
  const jobSucceeded = jobDone && jobStatus.data?.exitCode === 0

  function handleEnrich() {
    setJobStarted(true)
    enrich.mutate(undefined)
  }

  const tagDirty =
    settings.data != null &&
    (tagName !== (settings.data.metaNewTagName ?? '') ||
      tagId !== (settings.data.metaNewTagId ?? ''))

  function handleSaveTag() {
    updateSettings.mutate({
      metaNewTagName: tagName.trim(),
      metaNewTagId: tagId.trim(),
    })
  }

  // Tile header badge — shows enrichment state at a glance
  const statusBadge: TileBadge | undefined = loading
    ? undefined
    : isRunning
      ? { label: 'Running', indicator: 'info' }
      : jobDone
        ? jobSucceeded
          ? { label: 'Complete', indicator: 'success' }
          : { label: 'Error', indicator: 'error' }
        : count === 0
          ? { label: 'All enriched', indicator: 'success' }
          : { label: `${count} pending`, indicator: 'warning' }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <h2 className="text-2xl font-bold text-base-foreground-default">Meta Data Tool</h2>

      {pending.error && (
        paperless.isStarting ? (
          <div role="status" className="rounded-lg border border-warning-subtle-border-default bg-warning-subtle-background-default p-4 text-sm text-warning-foreground-default">
            {paperless.message}
          </div>
        ) : (
          <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
            Unable to load pending documents: {pending.error.message}
          </div>
        )
      )}

      {/* ── Section 1: Status ── */}
      <Tile title="Status" icon={Atom} badge={statusBadge} updatedAt={pending.dataUpdatedAt || null}>
        <div className="flex flex-col gap-4">
          {/* Hero: pending count */}
          <div className="flex flex-col items-center rounded-lg bg-base-subtle-background-default px-4 py-5">
            <span className="pt-2 pb-1 text-[30px] font-semibold leading-9 text-base-foreground-default">
              {loading ? '…' : count}
            </span>
            <p className="mt-1 text-xs text-base-subtle-foreground-default">
              Documents pending enrichment
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="base-outline"
              iconLeft={ArrowsClockwise}
              onPress={() => pending.refetch()}
              isDisabled={pending.isFetching}
            >
              {pending.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button
              variant="primary-solid"
              iconLeft={Atom}
              onPress={handleEnrich}
              isDisabled={enrich.isPending || isRunning || count === 0}
            >
              {isRunning ? 'Enriching…' : 'Auto-Enrich All'}
            </Button>
          </div>

          {/* Enrichment start error */}
          {enrich.error && (
            <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default">
              Enrichment failed to start: {enrich.error.message}
            </div>
          )}
        </div>
      </Tile>

      {/* ── Section 2: Tools ── */}
      <Tile title="Tools" icon={Wrench}>
        <div className="flex flex-col gap-4">
          {/* Job status feedback */}
          {jobStarted && jobStatus.data && (
            <div
              role="status"
              className={`rounded-lg border p-4 text-sm ${
                isRunning
                  ? 'border-info-subtle-border-default bg-info-subtle-background-default text-info-foreground-default'
                  : jobSucceeded
                    ? 'border-success-subtle-border-default bg-success-subtle-background-default text-success-foreground-default'
                    : 'border-error-subtle-border-default bg-error-subtle-background-default text-error-foreground-default'
              }`}
            >
              <p className="font-medium">
                {isRunning
                  ? 'Enrichment in progress…'
                  : jobSucceeded
                    ? 'Enrichment completed successfully'
                    : 'Enrichment finished with errors'}
              </p>
              {jobStatus.data.output && (
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-xs">
                  {jobStatus.data.output}
                </pre>
              )}
            </div>
          )}

          {/* Pending documents list */}
          {docs.length > 0 && (
            <section aria-label="Pending documents">
              <h4 className="mb-2 text-xs font-medium text-base-subtle-foreground-default">
                {docs.length} pending document{docs.length !== 1 ? 's' : ''}
              </h4>
              <ul className="flex flex-col gap-1">
                {docs.map((doc) => (
                  <li key={doc.id}>
                    <Card padding="sm" className="!py-2">
                      <span className="text-sm text-base-foreground-default">
                        <span className="font-medium">#{doc.id}</span>
                        <span className="ml-2">{doc.title}</span>
                        <span className="ml-2 text-xs text-base-subtle-foreground-default">
                          {new Date(doc.created).toLocaleDateString('en-US')}
                        </span>
                      </span>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Empty state */}
          {count === 0 && !loading && (
            <p role="status" className="text-sm text-base-subtle-foreground-default">
              All documents are enriched.
            </p>
          )}
        </div>
      </Tile>

      {/* ── Section 3: Configuration ── */}
      <Tile title="Configuration" icon={GearSix}>
        <div className="flex flex-col gap-4">
          <p className="text-xs text-base-subtle-foreground-default">
            The enrichment process picks up documents tagged with this Paperless tag.
            After processing, the tag is removed.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Tag Name"
              required={false}
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="NEW"
              helperText="Display name of the tag in Paperless"
            />
            <TextField
              label="Tag ID"
              required={false}
              type="number"
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              placeholder="151"
              helperText="Numeric ID from Paperless"
            />
          </div>

          {updateSettings.error && (
            <div role="alert" className="rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-3 text-sm text-error-foreground-default">
              {updateSettings.error.message}
            </div>
          )}

          {updateSettings.isSuccess && !tagDirty && (
            <div role="status" className="text-xs text-success-foreground-default">
              Saved
            </div>
          )}

          <div>
            <Button
              variant="primary-solid"
              size="sm"
              iconLeft={FloppyDisk}
              onPress={handleSaveTag}
              isDisabled={!tagDirty || updateSettings.isPending || !tagId.trim()}
            >
              {updateSettings.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Tile>
    </div>
  )
}
