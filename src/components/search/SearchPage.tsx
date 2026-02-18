import { useState } from 'react'
import { SearchField, Input, Label } from 'react-aria-components'
import { useRagSearch } from '../../hooks/useRagSearch'
import { useSpaces } from '../../hooks/useSyncStatus'
import { useServiceHealth } from '../../hooks/useServiceHealth'
import { ResultCard } from './ResultCard'
import { Button, Select, SelectItem } from '../ui'

const ALL_SPACES_KEY = '__all__'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [selectedSpace, setSelectedSpace] = useState<string>(ALL_SPACES_KEY)
  const spaceId = selectedSpace === ALL_SPACES_KEY ? undefined : selectedSpace

  const spaces = useSpaces()
  const search = useRagSearch()
  const rag = useServiceHealth('rag')

  const spacesList = spaces.data ?? []
  const hasSpaces = spacesList.length > 0

  function handleSubmit() {
    const trimmed = query.trim()
    if (trimmed) {
      search.mutate({ query: trimmed, spaceId })
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-base-foreground-default">Document Search</h2>
        {hasSpaces && (
          <Select
            aria-label="Select space"
            selectedKey={selectedSpace}
            onSelectionChange={(key) => setSelectedSpace(key as string)}
          >
            <SelectItem id={ALL_SPACES_KEY} textValue="All Spaces">
              All Spaces
            </SelectItem>
            {spacesList.map((s) => (
              <SelectItem key={s.slug} id={s.slug} textValue={s.name}>
                {s.name}
              </SelectItem>
            ))}
          </Select>
        )}
      </div>

      <SearchField
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        className="flex flex-col gap-1.5"
      >
        <Label className="text-sm font-medium text-base-subtle-foreground-default">Search your documents</Label>
        <div className="flex gap-2">
          <Input
            className="flex-1 rounded-lg border border-base-border-default bg-base-background-default px-3 py-2 text-sm text-base-foreground-default outline-focus
              placeholder:text-base-subtle-foreground-default
              focus:border-focus focus:outline-2 focus:outline-offset-0"
            placeholder="Ask a question about your documents..."
          />
          <Button
            variant="primary-solid"
            onPress={handleSubmit}
            isDisabled={search.isPending || !query.trim()}
          >
            {search.isPending ? 'Searching…' : 'Search'}
          </Button>
        </div>
      </SearchField>

      {search.error && (
        rag.isStarting ? (
          <div role="status" className="mt-4 rounded-lg border border-warning-subtle-border-default bg-warning-subtle-background-default p-4 text-sm text-warning-foreground-default">
            {rag.message}
          </div>
        ) : (
          <div role="alert" className="mt-4 rounded-lg border border-error-subtle-border-default bg-error-subtle-background-default p-4 text-sm text-error-foreground-default">
            Search failed: {search.error.message}
          </div>
        )
      )}

      {search.data && <ResultCard data={search.data} />}
    </div>
  )
}
