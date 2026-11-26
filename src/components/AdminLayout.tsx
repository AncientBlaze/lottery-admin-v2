import { useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/draws', label: 'Draws' },
  { to: '/money', label: 'Deposits & Withdrawals' },
  { to: '/users', label: 'Users' },
  { to: '/banners', label: 'Banners' },
  { to: '/settings', label: 'Settings' },
] as const

export default function AdminLayout() {
  const { username, role, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar */}
      <aside
        className={`${open ? 'block' : 'hidden'} md:block md:w-60 md:shrink-0 border-r border-slate-800 bg-slate-900`}
      >
        <div className="px-5 py-4 text-lg font-bold text-amber-400">Dear6 Admin</div>
        <nav className="px-3 pb-4 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: n.to === '/' }}
              className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              activeProps={{ className: 'bg-amber-500/15 text-amber-400 font-medium' }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
          <button
            type="button"
            className="md:hidden rounded-lg border border-slate-700 px-3 py-1.5 text-sm"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-300">
              {username || 'admin'}
              {role && (
                <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                  {role}
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6 max-w-5xl">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
