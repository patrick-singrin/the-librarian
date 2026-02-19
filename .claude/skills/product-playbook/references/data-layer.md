# Data Layer Patterns

## Architecture

```
Component → Hook (src/hooks/) → API client (src/api/client.ts) → Backend (:3001) → Services
```

Components NEVER call the API client directly. All data access goes through hooks.

## TanStack React Query Conventions

All server state uses TanStack React Query. No other state management library for server data.

### Hook structure template

```tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { MyResponse } from '../types/api'

export function useMyData(param?: string) {
  return useQuery<MyResponse>({
    queryKey: ['my-data', param],    // Array format, includes parameters
    queryFn: () => api.myEndpoint(param),
    refetchInterval: 60_000,          // In milliseconds
    enabled: !!param,                 // Conditional fetching
  })
}
```

### Query key conventions
- Array format: `['domain']` or `['domain', param1, param2]`
- Match the API route conceptually: `/api/health` → `['health']`
- Include all parameters that affect the response

### Refetch intervals by data type
| Data type | Interval | Rationale |
|-----------|----------|-----------|
| Health/status | 30s | Near-real-time monitoring |
| Overview stats | 60s | Summary data, less volatile |
| Timeline | 120s | Historical, slow-changing |
| Sync status | 60s | Background process check |
| Documents list | 120s | Moderate change frequency |
| Settings | 300s | Rarely changes |
| Job status (active) | 3s | Fast polling during operations |

### Mutations

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useMyAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: MyParams) => api.myAction(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['related-data'] })
    },
  })
}
```

After a mutation, invalidate related query keys so dependent queries refetch.

### Derived hooks

When you need a subset of a query's data, create a derived hook rather than a new query:

```tsx
// useServiceHealth derives from useHealth -- no separate API call
export function useServiceHealth(service: keyof HealthResponse['services']) {
  const { data, ...rest } = useHealth()
  const health = data?.services[service]
  return { health, ...rest }
}
```

## API Client

`src/api/client.ts` exports a single `api` object with typed methods.

### Pattern
```tsx
export const api = {
  health: () => request<HealthResponse>('/api/health'),
  myAction: (body: MyRequest) =>
    request<MyResponse>('/api/my-action', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
```

The `request<T>()` helper handles: JSON content-type, error extraction, response typing.

### Adding a new endpoint
1. Add the response type to `src/types/api.ts`
2. Add the method to `src/api/client.ts`
3. Create a hook in `src/hooks/use{Domain}.ts`
4. Import the hook in your component

NEVER skip steps or call `api.*` directly from a component.

## TypeScript Types

All API response types live in `src/types/api.ts`. This is the SSOT.

### Rules
- NEVER define inline types for API data in components or hooks
- ALWAYS import from `src/types/api.ts`
- If the backend sends a new shape, add the type to `api.ts` first
- Use the inline `import()` syntax in `client.ts` for lazy type references:
  ```tsx
  request<import('../types/api.js').HealthResponse>('/api/health')
  ```

### Current types inventory
See `references/inventory.md` for the full list.

## State management boundaries

| State type | Tool | Location |
|------------|------|----------|
| Server data | TanStack React Query | `src/hooks/` |
| UI state (local) | `useState` | Component file |
| URL state | React Router | Route params/search params |
| Persisted cache | `@tanstack/query-sync-storage-persister` | Automatic via React Query config |

NEVER introduce: Redux, Zustand, Jotai, useContext for data, MobX, or any other state library.
NEVER use `useState` + `useEffect` for server data -- use React Query.
