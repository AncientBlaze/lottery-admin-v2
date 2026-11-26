import type { ReactNode } from 'react'

export const inputCls =
  'w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20'

export function Field({
  label,
  hint,
  asLabel,
  children,
}: {
  label: string
  hint?: string
  asLabel?: boolean
  children: ReactNode
}) {
  const Tag = asLabel ? 'label' : 'div'
  return (
    <Tag className="block space-y-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-slate-500">{hint}</span> : null}
    </Tag>
  )
}
