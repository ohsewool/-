import { useState, useEffect } from 'react'
import api from '../api'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

const ttStyle = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:11, color:'#0f172a', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }
const riskColor = p => p >= 0.8 ? '#f43f5e' : p >= 0.5 ? '#f59e0b' : '#10b981'

export default function Maintenance() {
  const [data,    setData]    = useState(null)
  const [state,   setState]   = useState(null)
  const [topN,    setTopN]    = useState(10)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get('/state').then(r => setState(r.data)) }, [])

  async function load() {
    setLoading(true)
    try { const { data } = await api.get('/predictions'); setData(data) }
    catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  if (!state?.has_model) return (
    <div className="p-8 flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <span className="text-4xl">🔧</span>
        </div>
        <p className="text-slate-800 font-semibold mb-2">모델 없음</p>
        <p className="text-slate-500 text-sm">먼저 Model Lab에서 모델을 학습해주세요.</p>
      </div>
    </div>
  )

  const risk = data?.risk_items?.slice(0, topN) || []

  return (
    <div className="p-8 animate-fade-in max-w-6xl">
      {!data ? (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span className="text-4xl">🏭</span>
          </div>
          <p className="empty-title">설비 리스크를 분석합니다</p>
          <p className="empty-desc mb-6">버튼을 클릭하면 전체 설비의 고장 확률을 계산합니다</p>
          <button onClick={load} disabled={loading} className="btn-primary">
            {loading ? <span className="spinner" /> : '🔄'}
            분석 시작
          </button>
        </div>
      ) : (
        <div className="space-y-5 animate-slide-up">
          {/* KPI */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="전체 설비"  value={data.total.toLocaleString()} icon="🏭" color="blue" />
            <KPICard label="고장 예측"  value={data.failure_count.toLocaleString()}
              sub={`전체의 ${data.failure_rate}%`} icon="⚠️" color="red" />
            <KPICard label="고위험 ≥80%" value={data.high_risk} icon="🔴" color="red" />
            <KPICard label="Accuracy"  value={data.accuracy} icon="✅" color="green" />
          </div>

          <div className="grid grid-cols-3 gap-5">
            {/* 위험 바차트 */}
            <div className="card col-span-2">
              <div className="flex items-center justify-between mb-5">
                <p className="section-title m-0">위험 설비 Top {topN}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">{Math.min(5, data.risk_items.length)}</span>
                  <input type="range" min={5} max={Math.min(50, data.risk_items.length)} value={topN}
                    onChange={e => setTopN(+e.target.value)}
                    className="w-24 accent-primary cursor-pointer" />
                  <span className="text-xs text-slate-600">{Math.min(50, data.risk_items.length)}</span>
                </div>
              </div>
              {risk.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-emerald gap-2">
                  <span className="text-3xl">✅</span>
                  <p className="font-semibold">고장 예측 설비 없음</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={risk} barSize={18}>
                    <XAxis dataKey="id" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}
                      label={{ value:'설비 ID', position:'insideBottom', fill:'#475569', fontSize:10 }} />
                    <YAxis domain={[0,1]} tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={ttStyle} formatter={v => [`${(v*100).toFixed(1)}%`, '고장 확률']} />
                    <Bar dataKey="probability" radius={[5,5,0,0]}>
                      {risk.map((r,i) => <Cell key={i} fill={riskColor(r.probability)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 파이차트 */}
            <div className="card flex flex-col">
              <p className="section-title">예측 분포</p>
              <div className="flex-1 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[
                      { name:'정상', value: data.total - data.failure_count, fill:'#4f7ef8' },
                      { name:'고장', value: data.failure_count, fill:'#f43f5e' },
                    ]} cx="50%" cy="50%" innerRadius={52} outerRadius={76}
                      dataKey="value" stroke="none" />
                    <Tooltip contentStyle={ttStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-2">
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 justify-center mb-1">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-xs text-slate-500">정상</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{(data.total - data.failure_count).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 justify-center mb-1">
                      <span className="w-2 h-2 rounded-full bg-rose" />
                      <span className="text-xs text-slate-500">고장</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800">{data.failure_count.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 정비 카드 */}
          {risk.length > 0 && (
            <div>
              <p className="section-title">정비 우선순위 추천</p>
              <div className="grid grid-cols-2 gap-3">
                {risk.slice(0,6).map((r) => {
                  const p = r.probability
                  const level = p >= 0.8 ? 'high' : p >= 0.5 ? 'mid' : 'low'
                  const cfg = {
                    high: { border: 'rgba(244,63,94,0.25)',  bg: 'rgba(244,63,94,0.06)',  badge: 'badge-red',   label:'긴급',  action:'즉시 점검 및 가동 중단 검토', dot: '#f43f5e' },
                    mid:  { border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.06)', badge: 'badge-amber', label:'주의',  action:'이번 주 내 점검 권장',         dot: '#f59e0b' },
                    low:  { border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.06)', badge: 'badge-green', label:'관찰',  action:'다음 정기 점검 시 확인',       dot: '#10b981' },
                  }[level]
                  return (
                    <div key={r.id} className="rounded-2xl p-5 border transition-all duration-200 hover:scale-[1.01]"
                      style={{ background: cfg.bg, borderColor: cfg.border }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }} />
                          <span className="font-bold text-white text-sm">설비 #{r.id}</span>
                        </div>
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width:`${p*100}%`, background: riskColor(p), boxShadow: `0 0 8px ${riskColor(p)}` }} />
                        </div>
                        <span className="text-sm font-bold text-white tabular-nums w-10 text-right">{(p*100).toFixed(1)}%</span>
                      </div>
                      <p className="text-xs text-slate-500">📌 {cfg.action}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 에이전트 가이드 */}
          <div className="card" style={{ borderColor: 'rgba(34,211,238,0.2)', background: 'linear-gradient(135deg, #0b1120, rgba(34,211,238,0.03))' }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
                <span className="text-lg">🤖</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white mb-1">에이전트 실험 가이드</p>
                <p className="text-sm text-slate-500 mb-3">
                  현재 모델: <span className="text-white font-medium">{state?.best_model}</span>
                  {state?.cv_results && (
                    <span className="ml-2 badge badge-blue">ROC-AUC {state.cv_results[0]?.roc_auc}</span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    '피처 엔지니어링: 온도 차이·마모율 등 파생 변수 추가',
                    'class_weight="balanced" 또는 SMOTE로 클래스 불균형 처리',
                    '임계값 조정으로 고장 Recall 향상 (threshold 낮추기)',
                    '상위 2개 모델 Voting Classifier 앙상블 구성',
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-cyan text-xs mt-0.5 flex-shrink-0">→</span>
                      <p className="text-xs text-slate-400">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
