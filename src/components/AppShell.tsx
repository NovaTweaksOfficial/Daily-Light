import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, BookOpen, Sunrise, Headphones, ListChecks, Settings2 } from 'lucide-react'
import { MiniPlayer } from '@/components/MiniPlayer'
import { Toasts } from '@/components/Toasts'

const NAV = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/bible', label: 'Bible', icon: BookOpen },
  { to: '/daily', label: 'Daily', icon: Sunrise },
  { to: '/listen', label: 'Listen', icon: Headphones },
  { to: '/plans', label: 'Plans', icon: ListChecks },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export function AppShell() {
  const location = useLocation()
  return (
    <div className="app">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <a className="brand" href="#/">
          <span className="brand-mark" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="9.4" y="3.2" width="5.2" height="17.6" rx="1.6" fill="currentColor" />
              <rect x="4.5" y="8.1" width="15" height="5.2" rx="1.6" fill="currentColor" />
            </svg>
          </span>
          <span className="brand-name">Daily Light</span>
        </a>
        <nav className="side-nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={2} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">World English Bible · public domain</div>
      </aside>

      {/* Main column */}
      <div className="main-col">
        <main className="main" key={location.pathname.split('?')[0]}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="bottom-nav" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `bottom-link ${isActive ? 'active' : ''}`}>
            <span className="bottom-ico">
              <Icon size={21} strokeWidth={1.9} />
            </span>
            <span className="bottom-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <MiniPlayer />
      <Toasts />
    </div>
  )
}
