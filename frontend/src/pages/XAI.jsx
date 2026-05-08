import { useState, useEffect } from 'react'
import api from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const ttStyle = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:11, color:'#0f172a', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }

export default function XAI() {
  const [tab,     setTab]     = useState('global')
  const [global,  setGlobal]  = useState(null)
  const [local,   setLocal]   = useState(null)
  const [preds,   setPreds]   = useState(null)
  const [idx,     setIdx]     = useState(0)
  const [loading, setLoading] = useState('')

  useEffect(() => { api.get('/state').then(r => { if(!r.data.has_model) return }) }, [])

  async function runShap() {
    setLoading('shap')
    try {
      const { data } = await api.post('/run-shap')
      setGlobal(data.global); setTab('global')
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  async function fetchLocal() {
    setLoading('local')
    try {
      const { data } = await api.get(`/shap-local/${idx}`)
      setLocal(data)
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  async function fetchPreds() {
    setLoading('preds')
    try {
      const { data } = await api.get('/predictions')
      setPreds(data); setTab('wrong')
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  const TABS = [['global','전역 중요도'],['local','개별 설명'],['wrong','오분류']]

  return (
    <div className="p-8 animate-fade-in max-w-6xl">
      <div className="tab-bar w-fit mb-6">
        {TABS.map(([k, v]) => (
          <button key={k} onClick={() => setTab(k)}
            className={tab === k ? 'tab-item-active' : 'tab-item-inactive'}>
            {v}
          </button>
        ))}
      </div>

      {/* 전역 SHAP */}
      {tab === 'global' && (
        <div className="space-y-4 animate-fade-in">
          {!global ? (
            <div className="empty-state">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                style={{ background: 'rgba(79,126,248,0.1)', border: '1px solid rgba(79,126,248,0.2)' }}>
                <span className="text-3xl">🧮</span>
              </div>
              <p className="empty-title">SHAP 피처 중요도 계산</p>
              <p className="empty-desc mb-6">각 피처가 예측에 미치는 영향을 분석합니다</p>
              <button onClick={runShap} disabled={!!loading} className="btn-primary">
                {loading === 'shap' ? <span className="spinner" /> : '🧮'}
                SHAP 계산
              </button>
            </div>
          ) : (
            <div className="card animate-slide-up">
              <p className="section-title">전역 피처 중요도 (SHAP 평균 절댓값)</p>
              <ResponsiveContainer width="100%" height={Math.max(300, global.length * 38)}>
                <BarChart data={[...global].reverse()} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="feature" type="category" tick={{ fill:'#94a3b8', fontSize:11 }} width={140} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} />
                  <Bar dataKey="shap_value" radius={[0,5,5,0]}>
                    {global.map((_, i) => (
                      <Cell key={i} fill={`hsl(${210 + i*12}, 80%, ${65 - i*2}%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* 개별 설명 */}
      {tab === 'local' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">샘플 인덱스</label>
                <input type="number" value={idx} min={0} onChange={e => setIdx(+e.target.value)}
                  className="input w-32" />
              </div>
              <button onClick={fetchLocal} className="btn-primary" disabled={!!loading}>
                {loading === 'local' ? <span className="spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                )}
                설명 보기
              </button>
            </div>
          </div>

          {local && (
            <div className="space-y-4 animate-slide-up">
              <div className="grid grid-cols-3 gap-4">
                <div className="card text-center">
                  <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">예측 결과</p>
                  <p className={`text-2xl font-bold ${local.prediction===1 ? 'text-rose' : 'text-emerald'}`}>
                    {local.prediction === 1 ? '🔴 고장' : '🟢 정상'}
                  </p>
                </div>
                <div className="card text-center">
                  <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">정상 확률</p>
                  <p className="text-2xl font-bold text-emerald">{(local.probability[0]*100).toFixed(1)}%</p>
                </div>
                <div className="card text-center">
                  <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">고장 확률</p>
                  <p className="text-2xl font-bold text-rose">{(local.probability[1]*100).toFixed(1)}%</p>
                </div>
              </div>
              <div className="card">
                <p className="section-title">SHAP 기여도</p>
                <div className="flex gap-4 mb-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background:'#f43f5e' }} />고장 방향 (+)</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary" />정상 방향 (−)</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200, local.local.length * 34)}>
                  <BarChart data={[...local.local].reverse()} layout="vertical" barSize={14}>
                    <XAxis type="number" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="feature" type="category" tick={{ fill:'#94a3b8', fontSize:11 }} width={140} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="shap_value" radius={[0,5,5,0]}>
                      {[...local.local].reverse().map((d,i) => (
                        <Cell key={i} fill={d.shap_value > 0 ? '#f43f5e' : '#4f7ef8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 오분류 */}
      {tab === 'wrong' && (
        <div className="space-y-4 animate-fade-in">
          {!preds ? (
            <div className="empty-state">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
                <span className="text-3xl">❌</span>
              </div>
              <p className="empty-title">오분류 샘플 분석</p>
              <p className="empty-desc mb-6">모델이 잘못 예측한 샘플을 확인합니다</p>
              <button onClick={fetchPreds} disabled={!!loading} className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }}>
                {loading === 'preds' ? <span className="spinner" /> : '❌'}
                오분류 보기
              </button>
            </div>
          ) : preds.misclassified.length === 0 ? (
            <div className="card text-center py-16">
              <span className="text-4xl block mb-3">🎉</span>
              <p className="text-emerald font-semibold text-lg">오분류 샘플이 없습니다!</p>
              <p className="text-slate-500 text-sm mt-1">모든 샘플이 올바르게 분류되었습니다.</p>
            </div>
          ) : (
            <>
              <div className="banner-danger">
                <span className="text-lg">⚠️</span>
                <p className="text-slate-300 text-sm">
                  전체 <b className="text-white">{preds.total.toLocaleString()}</b>건 중
                  오분류 상위 <b className="text-rose">3건</b>을 표시합니다.
                </p>
              </div>
              {preds.misclassified.map((w, i) => (
                <div key={i} className="card border-rose/20 animate-slide-up"
                  style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="badge badge-red">오분류 #{i+1}</span>
                    <span className="text-xs text-slate-500">샘플 #{w.idx}</span>
                    <span className="text-xs text-slate-500 ml-auto">
                      실제 {w.actual} → 예측 {w.predicted} | 확률 {(w.probability*100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(w.features).slice(0,8).map(([k,v]) => (
                      <div key={k} className="card-elevated text-center rounded-xl p-3">
                        <p className="text-xs text-slate-500 truncate mb-1">{k}</p>
                        <p className="text-sm font-semibold text-white">{typeof v === 'number' ? v.toFixed(3) : v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
