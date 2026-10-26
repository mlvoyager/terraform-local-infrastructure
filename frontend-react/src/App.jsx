import { useCallback, useEffect, useMemo, useState } from 'react'
import api from './services/api'
import './App.css'

const statusLabels = { todo: 'À faire', in_progress: 'En cours', review: 'À valider', done: 'Terminée' }
const priorityLabels = { low: 'Basse', medium: 'Normale', high: 'Haute', urgent: 'Urgente' }
const roleLabels = { admin: 'Administrateur', project_manager: 'Chef de projet', member: 'Membre' }
const projectStatusLabels = { active: 'En cours', completed: 'Terminé', archived: 'Archivé' }

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
  const shapes = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    check: <><path d="m5 12 4 4L19 6"/><path d="M21 12a9 9 0 1 1-3-6.7"/></>,
    folder: <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M3.5 10h17"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/></>,
    close: <><path d="m18 6-12 12M6 6l12 12"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></>,
    filter: <><path d="M4 7h16M7 12h10m-7 5h4"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1z"/></>,
  }
  return <svg {...common}>{shapes[name] || shapes.grid}</svg>
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
}

function formatDate(value, options = { day: 'numeric', month: 'short' }) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', options).format(new Date(`${value.slice(0, 10)}T12:00:00`))
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await api.post(mode === 'login' ? '/auth/login' : '/auth/register', form)
      localStorage.setItem('access_token', result.access_token)
      onAuthenticated(result.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-mark"><Icon name="check" size={23} /></div>
        <span className="brand-word">taskflow<span>.</span></span>
        <div className="auth-pitch">
          <div className="eyebrow light-eyebrow"><span className="eyebrow-dot" /> L’espace où les équipes avancent</div>
          <h1>Le travail d’équipe,<br /><em>en mouvement.</em></h1>
          <p>Rassemblez vos projets, vos tâches et votre équipe dans un espace clair. Chaque avancée compte.</p>
          <div className="auth-quote-card">
            <div className="quote-avatars"><span>AM</span><span>YL</span><span>SK</span><b>+8</b></div>
            <div><strong>Une équipe, au même rythme</strong><small>Des idées jusqu’aux résultats.</small></div>
            <span className="quote-sparkle"><Icon name="sparkle" size={20} /></span>
          </div>
        </div>
        <div className="auth-panel-foot"><span>Simplement mieux organisés.</span><span>© Taskflow {new Date().getFullYear()}</span></div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <div className="mobile-brand"><span className="brand-mark"><Icon name="check" size={20} /></span><span className="brand-word">taskflow<span>.</span></span></div>
          <div className="auth-heading">
            <div className="eyebrow"><span className="eyebrow-dot" /> VOTRE ESPACE DE TRAVAIL</div>
            <h2>{mode === 'login' ? 'Ravi de vous revoir.' : 'On démarre ensemble.'}</h2>
            <p>{mode === 'login' ? 'Connectez-vous pour retrouver votre équipe.' : 'Créez votre compte membre en quelques secondes.'}</p>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <label>Nom complet<input autoComplete="name" required minLength="2" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Ex. Camille Laurent" /></label>}
            <label>Adresse e-mail<div className="input-icon"><Icon name="mail" size={17} /><input type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@exemple.com" /></div></label>
            <label>Mot de passe<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8 caractères minimum" /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Connexion…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}<Icon name="arrow" size={17} /></button>
          </form>
          <div className="auth-switch">{mode === 'login' ? 'Vous découvrez Taskflow ?' : 'Vous avez déjà un compte ?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Créer un compte' : 'Se connecter'}</button></div>
          <div className="auth-secure"><span className="secure-check">✓</span> Vos données d’équipe restent privées et sécurisées.</div>
        </div>
      </section>
    </main>
  )
}

function Sidebar({ user, page, setPage, projects, onCreateTask, projectFilter, setProjectFilter }) {
  const isManager = user.role !== 'member'
  const navItems = [
    { id: 'overview', label: 'Vue d’ensemble', icon: 'grid' },
    { id: 'tasks', label: 'Mes tâches', icon: 'check' },
    { id: 'projects', label: 'Projets', icon: 'folder' },
    ...(user.role === 'admin' || user.role === 'project_manager' ? [{ id: 'team', label: 'Équipe', icon: 'users' }] : []),
  ]
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Icon name="check" size={20} /></span><span className="brand-word">taskflow<span>.</span></span></div>
      <div className="workspace-switch"><div className="workspace-icon">T</div><div><strong>Mon équipe</strong><small>Espace de travail</small></div><span className="workspace-chevron">⌄</span></div>
      <div className="sidebar-caption">MENU PRINCIPAL</div>
      <nav className="main-nav">{navItems.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setProjectFilter('') }}><Icon name={item.icon} size={18} /><span>{item.label}</span>{item.id === 'tasks' && <span className="nav-count">{projects.reduce((sum, project) => sum + (project.task_count || 0), 0) || ''}</span>}</button>)}</nav>
      <div className="project-caption"><span>VOS PROJETS</span>{isManager && <button aria-label="Créer un projet" title="Créer un projet" onClick={() => setPage('projects')}><Icon name="plus" size={16} /></button>}</div>
      <div className="sidebar-projects">{projects.slice(0, 6).map((project) => <button key={project.id} className={`sidebar-project ${projectFilter === String(project.id) ? 'selected' : ''}`} onClick={() => { setProjectFilter(String(project.id)); setPage('tasks') }}><span className="project-color-dot" style={{ '--project-color': project.color }} />{project.name}<span className="sidebar-project-count">{project.task_count || 0}</span></button>)}{projects.length === 0 && <span className="sidebar-empty">Vos projets apparaîtront ici.</span>}</div>
      {isManager && <button className="sidebar-new-project" onClick={() => setPage('projects')}><span className="new-project-icon"><Icon name="plus" size={15} /></span> Nouveau projet</button>}
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-orb"><Icon name="sparkle" size={17} /></div><strong>Tout avance ensemble.</strong><span>Un bon projet commence par une équipe alignée.</span><button onClick={() => setPage('projects')}>Voir les projets <Icon name="arrow" size={14} /></button></div><div className="sidebar-profile"><Avatar user={user} /><div><strong>{user.full_name}</strong><small>{roleLabels[user.role]}</small></div><button aria-label="Déconnexion" title="Déconnexion" className="icon-button logout-button" onClick={() => window.dispatchEvent(new CustomEvent('taskflow:logout'))}><Icon name="logout" size={17} /></button></div></div>
      <button className="sidebar-create-task" onClick={() => projects.length ? onCreateTask() : setPage('projects')} disabled={!isManager}><Icon name="plus" size={17} /> Nouvelle tâche</button>
    </aside>
  )
}

function Avatar({ user, size = 'normal' }) {
  return <span className={`avatar avatar-${size}`} title={user?.full_name} style={{ '--avatar-color': user?.avatar_color || '#e8e5fb' }}>{initials(user?.full_name)}</span>
}

function Header({ user, page, search, setSearch, notifications, onRead, onReadAll, onLogout }) {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const unread = notifications.filter((item) => !item.read_at).length
  const pageLabels = { overview: 'Vue d’ensemble', tasks: 'Tâches', projects: 'Projets', team: 'Équipe' }
  return <header className="topbar"><div className="topbar-mobile-user"><span className="brand-mark"><Icon name="check" size={18} /></span><span className="brand-word">taskflow<span>.</span></span></div><div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={15} /><strong>{pageLabels[page] || 'Vue d’ensemble'}</strong></div><div className="topbar-actions"><label className="global-search"><Icon name="search" size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une tâche…" /><kbd>⌘ K</kbd></label><div className="notification-wrap"><button className={`icon-button notification-button ${open ? 'selected' : ''}`} aria-label="Notifications" onClick={() => setOpen(!open)}><Icon name="bell" size={19} />{unread > 0 && <i>{unread > 9 ? '9+' : unread}</i>}</button>{open && <><button className="click-away" aria-label="Fermer les notifications" onClick={() => setOpen(false)} /><div className="notification-popover"><div className="notification-head"><div><strong>Notifications</strong><small>{unread ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}</small></div>{unread > 0 && <button onClick={onReadAll}>Tout lire</button>}</div><div className="notification-list">{notifications.length ? notifications.map((item) => <button className={`notification-item ${!item.read_at ? 'unread' : ''}`} key={item.id} onClick={() => { onRead(item); setOpen(false) }}><span className={`notification-dot ${item.kind}`} /><span><strong>{item.message}</strong><small>{formatDate(item.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></span></button>) : <div className="notification-empty"><span>✦</span><strong>Vous êtes à jour</strong><small>Les nouvelles échéances apparaîtront ici.</small></div>}</div></div></>}</div><div className="topbar-divider" /><div className="profile-menu-wrap"><button className="header-user" aria-label="Menu utilisateur" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}><Avatar user={user} /><span><strong>{user.full_name}</strong><small>{roleLabels[user.role]}</small></span><span className="user-menu-chevron">⌄</span></button>{profileOpen && <><button className="click-away" aria-label="Fermer le menu utilisateur" onClick={() => setProfileOpen(false)} /><div className="profile-popover"><div className="profile-popover-user"><Avatar user={user} /><span><strong>{user.full_name}</strong><small>{user.email}</small></span></div><button onClick={onLogout}><Icon name="logout" size={15} /> Se déconnecter</button></div></>}</div></div></header>
}

function StatCard({ label, value, detail, icon, accent, trend }) {
  return <article className={`stat-card stat-${accent}`}><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon name={icon} size={18} /></span></div><div className="stat-number-row"><strong>{value}</strong>{trend && <span className="stat-trend">↗ {trend}</span>}</div><span className="stat-detail">{detail}</span><span className="stat-decoration" /></article>
}

function Dashboard({ dashboard, tasks, projects, user, onPage, onTaskStatus, canManage, onEditTask }) {
  const values = dashboard?.tasks?.by_status || {}
  const total = Math.max(dashboard?.tasks?.total || 0, 1)
  const todayText = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  const greeting = new Date().getHours() < 12 ? 'Bonjour' : 'Bonsoir'
  return <div className="page-content dashboard-page">
    <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> {todayText}</div><h1>{greeting}, {user.full_name.split(' ')[0]} <span className="wave">✳</span></h1><p>Voici ce qui se passe dans votre espace de travail.</p></div><button className="button button-secondary export-button" onClick={() => onPage('projects')}><Icon name="calendar" size={16} /> Voir le planning</button></div>
    <div className="stats-grid"><StatCard label="Projets actifs" value={dashboard?.projects?.active ?? 0} detail={`${dashboard?.projects?.total ?? 0} projets au total`} icon="folder" accent="purple" trend="en équipe" /><StatCard label="Tâches en cours" value={dashboard?.tasks?.in_progress ?? 0} detail={`${dashboard?.tasks?.total ?? 0} tâches dans votre espace`} icon="clock" accent="blue" /><StatCard label="Tâches terminées" value={dashboard?.tasks?.completed ?? 0} detail={`${dashboard?.tasks?.total ? Math.round((dashboard.tasks.completed / dashboard.tasks.total) * 100) : 0}% du travail accompli`} icon="check" accent="green" trend={dashboard?.tasks?.total ? `${Math.round((dashboard.tasks.completed / dashboard.tasks.total) * 100)}%` : undefined} /><StatCard label="En retard" value={dashboard?.tasks?.overdue ?? 0} detail={(dashboard?.tasks?.overdue ?? 0) ? 'À traiter en priorité' : 'Tout est dans les temps'} icon="calendar" accent="orange" /></div>
    <div className="dashboard-main-grid"><section className="panel progress-panel"><div className="panel-heading"><div><div className="eyebrow">VOTRE RYTHME</div><h2>Avancement des tâches</h2></div><button className="text-button" onClick={() => onPage('tasks')}>Toutes les tâches <Icon name="arrow" size={15} /></button></div><div className="progress-summary"><div><strong>{dashboard?.tasks?.total || 0}</strong><span>tâches au total</span></div><div className="progress-summary-right"><span className="progress-pulse" /> Mis à jour à l’instant</div></div><div className="stacked-progress" aria-label="Avancement global">{[['done', 'var(--green)'], ['in_progress', 'var(--blue)'], ['review', 'var(--amber)'], ['todo', 'var(--line-strong)']].map(([status, color]) => <span key={status} style={{ width: `${((values[status] || 0) / total) * 100}%`, background: color }} />)}</div><div className="legend-grid">{Object.entries(statusLabels).map(([status, label]) => <div className="legend-item" key={status}><span className={`legend-dot ${status}`} /><span>{label}</span><strong>{values[status] || 0}</strong></div>)}</div><div className="focus-note"><span className="focus-icon"><Icon name="sparkle" size={17} /></span><p><strong>Un petit pas après l’autre.</strong><br />Les progrès réguliers font les grandes réussites.</p><span className="focus-arrow">↗</span></div></section>
      <section className="panel projects-panel"><div className="panel-heading"><div><div className="eyebrow">EN ÉQUIPE</div><h2>Vos projets</h2></div><button className="round-link" aria-label="Tous les projets" onClick={() => onPage('projects')}><Icon name="arrow" size={16} /></button></div><div className="project-list">{projects.slice(0, 4).map((project) => <button className="project-list-item" key={project.id} onClick={() => onPage('projects')}><span className="project-symbol" style={{ '--project-color': project.color }}><Icon name="folder" size={17} /></span><span className="project-list-copy"><strong>{project.name}</strong><small>{project.completed_tasks || 0} sur {project.task_count || 0} tâches</small><span className="mini-progress"><i style={{ width: `${project.progress || 0}%`, background: project.color }} /></span></span><span className="project-percent">{project.progress || 0}%</span></button>)}{!projects.length && <EmptyState title="Aucun projet pour le moment" text="Un nouveau projet apparaîtra dans cet espace." />}</div><button className="project-list-footer" onClick={() => onPage('projects')}>Explorer les projets <Icon name="arrow" size={15} /></button></section></div>
    <section className="panel recent-panel"><div className="panel-heading"><div><div className="eyebrow">À NE PAS PERDRE DE VUE</div><h2>Tâches récentes</h2></div><button className="text-button" onClick={() => onPage('tasks')}>Voir toutes les tâches <Icon name="arrow" size={15} /></button></div><TaskTable tasks={tasks.slice(0, 5)} user={user} canManage={canManage} onStatus={onTaskStatus} onEdit={onEditTask} compact /></section>
  </div>
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><span className="empty-state-icon"><Icon name="sparkle" size={20} /></span><strong>{title}</strong><p>{text}</p></div>
}

function TaskTable({ tasks, user, canManage, onStatus, onEdit, compact = false, onDelete }) {
  if (!tasks.length) return <EmptyState title="Aucune tâche trouvée" text="Essayez de modifier vos filtres ou créez une nouvelle tâche." />
  return <div className={`task-table-wrap ${compact ? 'compact-table' : ''}`}><table className="task-table"><thead><tr><th>TÂCHE</th><th>PROJET</th><th>RESPONSABLE</th><th>ÉCHÉANCE</th><th>PRIORITÉ</th><th>STATUT</th>{canManage && <th aria-label="Actions" />}</tr></thead><tbody>{tasks.map((task) => { const late = task.is_overdue; const mayChangeStatus = canManage || (user.role === 'member' && task.assignee_id === user.id); return <tr key={task.id}><td><div className="task-title-cell"><span className={`task-checkbox ${task.status === 'done' ? 'checked' : ''}`}>{task.status === 'done' && '✓'}</span><span><strong>{task.title}</strong>{task.description && !compact && <small>{task.description}</small>}</span></div></td><td><span className="table-project"><i style={{ background: task.project.color }} />{task.project.name}</span></td><td>{task.assignee ? <span className="assignee-cell"><Avatar user={task.assignee} size="small" />{task.assignee.full_name.split(' ')[0]}</span> : <span className="unassigned">Non assignée</span>}</td><td><span className={`due-date ${late ? 'late' : ''}`}>{late && <span>!</span>}{formatDate(task.due_date)}</span></td><td><span className={`priority-pill priority-${task.priority}`}><i />{priorityLabels[task.priority]}</span></td><td>{mayChangeStatus ? <select className={`status-select status-${task.status}`} aria-label={`Statut : ${task.title}`} value={task.status} onChange={(e) => onStatus(task, e.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <span className={`status-pill status-${task.status}`}><i />{statusLabels[task.status]}</span>}</td>{canManage && <td><div className="row-actions"><button className="icon-button row-action" aria-label="Modifier la tâche" onClick={() => onEdit(task)}><Icon name="edit" size={15} /></button>{onDelete && <button className="icon-button row-action danger-action" aria-label="Supprimer la tâche" onClick={() => onDelete(task)}><Icon name="trash" size={15} /></button>}</div></td>}</tr>})}</tbody></table></div>
}

function TaskPage({ tasks, projects, users, user, filters, setFilters, canManage, onTaskStatus, onEditTask, onDeleteTask, onCreateTask, search, setSearch }) {
  const filtered = useMemo(() => tasks.filter((task) => {
    const needle = `${task.title} ${task.description} ${task.project.name} ${task.assignee?.full_name || ''}`.toLowerCase()
    return (!search || needle.includes(search.toLowerCase())) && (!filters.project_id || String(task.project_id) === filters.project_id) && (!filters.assignee_id || String(task.assignee_id) === filters.assignee_id) && (!filters.status || task.status === filters.status) && (!filters.priority || task.priority === filters.priority) && (!filters.due_from || (task.due_date && task.due_date >= filters.due_from)) && (!filters.due_to || (task.due_date && task.due_date <= filters.due_to))
  }), [tasks, search, filters])
  return <div className="page-content inner-page"><PageHeading eyebrow="ORGANISATION" title="Toutes les tâches" subtitle="Retrouvez votre travail et gardez le cap sur chaque échéance." action={canManage && projects.length > 0 && <button className="button button-primary" onClick={onCreateTask}><Icon name="plus" size={17} /> Nouvelle tâche</button>} /><section className="panel full-panel"><div className="filter-bar"><div className="filter-label"><Icon name="filter" size={16} /> Filtrer par</div><select value={filters.project_id} onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}><option value="">Tous les projets</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select><select value={filters.assignee_id} onChange={(e) => setFilters({ ...filters, assignee_id: e.target.value })}><option value="">Toute l’équipe</option>{users.filter((item) => item.role !== 'admin').map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Tous les statuts</option>{Object.entries(statusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option value="">Toutes les priorités</option>{Object.entries(priorityLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><label className="date-filter">Du <input aria-label="Échéance à partir du" type="date" value={filters.due_from} onChange={(e) => setFilters({ ...filters, due_from: e.target.value })} /></label><label className="date-filter">Au <input aria-label="Échéance jusqu’au" type="date" value={filters.due_to} onChange={(e) => setFilters({ ...filters, due_to: e.target.value })} /></label><button className="clear-filters" onClick={() => { setFilters({ project_id: '', assignee_id: '', status: '', priority: '', due_from: '', due_to: '' }); setSearch('') }}>Effacer</button></div><div className="table-title-row"><div><h2>Liste des tâches</h2><span>{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span></div><label className="table-search"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Chercher un titre, un projet…" /></label></div><TaskTable tasks={filtered} user={user} canManage={canManage} onStatus={onTaskStatus} onEdit={onEditTask} onDelete={canManage ? onDeleteTask : undefined} /></section></div>
}

function ProjectCard({ project, canManage, onEdit, onDelete, onMembers }) {
  const members = project.members || []
  return <article className="project-card"><div className="project-card-top"><span className="project-symbol large-symbol" style={{ '--project-color': project.color }}><Icon name="folder" size={20} /></span><span className={`project-state ${project.status}`}>{projectStatusLabels[project.status]}</span>{canManage && <button className="icon-button project-more" aria-label="Modifier le projet" onClick={() => onEdit(project)}><Icon name="more" size={19} /></button>}</div><h3>{project.name}</h3><p className="project-card-description">{project.description || 'Un espace pour faire avancer les idées.'}</p><div className="project-card-meta"><span><Icon name="check" size={15} /> {project.completed_tasks || 0}/{project.task_count || 0} tâches</span><span><Icon name="calendar" size={15} /> {formatDate(project.due_date)}</span></div><div className="project-progress-line"><span><i style={{ width: `${project.progress || 0}%`, background: project.color }} /></span><strong>{project.progress || 0}%</strong></div><div className="project-card-footer"><div className="avatar-stack">{members.slice(0, 4).map((member) => <Avatar user={member} size="tiny" key={member.id} />)}{members.length > 4 && <span className="avatar avatar-tiny avatar-overflow">+{members.length - 4}</span>}{!members.length && <span className="no-members">Aucun membre</span>}</div><button className="project-open" onClick={() => onMembers(project)}>{canManage ? 'Gérer l’équipe' : 'Voir le projet'} <Icon name="arrow" size={14} /></button></div>{canManage && <div className="project-card-actions"><button onClick={() => onMembers(project, 'task')}><Icon name="plus" size={14} /> Nouvelle tâche</button><button onClick={() => onEdit(project)}><Icon name="edit" size={14} /> Modifier</button><button className="danger-text" onClick={() => onDelete(project)}><Icon name="trash" size={14} /> Supprimer</button></div>}</article>
}

function ProjectsPage({ projects, users, user, canManage, search, setSearch, onCreate, onEdit, onDelete, onMembers }) {
  const [status, setStatus] = useState('all')
  const visible = projects.filter((project) => (status === 'all' || project.status === status) && `${project.name} ${project.description}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page-content inner-page"><PageHeading eyebrow="VOTRE ESPACE DE TRAVAIL" title="Des projets qui avancent." subtitle="Chaque équipe, ses objectifs et un chemin clair pour y arriver." action={canManage && <button className="button button-primary" onClick={onCreate}><Icon name="plus" size={17} /> Créer un projet</button>} /><div className="project-toolbar"><div className="segmented-tabs">{[['all', 'Tous'], ['active', 'En cours'], ['completed', 'Terminés'], ['archived', 'Archivés']].map(([key, label]) => <button className={status === key ? 'selected' : ''} onClick={() => setStatus(key)} key={key}>{label}<span>{key === 'all' ? projects.length : projects.filter((item) => item.status === key).length}</span></button>)}</div><label className="project-search"><Icon name="search" size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un projet" /></label></div><div className="project-grid">{visible.map((project) => <ProjectCard key={project.id} project={project} canManage={canManage} onEdit={onEdit} onDelete={onDelete} onMembers={onMembers} />)}{!visible.length && <div className="panel project-empty"><EmptyState title="Aucun projet ne correspond" text={canManage ? 'Créez votre premier projet ou ajustez la recherche.' : 'Votre équipe vous ajoutera à ses prochains projets.'} />{canManage && <button className="button button-secondary" onClick={onCreate}><Icon name="plus" size={16} /> Créer un projet</button>}</div>}</div></div>
}

function TeamPage({ users, onUpdateUser, user }) {
  return <div className="page-content inner-page"><PageHeading eyebrow="COLLABORATION" title="L’équipe au complet." subtitle="Les bonnes personnes, réunies autour des bons projets." /><section className="panel full-panel team-panel"><div className="team-heading"><div><h2>Annuaire de l’équipe</h2><span>{users.filter((item) => item.is_active).length} membres actifs</span></div><div className="team-avatar-stack">{users.filter((item) => item.is_active).slice(0, 5).map((item) => <Avatar user={item} size="small" key={item.id} />)}<span className="team-count">+{Math.max(0, users.filter((item) => item.is_active).length - 5)}</span></div></div><div className="team-list"><div className="team-list-head"><span>MEMBRE</span><span>RÔLE</span><span>REJOINT LE</span><span>STATUT</span></div>{users.map((member) => <div className={`team-row ${!member.is_active ? 'inactive-member' : ''}`} key={member.id}><div className="team-person"><Avatar user={member} /><span><strong>{member.full_name}{member.id === user.id && <em>Vous</em>}</strong><small>{member.email}</small></span></div><div>{user.role === 'admin' && member.id !== user.id ? <select className="role-select" value={member.role} onChange={(e) => onUpdateUser(member, { role: e.target.value })}>{Object.entries(roleLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select> : <span className={`role-badge role-${member.role}`}>{roleLabels[member.role]}</span>}</div><span className="team-date">{formatDate(member.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span><span className={`member-state ${member.is_active ? 'active' : 'inactive'}`}><i />{member.is_active ? 'Actif' : 'Désactivé'}{user.role === 'admin' && member.id !== user.id && <button className="member-toggle" onClick={() => onUpdateUser(member, { is_active: !member.is_active })}>{member.is_active ? 'Désactiver' : 'Réactiver'}</button>}</span></div>)}{!users.length && <EmptyState title="L’équipe vous attend" text="Invitez vos collaborateurs pour commencer à travailler ensemble." />}</div><div className="team-note"><Icon name="sparkle" size={16} /> Les comptes créés par inscription rejoignent l’équipe comme membres. Les administrateurs peuvent changer leur rôle.</div></section></div>
}

function PageHeading({ eyebrow, title, subtitle, action }) {
  return <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function Modal({ title, eyebrow, onClose, children, onSubmit, submitLabel = 'Enregistrer', busy = false, wide = false }) {
  useEffect(() => { function key(event) { if (event.key === 'Escape') onClose() }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><div className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div><h2 id="modal-title">{title}</h2></div><button className="icon-button modal-close" aria-label="Fermer" onClick={onClose}><Icon name="close" size={19} /></button></div><form onSubmit={onSubmit}>{children}<div className="modal-footer"><button type="button" className="button button-ghost" onClick={onClose}>Annuler</button><button className="button button-primary" disabled={busy}>{busy ? 'Enregistrement…' : submitLabel}<Icon name="arrow" size={16} /></button></div></form></section></div>
}

function ProjectForm({ project, users, onClose, onSave, busy }) {
  const [form, setForm] = useState({ name: project?.name || '', description: project?.description || '', color: project?.color || '#7868e6', status: project?.status || 'active', due_date: project?.due_date || '', member_ids: (project?.members || []).map((member) => member.id) })
  return <Modal eyebrow={project ? 'MISE À JOUR' : 'NOUVEAU PROJET'} title={project ? 'Faire évoluer le projet.' : 'Donner vie à une idée.'} onClose={onClose} onSubmit={(e) => { e.preventDefault(); onSave(form) }} submitLabel={project ? 'Enregistrer les changements' : 'Créer le projet'} busy={busy} wide><div className="modal-fields"><label className="field-full">Nom du projet<input required minLength="2" autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex. Refonte du site web" /></label><label className="field-full">Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Quel est l’objectif de ce projet ?" /></label><label>Échéance<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label><label>Couleur du projet<div className="color-input"><input aria-label="Couleur" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /><span>{form.color}</span></div></label>{project && <label>Statut<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(projectStatusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}<div className="field-full member-picker"><div className="member-picker-heading"><strong>Ajouter des membres</strong><span>{form.member_ids.length} sélectionné{form.member_ids.length > 1 ? 's' : ''}</span></div><div className="member-picker-list">{users.filter((member) => member.is_active && member.role !== 'admin').map((member) => <label className="member-option" key={member.id}><input type="checkbox" checked={form.member_ids.includes(member.id)} onChange={(e) => setForm({ ...form, member_ids: e.target.checked ? [...form.member_ids, member.id] : form.member_ids.filter((id) => id !== member.id) })} /><Avatar user={member} size="small" /><span><strong>{member.full_name}</strong><small>{roleLabels[member.role]}</small></span><i className="custom-check">✓</i></label>)}{users.filter((member) => member.is_active && member.role !== 'admin').length === 0 && <p className="member-picker-empty">Aucun autre membre disponible.</p>}</div></div></div></Modal>
}

function TaskForm({ task, projects, projectId, users, onClose, onSave, busy }) {
  const [form, setForm] = useState({ title: task?.title || '', description: task?.description || '', project_id: task?.project_id || projectId || projects[0]?.id || '', assignee_id: task?.assignee_id || '', priority: task?.priority || 'medium', status: task?.status || 'todo', due_date: task?.due_date || '' })
  return <Modal eyebrow={task ? 'MODIFICATION' : 'NOUVELLE TÂCHE'} title={task ? 'Ajuster les détails.' : 'Une nouvelle étape.'} onClose={onClose} onSubmit={(e) => { e.preventDefault(); onSave(form) }} submitLabel={task ? 'Enregistrer les changements' : 'Créer la tâche'} busy={busy} wide><div className="modal-fields"><label className="field-full">Titre de la tâche<input required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex. Préparer le lancement" /></label><label className="field-full">Description<textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Quelques détails pour l’équipe…" /></label><label>Projet<select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value, assignee_id: '' })} required disabled={Boolean(task)}>{projects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Responsable<select value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}><option value="">Non assignée</option>{users.filter((member) => member.is_active && member.role !== 'admin').map((member) => <option key={member.id} value={member.id}>{member.full_name}</option>)}</select><small className="field-help">Tout employé actif peut être choisi et sera ajouté au projet.</small></label><label>Priorité<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{Object.entries(priorityLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Échéance<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>{task && <label>Statut<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{Object.entries(statusLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}</div></Modal>
}

function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [page, setPage] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [notifications, setNotifications] = useState([])
  const [search, setSearch] = useState('')
  const [projectSearch, setProjectSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [filters, setFilters] = useState({ project_id: '', assignee_id: '', status: '', priority: '', due_from: '', due_to: '' })
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const canManage = user?.role === 'admin' || user?.role === 'project_manager'

  const loadWorkspace = useCallback(async () => {
    if (!user) return
    try {
      const [dashboardData, projectsData, tasksData, notificationData] = await Promise.all([
        api.get('/dashboard'), api.get('/projects'), api.get('/tasks'), api.get('/notifications'),
      ])
      setDashboard(dashboardData)
      setProjects(projectsData)
      setTasks(tasksData)
      setNotifications(notificationData.items || [])
      if (user.role === 'admin' || user.role === 'project_manager') setUsers(await api.get('/users'))
    } catch (error) {
      showToast(error.message, 'error')
    }
  }, [user])

  function showToast(message, kind = 'success') {
    setToast({ message, kind })
    window.setTimeout(() => setToast(null), 3600)
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setChecking(false); return }
    api.get('/auth/me').then((result) => setUser(result.user)).catch(() => { localStorage.removeItem('access_token'); setUser(null) }).finally(() => setChecking(false))
  }, [])

  useEffect(() => {
    if (user) loadWorkspace()
  }, [user, loadWorkspace])

  useEffect(() => {
    if (!user) return undefined
    const refreshNotifications = async () => {
      try {
        const result = await api.get('/notifications')
        setNotifications(result.items || [])
      } catch { /* Workspace refresh will surface API errors. */ }
    }
    const timer = window.setInterval(refreshNotifications, 60_000)
    return () => window.clearInterval(timer)
  }, [user])

  const signOut = useCallback(async () => {
    try { if (localStorage.getItem('access_token')) await api.post('/auth/logout') } catch { /* The local session is cleared even if the server is unreachable. */ }
    localStorage.removeItem('access_token')
    setUser(null); setProjects([]); setTasks([]); setDashboard(null); setNotifications([]); setPage('overview')
  }, [])

  useEffect(() => {
    const logout = () => signOut()
    window.addEventListener('taskflow:logout', logout)
    window.addEventListener('taskflow:session-expired', logout)
    return () => { window.removeEventListener('taskflow:logout', logout); window.removeEventListener('taskflow:session-expired', logout) }
  }, [signOut])

  async function changeTaskStatus(task, status) {
    try { await api.patch(`/tasks/${task.id}`, { status }); showToast('Statut de la tâche mis à jour.'); await loadWorkspace() }
    catch (error) { showToast(error.message, 'error') }
  }

  async function saveProject(values) {
    setBusy(true)
    try {
      const result = modal.project ? await api.patch(`/projects/${modal.project.id}`, values) : await api.post('/projects', values)
      const project = result.project
      if (modal.project) {
        const oldMembers = modal.project.members.map((member) => member.id)
        const selected = values.member_ids.filter((id) => id !== user.id)
        for (const memberId of selected.filter((id) => !oldMembers.includes(id))) await api.post(`/projects/${project.id}/members`, { user_id: memberId })
        for (const memberId of oldMembers.filter((id) => id !== user.id && !selected.includes(id))) await api.delete(`/projects/${project.id}/members/${memberId}`)
      }
      setModal(null); showToast(modal.project ? 'Projet mis à jour.' : 'Projet créé.'); await loadWorkspace()
    } catch (error) { showToast(error.message, 'error') } finally { setBusy(false) }
  }

  async function deleteProject(project) {
    if (!window.confirm(`Supprimer le projet « ${project.name} » et ses tâches ?`)) return
    try { await api.delete(`/projects/${project.id}`); showToast('Projet supprimé.'); await loadWorkspace() } catch (error) { showToast(error.message, 'error') }
  }

  async function saveTask(values) {
    setBusy(true)
    try {
      const body = { ...values, project_id: Number(values.project_id), assignee_id: values.assignee_id ? Number(values.assignee_id) : null }
      if (modal.task) await api.patch(`/tasks/${modal.task.id}`, body)
      else await api.post('/tasks', body)
      setModal(null); showToast(modal.task ? 'Tâche mise à jour.' : 'Tâche créée.'); await loadWorkspace()
    } catch (error) { showToast(error.message, 'error') } finally { setBusy(false) }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Supprimer la tâche « ${task.title} » ?`)) return
    try { await api.delete(`/tasks/${task.id}`); showToast('Tâche supprimée.'); await loadWorkspace() } catch (error) { showToast(error.message, 'error') }
  }

  async function updateUser(target, changes) {
    try { await api.patch(`/users/${target.id}`, changes); showToast('Profil mis à jour.'); await loadWorkspace() } catch (error) { showToast(error.message, 'error') }
  }

  async function markRead(item) {
    if (item.read_at) return
    try { await api.patch(`/notifications/${item.id}/read`, {}); setNotifications((items) => items.map((notification) => notification.id === item.id ? { ...notification, read_at: new Date().toISOString() } : notification)) } catch (error) { showToast(error.message, 'error') }
  }

  async function markAllRead() {
    try { await api.patch('/notifications/read-all', {}); setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() }))) } catch (error) { showToast(error.message, 'error') }
  }

  if (checking) return <main className="loading-screen"><span className="loading-mark"><Icon name="check" size={22} /></span><span>Taskflow</span></main>
  if (!user) return <AuthScreen onAuthenticated={setUser} />

  const dashboardTasks = dashboard?.recent_tasks || []
  return <div className="app-shell"><Sidebar user={user} page={page} setPage={setPage} projects={projects} onCreateTask={() => setModal({ type: 'task' })} projectFilter={projectFilter} setProjectFilter={setProjectFilter} /><main className="main-area"><Header user={user} page={page} search={search} setSearch={setSearch} notifications={notifications} onRead={markRead} onReadAll={markAllRead} onLogout={signOut} />{page === 'overview' && <Dashboard dashboard={dashboard} tasks={dashboardTasks} projects={dashboard?.projects_list || projects} user={user} onPage={setPage} onTaskStatus={changeTaskStatus} canManage={canManage} onEditTask={(task) => setModal({ type: 'task', task })} />}{page === 'tasks' && <TaskPage tasks={tasks} projects={projects} users={users} user={user} filters={{ ...filters, project_id: projectFilter || filters.project_id }} setFilters={(next) => { setFilters(next); if (projectFilter && next.project_id !== projectFilter) setProjectFilter('') }} canManage={canManage} onTaskStatus={changeTaskStatus} onEditTask={(task) => setModal({ type: 'task', task })} onDeleteTask={deleteTask} onCreateTask={() => setModal({ type: 'task' })} search={search} setSearch={setSearch} />}{page === 'projects' && <ProjectsPage projects={projects} users={users} user={user} canManage={canManage} search={projectSearch} setSearch={setProjectSearch} onCreate={() => setModal({ type: 'project' })} onEdit={(project) => setModal({ type: 'project', project })} onDelete={deleteProject} onMembers={(project, action) => action === 'task' ? setModal({ type: 'task', projectId: project.id }) : canManage ? setModal({ type: 'project', project }) : (setProjectFilter(String(project.id)), setPage('tasks'))} />}{page === 'team' && <TeamPage users={users} onUpdateUser={updateUser} user={user} />}</main>{modal?.type === 'project' && <ProjectForm project={modal.project} users={users} onClose={() => setModal(null)} onSave={saveProject} busy={busy} />}{modal?.type === 'task' && <TaskForm task={modal.task} projects={projects} projectId={modal.projectId} users={users} onClose={() => setModal(null)} onSave={saveTask} busy={busy} />}{toast && <div className={`toast toast-${toast.kind}`}><span>{toast.kind === 'error' ? '!' : '✓'}</span>{toast.message}<button onClick={() => setToast(null)} aria-label="Fermer"><Icon name="close" size={15} /></button></div>}</div>
}

export default App
