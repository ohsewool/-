import { useState, useEffect } from 'react'
import api from '../api'

const ITEMS = [
  ['🗂️', '데이터 요약', '샘플 수, 피처 수, 고장률, 결측치'],
  ['🏆', '모델 성능 비교', '4개 모델 Accuracy / F1 / ROC-AUC'],
  ['📈', '최고 모델 상세', '교차검증 상세 지표'],
  ['⚡', 'Optuna 튜닝 결과', '튜닝 전후 성능 비교'],
  ['🔍', 'SHAP 피처 중요도', '전역 피처 중요도 순위'],
  ['🔧', '정비 우선순위', '고장 예측 설비 Top 10'],
]

export default function Report() {
  const [state,   setState]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { api.get('/state').then(r => setState(r.data)) }, [])

  async function downloadReport() {
    setLoading(true)
    try {
      const res = await api.get('/report/html', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }))
      const a = document.createElement('a'); a.href = url; a.download = 'FailureAI_Report.html'; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  const ready = state?.has_model

  return (
    <div className="p-8 animate-fade-in max-w-6xl">
      {!ready ? (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'rgba(79,126,248,0.08)', border: '1px solid rgba(79,126,248,0.15)' }}>
            <span className="text-4xl">📋</span>
          </div>
          <p className="empty-title">보고서를 생성하려면 모델 학습이 필요합니다</p>
          <p className="empty-desc">Model Lab에서 CV 실행 후 다시 오세요.</p>
        </div>
      ) : (
        <div className="space-y-5 animate-slide-up">
          {/* Hero card */}
          <div className="card relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(79,126,248,0.1) 0%, rgba(34,211,238,0.05) 100%)',
              borderColor: 'rgba(79,126,248,0.25)',
              boxShadow: '0 0 40px rgba(79,126,248,0.08)',
            }}>
            <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none"
              style={{ background: 'radial-gradient(circle, #4f7ef8 0%, transparent 70%)' }} />
            <div className="relative flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f7ef8 0%, #22d3ee 100%)', boxShadow: '0 4px 16px rgba(79,126,248,0.4)' }}>
                <span className="text-2xl">📊</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg mb-1">분석 보고서 준비 완료</p>
                <p className="text-slate-400 text-sm mb-5">
                  최고 모델 <span className="text-white font-semibold">{state.best_model}</span>의
                  학습 결과와 설비 예측 분석이 포함됩니다.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => window.open('/api/report/html', '_blank')} className="btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    브라우저에서 열기
                  </button>
                  <button onClick={downloadReport} disabled={loading} className="btn-secondary">
                    {loading ? <span className="spinner" /> : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    )}
                    다운로드
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 포함 항목 */}
          <div className="card">
            <p className="section-title">보고서 포함 항목</p>
            <div className="grid grid-cols-2 gap-3">
              {ITEMS.map(([icon, title, desc]) => (
                <div key={title} className="flex items-start gap-3 rounded-xl p-4 border border-bg-border"
                  style={{ background: '#0f1826' }}>
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 현재 결과 요약 */}
          <div className="card">
            <p className="section-title">현재 분석 결과</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl p-4 text-center border border-bg-border" style={{ background: '#0f1826' }}>
                <p className="text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">최고 모델</p>
                <p className="text-white font-bold">{state.best_model?.split(' ')[0]}</p>
              </div>
              <div className="rounded-xl p-4 text-center border border-primary/20" style={{ background: 'rgba(79,126,248,0.06)' }}>
                <p className="text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">ROC-AUC</p>
                <p className="text-primary font-bold text-xl tabular-nums">{state.cv_results?.[0]?.roc_auc ?? '—'}</p>
              </div>
              <div className="rounded-xl p-4 text-center border border-bg-border"
                style={{ background: state.optuna_result ? 'rgba(16,185,129,0.06)' : '#0f1826', borderColor: state.optuna_result ? 'rgba(16,185,129,0.2)' : undefined }}>
                <p className="text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Optuna</p>
                <p className={`font-bold ${state.optuna_result ? 'text-emerald' : 'text-slate-600'}`}>
                  {state.optuna_result ? `+${state.optuna_result.improvement}% 개선` : '미실행'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
