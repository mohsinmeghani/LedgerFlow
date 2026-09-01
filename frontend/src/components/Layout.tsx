import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const rootItem = { to: '/', label: 'Dashboard', end: true }

const navGroups: { label: string; items: { to: string; label: string }[] }[] = [
  {
    label: 'Masters',
    items: [
      { to: '/suppliers', label: 'Suppliers' },
      { to: '/items', label: 'Items' },
    ],
  },
  {
    label: 'Transactions',
    items: [
      { to: '/purchases', label: 'Purchases' },
      { to: '/payments', label: 'Payments' },
    ],
  },
  {
    label: 'Reports',
    items: [{ to: '/ledger', label: 'Ledger' }],
  },
]

function groupContainingPath(pathname: string): string | null {
  const group = navGroups.find((g) => g.items.some((item) => pathname.startsWith(item.to)))
  return group?.label ?? null
}

export function Layout() {
  const { logout } = useAuth()
  const location = useLocation()
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    groupContainingPath(location.pathname),
  )

  function toggleGroup(label: string) {
    setOpenGroup((current) => (current === label ? null : label))
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">LedgerFlow</div>
        <nav>
          <NavLink
            to={rootItem.to}
            end={rootItem.end}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {rootItem.label}
          </NavLink>

          {navGroups.map((group) => {
            const isOpen = openGroup === group.label
            return (
              <div className="nav-group" key={group.label}>
                <button
                  type="button"
                  className={`nav-group-toggle${isOpen ? ' open' : ''}`}
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                >
                  <span className="nav-group-chevron">▸</span>
                  {group.label}
                </button>
                {isOpen && (
                  <div className="nav-group-items">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
        <button className="logout-button" onClick={logout} type="button">
          Log out
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
