import {
  BarChart3,
  Boxes,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  ScrollText,
  Truck,
  Wallet,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const rootItem = { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard }

const navGroups: {
  label: string
  icon: LucideIcon
  items: { to: string; label: string; icon: LucideIcon }[]
}[] = [
  {
    label: 'Masters',
    icon: Boxes,
    items: [
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
      { to: '/items', label: 'Items', icon: Package },
    ],
  },
  {
    label: 'Transactions',
    icon: Receipt,
    items: [
      { to: '/purchases', label: 'Purchases', icon: Receipt },
      { to: '/payments', label: 'Payments', icon: Wallet },
    ],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    items: [{ to: '/ledger', label: 'Ledger', icon: ScrollText }],
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
        <div className="brand">
          <Waves className="icon" size={22} />
          LedgerFlow
        </div>
        <nav>
          <NavLink
            to={rootItem.to}
            end={rootItem.end}
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            <rootItem.icon className="icon" size={17} />
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
                  <ChevronRight className="icon nav-group-chevron" size={14} />
                  <group.icon className="icon" size={16} />
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
                        <item.icon className="icon" size={16} />
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
          <LogOut className="icon" size={16} />
          Log out
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
