import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, GitBranch, ShieldCheck, LogOut, Rocket,
  RefreshCw, Bell
} from 'lucide-react'

const ROLE_COLORS = {
  admin: 'var(--role-admin)',
  founder: 'var(--role-founder)',
  trainer: 'var(--role-trainer)',
  admin_staff: 'var(--role-admin-staff)',
}

function RoleBadge({ role }) {
  const labels = { admin: 'Admin', founder: 'Founder', trainer: 'Trainer', admin_staff: 'Ops Staff' }
  return (
    <span className={`badge badge-${role}`} style={{ fontSize: '10px' }}>
      {labels[role] ?? role}
    </span>
  )
}

function UserAvatar({ name, role }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??'
  return (
    <div className="user-avatar" style={{ background: ROLE_COLORS[role] + '25', color: ROLE_COLORS[role] }}>
      {initials}
    </div>
  )
}

export default function AppShell() {
  const { profile, role, isAdmin, signOut } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [syncStatus, setSyncStatus] = useState('synced') // synced | syncing | error

  useEffect(() => {
    supabase.from('notifications')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotifications(data ?? []))
  }, [])

  const displayName = profile?.full_name || profile?.email?.split('@')[0] || 'User'

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Rocket size={17} color="#fff" />
          </div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">SpaceMinds</div>
            <div className="sidebar-logo-sub">OPS HUB</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Main</div>

          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </NavLink>

          <NavLink
            to="/pipeline"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <GitBranch size={15} />
            Pipeline
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-section" style={{ marginTop: '8px' }}>Admin</div>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <ShieldCheck size={15} />
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* Sync status */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            <div className={`sync-dot ${syncStatus}`} />
            {syncStatus === 'syncing' ? 'Syncing Sheets...' : syncStatus === 'error' ? 'Sync error' : 'Sheets synced'}
          </div>
        </div>

        {/* User card */}
        <div className="sidebar-footer">
          <div className="user-card">
            <UserAvatar name={profile?.full_name} role={role} />
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-email">{profile?.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <RoleBadge role={role} />
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Notification banners */}
        {notifications.map(n => (
          <div key={n.id} className={`notification-banner ${n.type}`}>
            <Bell size={13} style={{ flexShrink: 0 }} />
            <strong style={{ marginRight: '4px' }}>{n.title}:</strong>
            {n.message}
          </div>
        ))}

        <Outlet />
      </div>
    </div>
  )
}
