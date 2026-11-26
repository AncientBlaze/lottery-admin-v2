import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { api, toList } from '../lib/api'

type User = {
  id: string
  mobile?: string | null
  name?: string | null
  isGuest?: boolean
  isBlocked?: boolean
  vipLevel?: number
}

type UsersPayload = User[] | { items?: User[]; page?: number; pageSize?: number; total?: number }

export default function UsersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { page: pageParam } = useSearch({ strict: false }) as { page?: number }
  const page = pageParam ?? 1

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['users', page],
    queryFn: async () => (await api<UsersPayload>(`/admin/users?page=${page}`)).data,
    placeholderData: keepPreviousData,
  })

  const list = toList<User>(data)
  const meta = Array.isArray(data) ? undefined : data
  const totalPages = meta?.total && meta?.pageSize ? Math.max(1, Math.ceil(meta.total / meta.pageSize)) : undefined

  const toggleBlock = useMutation({
    mutationFn: (u: User) => api(`/admin/users/${u.id}/${u.isBlocked ? 'unblock' : 'block'}`, { method: 'POST' }),
    onSuccess: (_r, u) => {
      toast.success(u.isBlocked ? 'User unblocked' : 'User blocked')
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const goTo = (p: number) => void navigate({ to: '/users', search: { page: p > 1 ? p : undefined } })

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-amber-400">Users</h1>
        {meta?.total != null && <span className="text-sm text-slate-400">{meta.total} total</span>}
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading…</p>
      ) : error ? (
        <p className="text-red-400">{(error as Error).message}</p>
      ) : list.length === 0 ? (
        <p className="text-slate-400">No users</p>
      ) : (
        <div className={`space-y-2 ${isFetching ? 'opacity-70' : ''}`}>
          {list.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-[#0f172a] p-3"
            >
              <div>
                <div className="text-sm text-amber-200">{u.mobile || u.name || u.id?.slice(0, 8)}</div>
                <div className="text-xs text-slate-400">
                  {u.isGuest ? 'Guest' : 'User'}
                  {u.isBlocked ? ' · BLOCKED' : ''} · VIP {u.vipLevel ?? 0}
                </div>
              </div>
              <button
                type="button"
                disabled={toggleBlock.isPending && toggleBlock.variables?.id === u.id}
                onClick={() => {
                  if (!u.isBlocked && !window.confirm('Block this user?')) return
                  toggleBlock.mutate(u)
                }}
                className={`rounded-lg border px-3 py-1 text-xs disabled:opacity-50 ${
                  u.isBlocked ? 'border-emerald-500/50 text-emerald-300' : 'border-slate-600 text-slate-200'
                }`}
              >
                {u.isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>
          ))}
        </div>
      )}

      {(page > 1 || (totalPages ?? 1) > 1) && (
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-slate-400">
            Page {page}
            {totalPages ? ` of ${totalPages}` : ''}
          </span>
          <button
            type="button"
            disabled={totalPages != null ? page >= totalPages : list.length === 0}
            onClick={() => goTo(page + 1)}
            className="rounded-lg border border-slate-700 px-3 py-1.5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
