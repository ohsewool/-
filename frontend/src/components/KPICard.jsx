const PALETTE = {
  blue:   { bg: 'bg-indigo-50',  border: 'border-indigo-100',  icon: 'bg-indigo-100 text-indigo-600',  val: 'text-indigo-700',  sub: 'text-indigo-500'  },
  green:  { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-100 text-emerald-600',val: 'text-emerald-700', sub: 'text-emerald-500' },
  red:    { bg: 'bg-rose-50',    border: 'border-rose-100',    icon: 'bg-rose-100 text-rose-600',      val: 'text-rose-700',    sub: 'text-rose-500'    },
  amber:  { bg: 'bg-amber-50',   border: 'border-amber-100',   icon: 'bg-amber-100 text-amber-600',    val: 'text-amber-700',   sub: 'text-amber-500'   },
  cyan:   { bg: 'bg-cyan-50',    border: 'border-cyan-100',    icon: 'bg-cyan-100 text-cyan-600',      val: 'text-cyan-700',    sub: 'text-cyan-500'    },
  violet: { bg: 'bg-violet-50',  border: 'border-violet-100',  icon: 'bg-violet-100 text-violet-600',  val: 'text-violet-700',  sub: 'text-violet-500'  },
}

export default function KPICard({ label, value, sub, color = 'blue', icon }) {
  const p = PALETTE[color] || PALETTE.blue
  return (
    <div className={`${p.bg} border ${p.border} rounded-2xl p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-bold tabular-nums leading-none ${p.val}`}>{value ?? '—'}</p>
          {sub && <p className={`text-xs mt-2 font-medium ${p.sub}`}>{sub}</p>}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${p.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
