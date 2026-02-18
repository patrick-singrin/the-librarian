import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { RouterProvider } from 'react-aria-components'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { AppShell } from './components/layout/AppShell'
import { HealthDashboard } from './components/health/HealthDashboard'
import { SyncPage } from './components/sync/SyncPage'
import { MetaPage } from './components/meta/MetaPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { ComponentsDemo } from './components/dev/ComponentsDemo'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10000,
      gcTime: Infinity,
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'librarian-query-cache',
})

function InnerApp() {
  const navigate = useNavigate()

  return (
    <RouterProvider navigate={navigate}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HealthDashboard />} />
          <Route path="sync" element={<SyncPage />} />
          <Route path="meta" element={<MetaPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="dev/components" element={<ComponentsDemo />} />
        </Route>
      </Routes>
    </RouterProvider>
  )
}

export default function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <BrowserRouter>
        <InnerApp />
      </BrowserRouter>
    </PersistQueryClientProvider>
  )
}
