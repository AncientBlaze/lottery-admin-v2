import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, toList } from '../lib/api'
import { Field, inputCls } from '../components/ui'

type Draw = {
  id: string
  drawNumber?: number | string
  drawType?: string
  status?: string
  ticketPrice?: string | number
  firstPrize?: string | number
  prize1?: string | number
  scheduledAt?: string
  soldTickets?: number
}

const emptyForm = {
  drawType: 'DAILY',
  ticketPrice: '10',
  maxTickets: '10000',
  firstPrize: '10000',
  secondPrize: '5000',
  thirdPrize: '1000',
  scheduledAt: '',
}
type Form = typeof emptyForm

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  OPEN: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  LOCKED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  COMPLETED: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  CANCELLED: 'bg-red-500/15 text-red-300 border-red-500/30',
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'UNKNOWN').toUpperCase()
  const cls = STATUS_STYLES[s] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${cls}`}>
      {s}
    </span>
  )
}

export default function DrawsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Form>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('ALL')

  const draws = useQuery({
    queryKey: ['draws'],
    queryFn: async () => toList((await api<Draw[] | { items: Draw[] }>('/admin/draws')).data),
  })
  const list = draws.data ?? []

  const setField = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const create = useMutation({
    mutationFn: () =>
      api('/admin/draws', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          maxTickets: Number(form.maxTickets) || 10000,
          scheduledAt: form.scheduledAt
            ? new Date(form.scheduledAt).toISOString()
            : new Date(Date.now() + 3600_000).toISOString(),
        }),
      }),
    onSuccess: () => {
      toast.success('Draw created successfully')
      setShowForm(false)
      setForm(emptyForm)
      void qc.invalidateQueries({ queryKey: ['draws'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const action = useMutation({
    mutationFn: (v: { id: string; path: 'lock' | 'auto-draw' }) =>
      api(`/admin/draws/${v.id}/${v.path}`, { method: 'POST' }),
    onSuccess: (_r, v) => {
      toast.success(`${v.path.replace('-', ' ')} completed`)
      void qc.invalidateQueries({ queryKey: ['draws'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const isBusy = (id: string, path: string) =>
    action.isPending && action.variables?.id === id && action.variables?.path === path

  const filtered = useMemo(
    () => (filter === 'ALL' ? list : list.filter((d) => (d.status || '').toUpperCase() === filter)),
    [list, filter],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: list.length, OPEN: 0, SCHEDULED: 0, LOCKED: 0, COMPLETED: 0 }
    list.forEach((d) => {
      const s = (d.status || '').toUpperCase()
      if (c[s] !== undefined) c[s] += 1
    })
    return c
  }, [list])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">Lottery</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Draws</h1>
          <p className="mt-1 text-sm text-slate-400">Create, lock, and run draws for the app.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void draws.refetch()}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 px-4 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 hover:brightness-110"
          >
            {showForm ? 'Close form' : '+ New draw'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['ALL', 'OPEN', 'SCHEDULED', 'LOCKED', 'COMPLETED'].map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === f
                ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f}
            <span className="ml-1.5 opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
          className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#121a2b] to-[#0d1422] p-6 shadow-xl"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
          <h2 className="mb-5 text-sm font-semibold text-amber-300">Create new draw</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field asLabel label="Type">
              <select className={inputCls} value={form.drawType} onChange={(e) => setField('drawType', e.target.value)}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MEGA">Mega jackpot</option>
              </select>
            </Field>
            <Field asLabel label="Ticket price (₹)">
              <input className={inputCls} value={form.ticketPrice} onChange={(e) => setField('ticketPrice', e.target.value)} inputMode="decimal" />
            </Field>
            <Field asLabel label="Max tickets">
              <input className={inputCls} value={form.maxTickets} onChange={(e) => setField('maxTickets', e.target.value)} inputMode="numeric" />
            </Field>
            <Field asLabel label="Scheduled at">
              <input type="datetime-local" className={inputCls} value={form.scheduledAt} onChange={(e) => setField('scheduledAt', e.target.value)} />
            </Field>
            <Field asLabel label="1st prize (₹)">
              <input className={inputCls} value={form.firstPrize} onChange={(e) => setField('firstPrize', e.target.value)} />
            </Field>
            <Field asLabel label="2nd prize (₹)">
              <input className={inputCls} value={form.secondPrize} onChange={(e) => setField('secondPrize', e.target.value)} />
            </Field>
            <Field asLabel label="3rd prize (₹)">
              <input className={inputCls} value={form.thirdPrize} onChange={(e) => setField('thirdPrize', e.target.value)} />
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {create.isPending ? 'Creating…' : 'Create draw'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm(emptyForm)
              }}
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {draws.isError ? (
        <div className="text-red-400">{(draws.error as Error).message}</div>
      ) : draws.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-16 text-center">
          <div className="text-3xl">🎟️</div>
          <p className="mt-3 font-medium text-slate-200">No draws here</p>
          <p className="mt-1 text-sm text-slate-500">
            {filter === 'ALL' ? 'Create your first draw to show it in the app.' : `No ${filter.toLowerCase()} draws.`}
          </p>
          {filter === 'ALL' && (
            <button type="button" onClick={() => setShowForm(true)} className="mt-5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black">
              + Create draw
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((d) => {
            const idShort = d.drawNumber ?? d.id?.slice(0, 8)
            const status = (d.status || '').toUpperCase()
            const canLock = ['OPEN', 'SCHEDULED'].includes(status)
            const canDraw = ['LOCKED', 'OPEN'].includes(status)
            const sold = d.soldTickets ?? 0
            return (
              <article
                key={d.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f172a] p-5 transition hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white">Draw #{idShort}</h3>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="mt-1.5 flex min-w-0 items-center gap-2">
                      <p className="truncate font-mono text-xs text-slate-500" title={d.id}>{d.id}</p>
                      <button
                        type="button"
                        title="Copy draw ID"
                        onClick={() => {
                          void navigator.clipboard?.writeText(d.id)
                          toast.success('Draw ID copied')
                        }}
                        className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/15"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-amber-300/90">
                    {d.drawType || 'DAILY'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-black/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Price</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-100">₹{d.ticketPrice ?? '—'}</div>
                  </div>
                  <div className="rounded-xl bg-black/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Sold</div>
                    <div className={`mt-0.5 text-sm font-semibold ${sold === 0 ? 'text-slate-500' : 'text-emerald-300'}`}>
                      {sold}
                    </div>
                  </div>
                  <div className="rounded-xl bg-black/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">1st prize</div>
                    <div className="mt-0.5 text-sm font-semibold text-amber-300">₹{d.firstPrize ?? d.prize1 ?? '—'}</div>
                  </div>
                  <div className="rounded-xl bg-black/30 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">Schedule</div>
                    <div className="mt-0.5 text-[11px] font-medium leading-snug text-slate-200">
                      {d.scheduledAt ? new Date(d.scheduledAt).toLocaleString() : '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canLock && (
                    <button
                      type="button"
                      disabled={isBusy(d.id, 'lock')}
                      onClick={() => action.mutate({ id: d.id, path: 'lock' })}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      {isBusy(d.id, 'lock') ? '…' : 'Lock'}
                    </button>
                  )}
                  {canDraw && (
                    <button
                      type="button"
                      disabled={isBusy(d.id, 'auto-draw') || sold === 0}
                      title={sold === 0 ? 'No tickets sold yet' : undefined}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Run auto-draw? ${sold} ticket${sold === 1 ? '' : 's'} sold. Winners are picked and prizes paid immediately; this cannot be undone.`,
                          )
                        )
                          action.mutate({ id: d.id, path: 'auto-draw' })
                      }}
                      className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isBusy(d.id, 'auto-draw') ? '…' : 'Auto draw'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}