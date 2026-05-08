import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api'

const NAV = [
  { to: '/upload',      icon: UploadIcon,  label: '데이터 업로드', step: 1 },
  { to: '/model-lab',   icon: FlaskIcon,   label: 'Model Lab',     step: 2 },
  { to: '/xai',         icon: EyeIcon,     label: 'XAI 설명',      step: 3 },
  { to: '/maintenance', icon: WrenchIcon,  label: 'Maintenance',   step: 4 },
  { to: '/history',     icon: ChartIcon,   label: '실험 기록',      step: 5 },
  { to: '/report',      icon: DocIcon,     label: '보고서',         step: 6 },
]

export default function Sidebar() {
  const [state, setState] = useState({})

  useEffect(() => {
    const fetch = () => api.get('/state').then(r => setState(r.data)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 3000)
    return () => clearInterval(id)
  }, [])

  const step = state.has_model ? 3 : state.has_data ? 2 : 1

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col border-r border-bg-border bg-white">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-bg-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm leading-tight">FailureAI</div>
            <div className="text-xs text-slate-400 mt-0.5">설비 고장 예측 시스템</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-semibold text-slate-300 uppercase tracking-widest">워크플로우</p>
        {NAV.map(({ to, icon: Icon, label, step: s }) => {
          const done   = s < step
          const locked = s > step + 1
          return (
            <NavLink key={to} to={to}
              className={({ isActive }) => {
                const base = 'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 '
                if (isActive) return base + 'bg-primary text-white shadow-sm'
                if (locked)   return base + 'opacity-40 cursor-not-allowed pointer-events-none text-slate-400'
                return base + 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }}>
              {({ isActive }) => (
                <>
                  <span className={`flex-shrink-0 w-4 h-4 ${isActive ? 'text-white' : done ? 'text-emerald' : 'text-slate-400 group-hover:text-slate-600'}`}>
                    {done && !isActive ? <CheckIcon /> : <Icon />}
                  </span>
                  <span className="flex-1 leading-none">{label}</span>
                  {done && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald flex-shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Status */}
      <div className="m-3 rounded-xl border border-bg-border overflow-hidden bg-bg-elevated">
        <div className="px-4 py-2.5 border-b border-bg-border">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">시스템 상태</p>
        </div>
        <div className="px-4 py-3 space-y-2.5">
          <StatusRow label="데이터셋"  active={state.has_data}
            value={state.data_shape ? `${state.data_shape[0].toLocaleString()} 행` : '미업로드'} />
          <StatusRow label="학습 모델" active={state.has_model}
            value={state.best_model ? state.best_model.split(' ')[0] : '없음'} />
          {state.cv_results && (
            <StatusRow label="ROC-AUC" active={true}
              value={state.cv_results[0]?.roc_auc ?? '—'} accent />
          )}
        </div>
      </div>
    </aside>
  )
}

function StatusRow({ label, active, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald' : 'bg-slate-300'}`} />
        <span className="text-xs text-slate-500 truncate">{label}</span>
      </div>
      <span className={`text-xs font-semibold flex-shrink-0 ${
        accent ? 'text-primary' : active ? 'text-slate-700' : 'text-slate-400'
      }`}>{value}</span>
    </div>
  )
}

function UploadIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
}
function FlaskIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M9 3h6m-6 0v6l-6 12a1 1 0 00.9 1.4h12.2a1 1 0 00.9-1.4L15 9V3"/>
  </svg>
}
function EyeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
}
function WrenchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
}
function ChartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
}
function DocIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
    <polyline points="20,6 9,17 4,12"/>
  </svg>
}
