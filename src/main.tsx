import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { router } from './router'
import { ApiError } from './lib/api'
import { useAuth } from './lib/auth'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      // don't retry auth failures
      retry: (count, err) =>
        !(err instanceof ApiError && [401, 403].includes(err.status)) && count < 2,
    },
  },
})

// When the session ends (logout or 401), clear cached data and go to login.
useAuth.subscribe((state, prev) => {
  if (prev.token && !state.token) {
    queryClient.clear()
    void router.navigate({ to: '/login' })
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster theme="dark" position="top-right" richColors />
    </QueryClientProvider>
  </React.StrictMode>,
)
