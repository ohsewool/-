import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import KPICard from '../components/KPICard'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Upload() {
  const [dragging,    setDragging]    = useState(false)
  const [uploadInfo,  setUploadInfo]  = useState(null)
  const [edaInfo,     setEdaInfo]     = useState(null)
  const [target,      setTarget]      = useState('')
  const [loading,     setLoading]     = useState(false)
  const [tab,         setTab]         = useState('preview')
  const fileRef = useRef()
  const nav = useNavigate()

  async function handleFile(file) {
    if (!file) return
    setLoading(true)
    const fd = new FormData(); fd.append('file', file)
    try {
      const { data } = await api.post('/upload', fd)
      setUploadInfo(data)
      setTarget(data.default_target)
    } catch(e) { alert('업로드 실패: ' + (e.response?.data?.detail || e.message)) }
    setLoading(false)
  }

  async function handleSetTarget() {
    setLoading(true)
    try {
      const { data } = await api.post('/set-target', { target_col: target })
      setEdaInfo(data)
      setTab('dist')
    } catch(e) { alert(e.response?.data?.detail || e.message) }
    setLoading(false)
  }

  const drop = e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }
  const TABS = [['preview','미리보기'],['dist','분포'],['corr','상관관계'],['stats','통계']]

  const ttStyle = { background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:10, fontSize:11, color:'#0f172a', boxShadow:'0 4px 12px rgba(0,0,0,0.08)' }

  return (
    <div className="p-8 animate-fade-in max-w-6xl">

      {!uploadInfo ? (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-20 text-center cursor-pointer
            transition-all duration-250 group
            ${dragging
              ? 'border-primary bg-primary-light scale-[1.01]'
              : 'border-bg-border hover:border-primary/40 hover:bg-bg-card'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          onClick={() => fileRef.current.click()}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="spinner-lg" />
              <p className="text-slate-400 text-sm">파일 분석 중…</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center
                group-hover:scale-110 transition-transform duration-200"
                style={{ background: 'linear-gradient(135deg, rgba(79,126,248,0.2), rgba(34,211,238,0.1))', border: '1px solid rgba(79,126,248,0.3)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4f7ef8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="text-white font-semibold text-base mb-2">파일을 드래그하거나 클릭해서 업로드</p>
              <p className="text-slate-600 text-sm">CSV, TXT 지원 · TXT는 구분자 자동 감지</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5 animate-slide-up">
          {/* 변환 배너 */}
          {uploadInfo.converted && (
            <div className="banner-info">
              <span className="text-lg">🤖</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">파일 변환 완료</p>
                <p className="text-xs mt-0.5 text-slate-400">구분자 자동 감지 ({uploadInfo.separator}) → CSV 변환</p>
              </div>
              <span className="badge badge-blue">변환됨</span>
            </div>
          )}

          {/* 타깃 선택 */}
          <div className="card">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">타깃 컬럼 선택</label>
                <select value={target} onChange={e => setTarget(e.target.value)} className="input w-full">
                  {uploadInfo.columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={handleSetTarget} className="btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20,6 9,17 4,12"/></svg>
                )}
                데이터 확정
              </button>
              <button onClick={() => { setUploadInfo(null); setEdaInfo(null) }} className="btn-secondary">
                ↩ 다시
              </button>
            </div>
          </div>

          {/* KPI */}
          <div className="grid grid-cols-4 gap-4">
            <KPICard label="전체 행" value={uploadInfo.shape[0].toLocaleString()} icon="📋" color="blue" />
            <KPICard label="전체 열" value={uploadInfo.shape[1]} icon="📊" color="cyan" />
            <KPICard label="결측치" value={uploadInfo.missing_total}
              icon="⚠️" color={uploadInfo.missing_total > 0 ? 'amber' : 'green'} />
            <KPICard label="타깃 컬럼" value={target} icon="🎯" color="violet" />
          </div>

          {/* EDA 탭 */}
          {edaInfo && (
            <div className="card animate-fade-in">
              <div className="tab-bar w-fit mb-6">
                {TABS.map(([k, v]) => (
                  <button key={k} onClick={() => setTab(k)}
                    className={tab === k ? 'tab-item-active' : 'tab-item-inactive'}>
                    {v}
                  </button>
                ))}
              </div>

              {tab === 'preview' && (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>{uploadInfo.columns.map(c => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {uploadInfo.preview.map((row, i) => (
                        <tr key={i}>
                          {uploadInfo.columns.map(c => (
                            <td key={c} className="text-slate-300 text-xs">{String(row[c])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'dist' && (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(edaInfo.distributions).map(([col, d]) => (
                    <div key={col} className="card-elevated">
                      <p className="text-xs font-semibold text-slate-400 mb-3">{col}</p>
                      <ResponsiveContainer width="100%" height={110}>
                        <BarChart data={d.bins.map((b,i) => ({ bin: b, normal: d.normal[i], failure: d.failure[i] }))} barSize={7}>
                          <XAxis dataKey="bin" tick={false} axisLine={false} />
                          <YAxis hide />
                          <Tooltip contentStyle={ttStyle} labelFormatter={v=>`값: ${v}`} />
                          <Bar dataKey="normal"  stackId="a" fill="#4f7ef8" opacity={0.75} radius={[2,2,0,0]} />
                          <Bar dataKey="failure" stackId="a" fill="#f43f5e" opacity={0.85} radius={[2,2,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="w-2 h-2 rounded-sm bg-primary inline-block" />정상
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-slate-600">
                          <span className="w-2 h-2 rounded-sm bg-rose inline-block" />고장
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'corr' && (
                <div>
                  <p className="text-xs text-slate-500 mb-4">피처 간 상관관계 — 값이 클수록 강한 양의 상관</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="w-24" />
                          {edaInfo.corr_cols.map(c => (
                            <th key={c} className="px-1 py-1 text-slate-600 font-normal text-center w-16" style={{fontSize:9}}>{c.slice(0,8)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {edaInfo.corr_cols.map(r => (
                          <tr key={r}>
                            <td className="pr-2 text-slate-600 text-right" style={{fontSize:9}}>{r.slice(0,10)}</td>
                            {edaInfo.corr_cols.map(c => {
                              const v = edaInfo.corr_data.find(d=>d.x===r&&d.y===c)?.v ?? 0
                              const a = Math.abs(v)
                              const bg = v > 0 ? `rgba(79,126,248,${a})` : `rgba(244,63,94,${a})`
                              return (
                                <td key={c} className="w-14 h-8 text-center rounded font-mono"
                                  style={{ background: bg, color: a > 0.5 ? 'white' : '#64748b', fontSize:10 }}>
                                  {v.toFixed(2)}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {tab === 'stats' && (
                <div className="grid grid-cols-3 gap-4">
                  <KPICard label="샘플 수" value={edaInfo.n_samples.toLocaleString()} color="blue" />
                  <KPICard label="피처 수" value={edaInfo.n_features} color="cyan" />
                  <KPICard label="고장률" value={`${edaInfo.failure_rate}%`}
                    color={edaInfo.failure_rate > 30 ? 'red' : 'green'} />
                </div>
              )}
            </div>
          )}

          {edaInfo && (
            <button onClick={() => nav('/model-lab')} className="btn-primary w-full justify-center py-3.5 text-sm">
              Model Lab으로 이동
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
