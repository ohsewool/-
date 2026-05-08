import { useState, useEffect } from 'react'
import api from '../api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const ttStyle = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:11, color:'#0f172a', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }

export default function History() {
  const [history, setHistory] = useState([])
  const [state,   setState]   = useState(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    api.get('/history').then(r => setHistory(r.data))
    api.get('/state').then(r => setState(r.data))
  }
  useEffect(load, [])

  async function clearAll() {
    if (!confirm('전체 기록을 삭제할까요?')) return
    await api.delete('/history'); load()
  }

  async function rerun() {
    setLoading(true)
    try { await api.post('/run-cv'); load() }
    catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  const trend = [...history].reverse().map((h, i) => ({
    name: `#${i+1}`,
    roc:    h.results?.[0]?.roc_auc ?? 0,
    optuna: h.optuna_applied ? h.tuned_roc ?? h.results?.[0]?.roc_auc : null,
  }))

  const bestROC = history.length > 0
    ? Math.max(...history.map(h => h.results?.[0]?.roc_auc ?? 0))
    : 0

  return (
    <div className="p-8 animate-fade-in max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div /> {/* title is in header */}
        <div className="flex gap-2">
          {state?.has_data && (
            <button onClick={rerun} disabled={loading} className="btn-primary">
              {loading ? <span className="spinner" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5,3 19,12 5,21"/></svg>
              )}
              재실행
            </button>
          )}
          {history.length > 0 && (
            <button onClick={clearAll} className="btn-secondary text-rose-400 hover:text-rose-300 border-rose/20 hover:border-rose/30">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/></svg>
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'rgba(79,126,248,0.08)', border: '1px solid rgba(79,126,248,0.15)' }}>
            <span className="text-4xl">📭</span>
          </div>
          <p className="empty-title">저장된 실험 기록이 없습니다</p>
          <p className="empty-desc">Model Lab에서 모델을 실행하면 자동으로 저장됩니다.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:'#94a3b8' }}>총 실험 수</p>
              <p className="text-3xl font-bold text-slate-900">{history.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:'#94a3b8' }}>Optuna 적용</p>
              <p className="text-3xl font-bold text-amber">{history.filter(h=>h.optuna_applied).length}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color:'#94a3b8' }}>최고 ROC-AUC</p>
              <p className="text-3xl font-bold text-emerald">{bestROC.toFixed(4)}</p>
            </div>
          </div>

          {/* 추이 차트 */}
          {trend.length > 1 && (
            <div className="card">
              <p className="section-title">ROC-AUC 성능 추이</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto','auto']} tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} />
                  <Line type="monotone" dataKey="roc" stroke="#4f7ef8" strokeWidth={2.5}
                    dot={{ fill:'#4f7ef8', r:4, strokeWidth:2, stroke:'#ffffff' }} name="ROC-AUC" />
                  <Line type="monotone" dataKey="optuna" stroke="#f59e0b" strokeWidth={2}
                    dot={{ fill:'#f59e0b', r:4, strokeWidth:2, stroke:'#ffffff' }} name="Optuna"
                    connectNulls={false} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-3 justify-end">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-5 h-0.5 rounded bg-primary inline-block" />ROC-AUC
                </span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="w-5 h-0.5 rounded bg-amber inline-block" style={{ borderTop:'2px dashed #f59e0b', height:0 }} />Optuna
                </span>
              </div>
            </div>
          )}

          {/* 이력 테이블 */}
          <div className="card overflow-x-auto">
            <p className="section-title">전체 실험 이력</p>
            <table className="data-table">
              <thead>
                <tr>
                  {['#','시간','데이터','타깃','최고 모델','Accuracy','F1','ROC-AUC','Optuna'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h, i) => {
                  const br = h.results?.find(r => r.model === h.best_model) || {}
                  return (
                    <tr key={i}>
                      <td className="text-slate-600 text-xs">#{history.length-i}</td>
                      <td className="text-slate-400 text-xs whitespace-nowrap">{h.timestamp}</td>
                      <td className="text-slate-300 text-xs">{h.data_shape?.join('×')}</td>
                      <td className="text-slate-300 text-xs">{h.target || '—'}</td>
                      <td className="text-white font-medium text-xs">{h.best_model}</td>
                      <td className="text-slate-300 text-xs tabular-nums">{br.accuracy || '—'}</td>
                      <td className="text-slate-300 text-xs tabular-nums">{br.f1 || '—'}</td>
                      <td className="text-primary font-semibold text-xs tabular-nums">{br.roc_auc || '—'}</td>
                      <td>
                        {h.optuna_applied
                          ? <span className="badge badge-green">✓ 적용</span>
                          : <span className="text-xs text-slate-700">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
