import type { AskResponse } from '../../types/api'
import { Link } from 'react-aria-components'
import { Badge } from '../ui'

interface ResultCardProps {
  data: AskResponse
}

export function ResultCard({ data }: ResultCardProps) {
  return (
    <div className="mt-6 space-y-4">
      <section aria-label="Answer">
        <h3 className="mb-2 text-sm font-semibold text-gray-500">Answer</h3>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
          {data.answer}
        </div>
        <p className="mt-1 text-xs text-gray-400">Model: {data.model_used}</p>
      </section>

      {data.citations.length > 0 && (
        <section aria-label="Sources">
          <h3 className="mb-2 text-sm font-semibold text-gray-500">
            Sources ({data.citations.length})
          </h3>
          <ul className="space-y-2">
            {data.citations.map((citation, i) => (
              <li
                key={`${citation.doc_id}-${i}`}
                className="rounded-lg border border-gray-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{citation.title}</p>
                    {citation.snippet && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{citation.snippet}</p>
                    )}
                  </div>
                  <Badge variant="primary" type="outline" size="xs">
                    {Math.round(citation.score * 100)}%
                  </Badge>
                </div>
                {citation.url && (
                  <Link
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs text-blue-600 underline outline-focus
                      hover:text-blue-800
                      focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    Open in Paperless
                    <span className="sr-only"> (opens in new tab)</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
