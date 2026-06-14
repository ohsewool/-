import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardList, RefreshCw } from 'lucide-react'
import api from '../api'
import { Button } from '../components/ui/button'

const EXAMPLE_GOALS = [
  '이 CSV로 고객 이탈 가능성을 예측하고 중요한 요인을 보고서로 정리해줘.',
  '설비 고장 위험을 예측할 수 있는 타깃을 찾고 모델 비교 계획을 세워줘.',
  '마케팅 전환 여부를 예측하고 API로 재사용할 수 있는 분석 흐름을 준비해줘.',
]

function AgentStatusBadge({ status }) {
  const labels = {
    planned: '계획됨',
    pending: '대기',
    needs_review: '검토 필요',
    failed: '실패',
  }
  const tone = status === 'needs_review' ? 'badge-amber' : status === 'failed' ? 'badge-red' : 'badge-blue'
  return <span className={`badge ${tone}`}>{labels[status] || status || '확인 필요'}</span>
}

function PlanStepCard({ step }) {
  const payload = step.payload || {}
  return (
    <div className="card-compact" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <p style={{ margin: '0 0 4px', color: 'var(--text-label)', fontSize: 11, fontWeight: 850 }}>
            STEP {step.step_index} {payload.tool_name ? `· ${payload.tool_name}` : '· human review'}
          </p>
          <strong>{step.title}</strong>
        </div>
        <AgentStatusBadge status={step.status || 'pending'} />
      </div>
      <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.55 }}>{payload.reason}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }} className="admin-stat-grid">
        <div className="mini-muted-box">
          <span>예상 입력</span>
          <strong>{payload.expected_input || '-'}</strong>
        </div>
        <div className="mini-muted-box">
          <span>예상 출력</span>
          <strong>{payload.expected_output || '-'}</strong>
        </div>
      </div>
      {payload.human_review_may_be_required && (
        <div className="banner-warning" style={{ padding: 10 }}>
          <AlertTriangle size={15} />
          <p style={{ margin: 0, fontSize: 12 }}>이 단계는 타깃/누수/지원 범위가 애매하면 사람 확인이 필요할 수 있습니다.</p>
        </div>
      )}
    </div>
  )
}

function AgentRunPanel({ runData, loading, error, onReload }) {
  if (loading) {
    return (
      <section className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className="spinner-lg" />
        <p style={{ margin: 0, color: 'var(--text-2)' }}>저장된 Agent Run을 불러오는 중입니다.</p>
      </section>
    )
  }
  if (error) {
    return (
      <section className="banner-warning" style={{ display: 'grid', gap: 10 }}>
        <p style={{ margin: 0 }}>{error}</p>
        <Button type="button" variant="secondary" onClick={onReload}><RefreshCw size={15} /> 다시 불러오기</Button>
      </section>
    )
  }
  if (!runData) return null
  const run = runData.run || {}
  const steps = runData.steps || []
  const unsupported = run.status === 'needs_review'
  return (
    <section className="card" style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', color: '#2563eb', fontSize: 12, fontWeight: 900 }}>저장된 Agent Run</p>
          <h2 style={{ margin: 0, fontSize: 22 }}>{run.user_goal}</h2>
          <p style={{ margin: '8px 0 0', color: 'var(--text-label)', fontSize: 12 }}>run ID: {run.id}</p>
        </div>
        <AgentStatusBadge status={run.status || 'planned'} />
      </div>
      {unsupported ? (
        <div className="banner-warning">
          <AlertTriangle size={16} />
          <p style={{ margin: 0 }}>현재 Agent Mode는 CSV 기반 분류/회귀 예측 분석을 우선 지원합니다. 이 목표는 바로 실행하지 않고 검토가 필요합니다.</p>
        </div>
      ) : (
        <div className="banner-success">
          <CheckCircle2 size={16} />
          <p style={{ margin: 0 }}>목표와 deterministic plan이 저장되었습니다. 아직 tool execution은 수행하지 않았고 모든 단계는 pending 상태입니다.</p>
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {steps.map(step => <PlanStepCard key={step.id} step={step} />)}
      </div>
    </section>
  )
}

export default function Agent() {
  const [search, setSearch] = useSearchParams()
  const runId = search.get('run')
  const [goal, setGoal] = useState(EXAMPLE_GOALS[0])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [runState, setRunState] = useState({ loading: false, error: '', data: null })

  async function loadRun(id = runId) {
    if (!id) {
      setRunState({ loading: false, error: '', data: null })
      return
    }
    setRunState({ loading: true, error: '', data: null })
    try {
      const { data } = await api.get(`/agent/runs/${id}`)
      setRunState({ loading: false, error: '', data })
    } catch (err) {
      setRunState({
        loading: false,
        error: err.response?.data?.detail || 'Agent Run을 불러오지 못했습니다.',
        data: null,
      })
    }
  }

  useEffect(() => { loadRun(runId) }, [runId])

  async function createRun(event) {
    event.preventDefault()
    setCreateError('')
    if (goal.trim().length < 6) {
      setCreateError('분석 목표를 조금 더 구체적으로 입력해 주세요.')
      return
    }
    setCreating(true)
    try {
      const { data } = await api.post('/agent/runs', { user_goal: goal.trim() })
      setSearch({ run: data.analysis_run_id })
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Agent Run을 만들지 못했습니다.')
    } finally {
      setCreating(false)
    }
  }

  const helperText = useMemo(() => {
    if (!runState.data?.run?.id) return '목표를 먼저 저장하면 새로고침 후에도 같은 Agent Run과 계획을 다시 볼 수 있습니다.'
    return '이 화면은 PR-27 범위입니다. 계획은 저장되었지만 실제 tool call, observation, decision은 PR-28 이후에 연결됩니다.'
  }, [runState.data])

  return (
    <div className="animate-fade-in" style={{ padding: 32, maxWidth: 1120 }}>
      <section className="card" style={{ display: 'grid', gap: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: '0 0 6px', color: '#2563eb', fontSize: 12, fontWeight: 900 }}>Goal-first Agent Mode</p>
            <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 0 }}>분석 목표를 먼저 저장하고 실행 계획을 만듭니다</h1>
            <p style={{ margin: '10px 0 0', color: 'var(--text-2)', lineHeight: 1.65, maxWidth: 760 }}>
              자연어로 원하는 예측 분석 목표를 입력하면 ModelMate가 deterministic plan을 만들고 Agent Run으로 저장합니다.
              아직 실제 AutoML tool 실행은 하지 않으며, 각 단계는 계획됨 또는 대기 상태로 표시됩니다.
            </p>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'rgba(37,99,235,0.1)', color: '#2563eb', flexShrink: 0 }}>
            <ClipboardList size={25} />
          </div>
        </div>
        <form onSubmit={createRun} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 850, color: 'var(--text)' }}>분석 목표</span>
            <textarea
              value={goal}
              onChange={event => setGoal(event.target.value)}
              rows={4}
              className="goal-textarea"
              placeholder="예: 이 CSV로 고객 이탈 가능성을 예측하고 중요한 요인을 보고서로 정리해줘."
            />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {EXAMPLE_GOALS.map(item => (
              <button key={item} type="button" className="chip-button" onClick={() => setGoal(item)}>{item}</button>
            ))}
          </div>
          {createError && <div className="banner-warning"><AlertTriangle size={15} /><p style={{ margin: 0 }}>{createError}</p></div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button type="submit" disabled={creating}>{creating ? '저장 중...' : 'Agent Run 만들기'}</Button>
            <Button asChild variant="secondary"><Link to="/upload">CSV 업로드로 이동</Link></Button>
            <Button asChild variant="secondary"><Link to="/projects">프로젝트 보기</Link></Button>
          </div>
          <p style={{ margin: 0, color: 'var(--text-label)', fontSize: 12 }}>{helperText}</p>
        </form>
      </section>

      <AgentRunPanel
        runData={runState.data}
        loading={runState.loading}
        error={runState.error}
        onReload={() => loadRun(runId)}
      />
    </div>
  )
}
