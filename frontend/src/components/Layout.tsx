import { NavLink, Outlet } from 'react-router-dom'
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

export function Layout() {
  const { logout } = useAuth()

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

          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-group-label">{group.label}</div>
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
          ))}
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
