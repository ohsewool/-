import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Upload from './pages/Upload'
import ModelLab from './pages/ModelLab'
import XAI from './pages/XAI'
import Maintenance from './pages/Maintenance'
import History from './pages/History'
import Report from './pages/Report'

const PAGE_META = {
  '/upload':      { title: '데이터 업로드',       desc: 'CSV / TXT 파일을 업로드하고 EDA를 수행합니다' },
  '/model-lab':   { title: 'Model Lab',          desc: '4개 모델 교차검증 및 Optuna 하이퍼파라미터 튜닝' },
  '/xai':         { title: 'XAI 설명',            desc: 'SHAP 기반 모델 예측 근거 시각화' },
  '/maintenance': { title: 'Maintenance Center', desc: '고장 위험 설비 순위화 및 정비 우선순위 추천' },
  '/history':     { title: '실험 기록',            desc: '모든 실험 결과 및 성능 추이 확인' },
  '/report':      { title: '분석 보고서',          desc: '분석 결과를 HTML 보고서로 내보내기' },
}

function Header() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] || {}
  return (
    <header className="flex-shrink-0 flex items-center justify-between px-8 h-14 border-b border-bg-border bg-white">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">{meta.title}</h1>
        </div>
        {meta.desc && (
          <>
            <span className="text-slate-200">·</span>
            <p className="text-sm text-slate-400 hidden md:block">{meta.desc}</p>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        시스템 정상
      </div>
    </header>
  )
}

function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-bg">
          <Routes>
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="/upload"      element={<Upload />} />
            <Route path="/model-lab"   element={<ModelLab />} />
            <Route path="/xai"         element={<XAI />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/history"     element={<History />} />
            <Route path="/report"      element={<Report />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
