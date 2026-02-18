import { useState } from 'react'
import { SearchField, Input, Label } from 'react-aria-components'
import { useRagSearch } from '../../hooks/useRagSearch'
import { ResultCard } from './ResultCard'
import { Button } from '../ui'

export function SearchPage() {
  const [query, setQuery] = useState('')
  const search = useRagSearch()

  function handleSubmit() {
    const trimmed = query.trim()
    if (trimmed) {
      search.mutate(trimmed)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Document Search</h2>

      <SearchField
        value={query}
        onChange={setQuery}
        onSubmit={handleSubmit}
        className="flex flex-col gap-1.5"
      >
        <Label className="text-sm font-medium text-gray-700">Search your documents</Label>
        <div className="flex gap-2">
          <Input
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-focus
              placeholder:text-gray-400
              focus:border-focus focus:outline-2 focus:outline-offset-0"
            placeholder="Ask a question about your documents..."
          />
          <Button
            variant="primary-solid"
            onPress={handleSubmit}
            isDisabled={search.isPending || !query.trim()}
          >
            {search.isPending ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </SearchField>

      {search.error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Search failed: {search.error.message}
        </div>
      )}

      {search.data && <ResultCard data={search.data} />}
    </div>
  )
}
