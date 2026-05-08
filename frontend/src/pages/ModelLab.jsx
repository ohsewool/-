import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const MEDALS = ['🥇','🥈','🥉','']
const COLORS  = ['#4f7ef8','#10b981','#f59e0b','#8b5cf6']
const ttStyle = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:11, color:'#0f172a', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }

export default function ModelLab() {
  const [state,   setState]   = useState(null)
  const [result,  setResult]  = useState(null)
  const [optRes,  setOptRes]  = useState(null)
  const [nTrials, setNTrials] = useState(30)
  const [loading, setLoading] = useState('')
  const nav = useNavigate()

  useEffect(() => {
    api.get('/state').then(r => {
      setState(r.data)
      if (r.data.cv_results) setResult({ results: r.data.cv_results, best_model: r.data.best_model })
      if (r.data.optuna_result) setOptRes(r.data.optuna_result)
    })
  }, [])

  async function runCV() {
    setLoading('cv')
    try {
      const { data } = await api.post('/run-cv')
      setResult(data)
      api.get('/state').then(r => setState(r.data))
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  async function runOptuna() {
    setLoading('optuna')
    try {
      const { data } = await api.post('/run-optuna', { n_trials: nTrials })
      setOptRes(data)
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading('')
  }

  if (state && !state.has_data) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'rgba(79,126,248,0.1)', border: '1px solid rgba(79,126,248,0.2)' }}>
          <span className="text-4xl">📂</span>
        </div>
        <p className="text-slate-800 font-semibold mb-2">데이터가 없습니다</p>
        <p className="text-slate-500 text-sm mb-5">먼저 데이터를 업로드해주세요.</p>
        <button onClick={() => nav('/upload')} className="btn-primary">업로드 하러 가기</button>
      </div>
    </div>
  )

  const chartData = result?.results?.map(r => ({
    name: r.model.split(' ')[0], Accuracy: r.accuracy, F1: r.f1, 'ROC-AUC': r.roc_auc
  }))

  return (
    <div className="p-8 animate-fade-in max-w-6xl">

      {/* Run CV 카드 */}
      <div className="card mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 text-base">3-fold Stratified CV</p>
            <p className="text-xs text-slate-500 mt-1">Random Forest · Gradient Boosting · Logistic Regression · Decision Tree</p>
          </div>
          <button onClick={runCV} disabled={!!loading} className="btn-primary">
            {loading === 'cv' ? <span className="spinner" /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            )}
            실행
          </button>
        </div>

        {loading === 'cv' && (
          <div className="mt-5 space-y-2.5">
            {['Random Forest','Gradient Boosting','Logistic Regression','Decision Tree'].map((m, i) => (
              <div key={m} className="flex items-center gap-3">
                <div className="text-xs text-slate-500 w-36 flex-shrink-0">{m}</div>
                <div className="flex-1 progress-bar">
                  <div className="progress-fill animate-pulse" style={{ width:`${25*(i+1)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-5 animate-slide-up">
          {/* KPI */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="최고 모델" value={result.best_model?.split(' ')[0]} icon="🏆" color="blue" />
            <KPICard label="ROC-AUC"  value={result.results?.[0]?.roc_auc}     icon="📈" color="green" />
            <KPICard label="Accuracy" value={result.results?.[0]?.accuracy}     icon="✅" color="cyan" />
            <KPICard label="F1 Score" value={result.results?.[0]?.f1}           icon="⚡" color="amber" />
          </div>

          {/* Leaderboard */}
          <div className="card">
            <p className="section-title">리더보드</p>
            <div className="space-y-2">
              {result.results.map((r, i) => (
                <div key={r.model}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-150
                    ${i === 0
                      ? 'border-primary/30'
                      : 'border-bg-border hover:border-bg-border/50'}`}
                  style={i === 0 ? {
                    background: 'linear-gradient(135deg, rgba(79,70,229,0.06) 0%, rgba(124,58,237,0.03) 100%)',
                    boxShadow: '0 0 0 1px rgba(79,70,229,0.15)',
                  } : { background: '#f8fafc' }}>
                  <span className="text-xl w-8 text-center">{MEDALS[Math.min(i,3)]}</span>
                  <span className={`flex-1 font-medium text-sm ${i === 0 ? 'text-white' : 'text-slate-300'}`}>{r.model}</span>
                  {[['Accuracy', r.accuracy],['F1', r.f1],['ROC-AUC', r.roc_auc]].map(([k,v]) => (
                    <div key={k} className="text-center w-20">
                      <p className="text-xs text-slate-600 mb-0.5">{k}</p>
                      <p className={`font-bold text-sm ${i===0 && k==='ROC-AUC' ? 'text-primary' : 'text-slate-800'}`}>{v}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-5">
            <div className="card">
              <p className="section-title">성능 비교</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={14} barGap={4}>
                  <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,1]} tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={ttStyle} cursor={{ fill:'rgba(255,255,255,0.03)' }} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#64748b' }} />
                  {['Accuracy','F1','ROC-AUC'].map((k,i) => (
                    <Bar key={k} dataKey={k} fill={COLORS[i]} radius={[4,4,0,0]} opacity={0.9} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {result.feature_importance?.length > 0 && (
              <div className="card">
                <p className="section-title">피처 중요도 Top 8</p>
                <div className="space-y-2.5 mt-1">
                  {result.feature_importance.slice(0,8).map((f, i) => (
                    <div key={f.feature} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-28 truncate flex-shrink-0">{f.feature}</span>
                      <div className="flex-1 progress-bar">
                        <div className="progress-fill" style={{ width:`${f.importance*100}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-9 text-right flex-shrink-0">
                        {(f.importance*100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Optuna */}
          <div className="card" style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'linear-gradient(135deg, #0b1120, rgba(245,158,11,0.04))' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-white">⚡ Optuna 하이퍼파라미터 튜닝</p>
                <p className="text-xs text-slate-500 mt-0.5">최고 모델 ({result.best_model}) 자동 최적화</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">trials</span>
                  <input type="number" value={nTrials} min={10} max={100}
                    onChange={e => setNTrials(+e.target.value)}
                    className="input w-16 text-center" />
                </div>
                <button onClick={runOptuna} disabled={!!loading}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(245,158,11,0.3)' }}>
                  {loading === 'optuna' ? <span className="spinner" /> : '⚡'}
                  튜닝
                </button>
              </div>
            </div>

            {optRes && (
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-bg-border animate-slide-up">
                <KPICard label="튜닝 전 ROC-AUC" value={optRes.before_roc} color="cyan" />
                <KPICard label="튜닝 후 ROC-AUC" value={optRes.after_roc}
                  sub={`+${optRes.improvement}% 개선`} color="green" icon="✨" />
                <KPICard label="최적 파라미터" value={Object.keys(optRes.best_params).length + '개'} color="amber" />
                <div className="col-span-3 rounded-xl p-4 border border-bg-border" style={{ background: '#0f1826' }}>
                  <p className="text-xs text-slate-500 mb-2.5 font-semibold uppercase tracking-wider">최적 파라미터</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(optRes.best_params).map(([k,v]) => (
                      <span key={k} className="badge badge-amber text-xs">{k}: {String(v)}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => nav('/xai')} className="btn-primary w-full justify-center py-3.5">
            XAI 설명 보기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
