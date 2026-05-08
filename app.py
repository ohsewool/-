import streamlit as st
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import accuracy_score, f1_score
import plotly.express as px
import plotly.graph_objects as go
import json
import os
import io
from datetime import datetime

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

try:
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    OPTUNA_AVAILABLE = True
except ImportError:
    OPTUNA_AVAILABLE = False

# ── 페이지 설정 ────────────────────────────────────────────
st.set_page_config(
    page_title="FailureAI — 설비 고장 예측",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ══════════════════════════════════════════════════════════
# 전역 CSS
# ══════════════════════════════════════════════════════════
st.markdown("""
<style>
/* ── 전체 배경 & 폰트 ── */
html, body, [class*="css"] {
    font-family: 'Segoe UI', 'Apple SD Gothic Neo', sans-serif;
}

/* ── 사이드바 ── */
[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0a0e1a 0%, #0d1b2a 60%, #0a1628 100%);
    border-right: 1px solid #1e3a5f;
}
[data-testid="stSidebar"] * { color: #cbd5e1 !important; }
[data-testid="stSidebar"] .stRadio label {
    font-size: 0.95rem !important;
    padding: 6px 10px !important;
    border-radius: 6px !important;
    transition: background 0.2s;
}
[data-testid="stSidebar"] .stRadio label:hover {
    background: rgba(0,180,216,0.15) !important;
}

/* ── 메인 영역 ── */
.main .block-container { padding-top: 1.5rem; padding-bottom: 2rem; }

/* ── 페이지 헤더 배너 ── */
.page-banner {
    background: linear-gradient(135deg, #0d1b2a 0%, #1a3a5c 50%, #0d2137 100%);
    border: 1px solid #1e3a5f;
    border-left: 5px solid #00b4d8;
    border-radius: 12px;
    padding: 22px 28px;
    margin-bottom: 28px;
}
.page-banner h1 {
    font-size: 1.8rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0 0 6px 0;
}
.page-banner p { color: #94a3b8; margin: 0; font-size: 0.9rem; }

/* ── 섹션 헤더 ── */
.section-title {
    font-size: 1.05rem;
    font-weight: 600;
    color: #00b4d8;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #1e3a5f;
    padding-bottom: 8px;
    margin: 24px 0 16px 0;
}

/* ── KPI 메트릭 카드 ── */
div[data-testid="stMetric"] {
    background: linear-gradient(135deg, #1e293b, #162032);
    border: 1px solid #2d4a6b;
    border-radius: 12px;
    padding: 16px 20px !important;
    transition: transform 0.15s, border-color 0.15s;
}
div[data-testid="stMetric"]:hover {
    transform: translateY(-2px);
    border-color: #00b4d8;
}
div[data-testid="stMetric"] label {
    color: #64748b !important;
    font-size: 0.78rem !important;
    letter-spacing: 0.8px;
    text-transform: uppercase;
}
div[data-testid="stMetric"] [data-testid="stMetricValue"] {
    color: #f1f5f9 !important;
    font-size: 1.8rem !important;
    font-weight: 700 !important;
}
div[data-testid="stMetric"] [data-testid="stMetricDelta"] { font-size: 0.8rem !important; }

/* ── 탭 ── */
[data-testid="stTabs"] [data-baseweb="tab-list"] {
    background: #0d1b2a;
    border-radius: 10px;
    padding: 4px;
    gap: 4px;
    border: 1px solid #1e3a5f;
}
[data-testid="stTabs"] [data-baseweb="tab"] {
    border-radius: 8px !important;
    color: #64748b !important;
    font-size: 0.88rem;
    padding: 8px 18px;
}
[data-testid="stTabs"] [aria-selected="true"] {
    background: #1e3a5f !important;
    color: #00b4d8 !important;
}

/* ── 버튼 ── */
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #0077b6, #0096c7) !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    letter-spacing: 0.3px;
    transition: all 0.2s !important;
    box-shadow: 0 4px 12px rgba(0,150,199,0.3);
}
.stButton > button[kind="primary"]:hover {
    background: linear-gradient(135deg, #0096c7, #00b4d8) !important;
    box-shadow: 0 6px 16px rgba(0,180,216,0.4) !important;
    transform: translateY(-1px);
}
.stButton > button[kind="secondary"] {
    border: 1px solid #334155 !important;
    border-radius: 8px !important;
    color: #94a3b8 !important;
}

/* ── 정비 추천 카드 ── */
.rec-card {
    background: linear-gradient(135deg, #1a2744, #162032);
    border: 1px solid #2d4a6b;
    border-radius: 12px;
    padding: 16px 20px;
    margin: 10px 0;
    transition: transform 0.15s;
}
.rec-card:hover { transform: translateX(4px); }
.rec-card.high   { border-left: 5px solid #ef233c; }
.rec-card.medium { border-left: 5px solid #f9c74f; }
.rec-card.low    { border-left: 5px solid #06d6a0; }
.rec-card .title { font-size: 1rem; font-weight: 700; color: #f1f5f9; }
.rec-card .prob  { font-size: 0.85rem; color: #94a3b8; margin: 4px 0; }
.rec-card .action{ font-size: 0.82rem; color: #64748b; margin-top: 8px;
                   padding-top: 8px; border-top: 1px solid #1e3a5f; }

/* ── 에이전트 카드 ── */
.agent-card {
    background: linear-gradient(135deg, #0a0e1a, #0d1b2a);
    border: 1px solid #1e3a5f;
    border-top: 3px solid #00b4d8;
    border-radius: 12px;
    padding: 24px;
    margin: 16px 0;
}
.agent-card h4 { color: #00b4d8; font-size: 1rem; margin: 0 0 12px 0; }
.agent-card p  { color: #cbd5e1; font-size: 0.9rem; margin: 6px 0; }
.agent-card ul { color: #94a3b8; font-size: 0.88rem; padding-left: 20px; }
.agent-card li { margin: 6px 0; }

/* ── 변환 에이전트 배너 ── */
.convert-banner {
    background: linear-gradient(135deg, #0a2540, #0d3b6e);
    border: 1px solid #0f4c96;
    border-radius: 10px;
    padding: 14px 20px;
    margin: 12px 0;
    display: flex;
    align-items: center;
    gap: 12px;
}
.convert-banner .icon { font-size: 1.5rem; }
.convert-banner .text { color: #93c5fd; font-size: 0.9rem; }
.convert-banner .badge {
    background: #06d6a0;
    color: #0a0e1a;
    font-size: 0.75rem;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    margin-left: auto;
}

/* ── 경고 / 정보 박스 ── */
[data-testid="stAlert"] {
    border-radius: 10px !important;
    border: none !important;
}

/* ── 데이터프레임 ── */
[data-testid="stDataFrame"] {
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #1e3a5f;
}

/* ── 구분선 ── */
hr { border-color: #1e3a5f !important; }

/* ── 익스팬더 ── */
[data-testid="stExpander"] {
    border: 1px solid #1e3a5f !important;
    border-radius: 10px !important;
    background: #0d1b2a !important;
}

/* ── 슬라이더 ── */
[data-testid="stSlider"] [data-baseweb="slider"] div[role="slider"] {
    background-color: #00b4d8 !important;
}

/* ── selectbox / radio ── */
[data-testid="stSelectbox"] > div > div,
[data-testid="stRadio"] {
    border-radius: 8px;
}

/* ── 업로드 영역 ── */
[data-testid="stFileUploader"] {
    border: 2px dashed #1e3a5f !important;
    border-radius: 12px !important;
    background: #0d1b2a !important;
    transition: border-color 0.2s;
}
[data-testid="stFileUploader"]:hover {
    border-color: #00b4d8 !important;
}

/* ── 배지 ── */
.badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
}
.badge-blue   { background: rgba(0,180,216,0.15); color: #00b4d8; border: 1px solid #00b4d8; }
.badge-green  { background: rgba(6,214,160,0.15);  color: #06d6a0; border: 1px solid #06d6a0; }
.badge-red    { background: rgba(239,35,60,0.15);   color: #ef233c; border: 1px solid #ef233c; }
.badge-yellow { background: rgba(249,199,79,0.15);  color: #f9c74f; border: 1px solid #f9c74f; }

/* ── 스텝 인디케이터 ── */
.step-bar {
    display: flex;
    align-items: center;
    gap: 0;
    margin: 20px 0;
}
.step {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 0.82rem;
    font-weight: 600;
}
.step.done    { background: rgba(6,214,160,0.15);  color: #06d6a0; }
.step.active  { background: rgba(0,180,216,0.2);   color: #00b4d8; }
.step.pending { background: rgba(30,41,59,0.8);    color: #475569; }
.step-arrow   { color: #334155; padding: 0 4px; font-size: 0.9rem; }
</style>
""", unsafe_allow_html=True)

# ── 상수 ──────────────────────────────────────────────────
HISTORY_FILE = "experiment_history.json"
PLOTLY_THEME = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="#0d1b2a",
    font=dict(color="#cbd5e1", size=12),
    xaxis=dict(gridcolor="#1e3a5f", linecolor="#334155"),
    yaxis=dict(gridcolor="#1e3a5f", linecolor="#334155"),
    legend=dict(bgcolor="rgba(0,0,0,0)"),
)

MODELS = {
    "Random Forest":       RandomForestClassifier(n_estimators=100, random_state=42),
    "Gradient Boosting":   GradientBoostingClassifier(random_state=42),
    "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
    "Decision Tree":       DecisionTreeClassifier(random_state=42),
}

# ── 세션 상태 초기화 ───────────────────────────────────────
for _k, _v in {
    "df": None, "target_col": None, "X": None, "y": None,
    "cv_results": None, "best_model_name": None,
    "best_model_trained": None, "optuna_result": None,
    "predictions": None,
}.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v

# ── 유틸 ──────────────────────────────────────────────────
def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def save_history(record):
    h = load_history()
    h.append(record)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(h, f, ensure_ascii=False, indent=2)

def preprocess(df, target_col):
    X = df.drop(columns=[target_col]).select_dtypes(include=["number"])
    X = X.fillna(X.median())
    return X, df[target_col]

def auto_parse_file(file):
    raw = file.read().decode("utf-8", errors="replace")
    file.seek(0)
    candidates = [",", "\t", ";", "|", " "]
    best_sep, best_score = ",", -1
    lines = [l for l in raw.splitlines() if l.strip()][:5]
    for sep in candidates:
        counts = [line.count(sep) for line in lines]
        if counts and counts[0] > 0 and len(set(counts)) == 1:
            if counts[0] > best_score:
                best_sep, best_score = sep, counts[0]
    try:
        df = pd.read_csv(io.StringIO(raw), sep=best_sep)
        if len(df.columns) == 1:
            df = pd.read_csv(io.StringIO(raw), sep=r"\s+", engine="python")
            best_sep = "공백"
    except Exception:
        df = None
    label = {"," : "쉼표(,)", "\t": "탭(\\t)", ";" : "세미콜론(;)",
             "|" : "파이프(|)", " " : "공백", "공백": "공백"}.get(best_sep, best_sep)
    return df, label

def run_cv(X, y):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    rows = []
    for name, base in MODELS.items():
        m = base.__class__(**base.get_params())
        acc = cross_val_score(m, X, y, cv=cv, scoring="accuracy").mean()
        f1  = cross_val_score(m, X, y, cv=cv, scoring="f1_weighted").mean()
        roc = cross_val_score(m, X, y, cv=cv, scoring="roc_auc").mean()
        rows.append({"모델": name, "Accuracy": round(acc,4),
                     "F1": round(f1,4), "ROC-AUC": round(roc,4)})
    return pd.DataFrame(rows).sort_values("ROC-AUC", ascending=False).reset_index(drop=True)

def banner(title, desc=""):
    st.markdown(f"""
    <div class="page-banner">
        <h1>{title}</h1>
        {"<p>" + desc + "</p>" if desc else ""}
    </div>""", unsafe_allow_html=True)

def section(title):
    st.markdown(f'<div class="section-title">{title}</div>', unsafe_allow_html=True)

def step_bar(steps):
    parts = []
    for label, status in steps:
        parts.append(f'<div class="step {status}">{label}</div>')
        parts.append('<span class="step-arrow">›</span>')
    st.markdown(f'<div class="step-bar">{"".join(parts[:-1])}</div>', unsafe_allow_html=True)

# ── 사이드바 ───────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="text-align:center;padding:20px 0 10px">
        <div style="font-size:2.5rem">⚙️</div>
        <div style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin-top:6px">FailureAI</div>
        <div style="font-size:0.75rem;color:#475569;margin-top:2px">설비 고장 예측 시스템</div>
    </div>
    <hr style="border-color:#1e3a5f;margin:10px 0 16px">
    """, unsafe_allow_html=True)

    page = st.radio("메뉴", [
        "📂  데이터 업로드 & EDA",
        "🧪  Model Lab",
        "🔍  XAI 설명",
        "🔧  Maintenance Center",
        "📊  실험 기록",
        "📄  리포트",
    ], label_visibility="collapsed")

    st.markdown("<hr style='border-color:#1e3a5f;margin:16px 0'>", unsafe_allow_html=True)

    # 상태 표시
    data_status = "done" if st.session_state.df is not None else "pending"
    model_status = "done" if st.session_state.best_model_name else \
                   ("active" if st.session_state.df is not None else "pending")

    if st.session_state.df is not None:
        r, c = len(st.session_state.df), len(st.session_state.df.columns)
        st.markdown(f"""
        <div style="background:#0d2137;border:1px solid #1e3a5f;border-radius:10px;
                    padding:12px 16px;margin-bottom:10px">
            <div style="font-size:0.72rem;color:#475569;text-transform:uppercase;
                        letter-spacing:1px;margin-bottom:6px">데이터</div>
            <div style="color:#06d6a0;font-weight:600;font-size:0.9rem">
                ✅ {r:,}행 × {c}열
            </div>
        </div>""", unsafe_allow_html=True)

    if st.session_state.best_model_name:
        roc = st.session_state.cv_results.iloc[0]["ROC-AUC"] \
              if st.session_state.cv_results is not None else "-"
        st.markdown(f"""
        <div style="background:#0d2137;border:1px solid #1e3a5f;border-radius:10px;
                    padding:12px 16px">
            <div style="font-size:0.72rem;color:#475569;text-transform:uppercase;
                        letter-spacing:1px;margin-bottom:6px">최고 모델</div>
            <div style="color:#00b4d8;font-weight:600;font-size:0.88rem">
                🏆 {st.session_state.best_model_name}
            </div>
            <div style="color:#475569;font-size:0.78rem;margin-top:4px">
                ROC-AUC: {roc}
            </div>
        </div>""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════
# 페이지 1 — 데이터 업로드 & EDA
# ══════════════════════════════════════════════════════════
def page_upload_eda():
    banner("📂 데이터 업로드 & EDA",
           "CSV 또는 TXT 파일을 업로드하면 자동으로 데이터를 분석합니다.")

    # 스텝 인디케이터
    s1 = "done" if st.session_state.df is not None else "active"
    s2 = "done" if st.session_state.X is not None else \
         ("active" if s1 == "done" else "pending")
    step_bar([("① 파일 업로드", s1), ("② 타깃 선택", s2),
              ("③ Model Lab", "done" if st.session_state.best_model_name else "pending")])

    file = st.file_uploader("", type=["csv", "txt"],
                            label_visibility="collapsed")
    if not file:
        st.markdown("""
        <div style="text-align:center;padding:48px 0;color:#334155">
            <div style="font-size:3rem">📁</div>
            <div style="font-size:1rem;margin-top:12px">CSV 또는 TXT 파일을 드래그하거나 클릭해서 업로드하세요</div>
            <div style="font-size:0.82rem;margin-top:6px;color:#1e3a5f">
                지원 구분자: 쉼표 / 탭 / 세미콜론 / 파이프 / 공백
            </div>
        </div>""", unsafe_allow_html=True)
        return

    # TXT 자동 변환
    fname = file.name.lower()
    if fname.endswith(".txt"):
        st.markdown("""
        <div class="convert-banner">
            <span class="icon">🤖</span>
            <span class="text"><b>파일 변환 에이전트</b> — TXT 파일 감지. 구분자를 자동 분석합니다...</span>
        </div>""", unsafe_allow_html=True)
        df, sep_label = auto_parse_file(file)
        if df is None or df.empty:
            st.error("파일을 파싱하지 못했습니다. 파일 형식을 확인해주세요.")
            return
        col_a, col_b = st.columns([3, 1])
        col_a.success(f"✅ 변환 완료! 감지 구분자: **{sep_label}** → {len(df):,}행 × {len(df.columns)}열")
        col_b.download_button("📥 CSV 다운로드",
                              data=df.to_csv(index=False).encode("utf-8"),
                              file_name=fname.replace(".txt", ".csv"),
                              mime="text/csv", use_container_width=True)
    else:
        df = pd.read_csv(file)

    # 타깃 선택 + 확정
    section("⚙️ 설정")
    c1, c2, c3 = st.columns([2, 2, 1])
    with c1:
        default_idx = df.columns.tolist().index("Machine failure") \
                      if "Machine failure" in df.columns else 0
        target_col = st.selectbox("타깃 컬럼", df.columns.tolist(), index=default_idx)
    with c2:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
    with c3:
        st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
        if st.button("✅ 확정", type="primary", use_container_width=True):
            st.session_state.df = df
            st.session_state.target_col = target_col
            X, y = preprocess(df, target_col)
            st.session_state.X = X
            st.session_state.y = y
            st.success("데이터가 확정되었습니다! Model Lab으로 이동하세요.")

    # KPI 카드
    section("📊 데이터 요약")
    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("전체 행", f"{len(df):,}")
    k2.metric("전체 열", len(df.columns))
    k3.metric("피처 수", len(df.columns) - 1)
    if target_col in df.columns and pd.api.types.is_numeric_dtype(df[target_col]):
        k4.metric("고장률", f"{df[target_col].mean()*100:.1f}%")
    else:
        k4.metric("고장률", "-")
    missing_cnt = int(df.isnull().sum().sum())
    k5.metric("결측치", missing_cnt,
              delta="없음" if missing_cnt == 0 else f"{missing_cnt}개",
              delta_color="normal" if missing_cnt == 0 else "inverse")

    # EDA 탭
    tab1, tab2, tab3, tab4 = st.tabs(["📋 데이터 미리보기", "📈 분포 분석",
                                      "🔥 상관관계", "🔍 데이터 진단"])

    with tab1:
        st.markdown("<div style='margin-top:12px'>", unsafe_allow_html=True)
        st.dataframe(df.head(20), use_container_width=True, height=300)
        st.markdown("**기초 통계량**")
        st.dataframe(df.describe().T.style.background_gradient(cmap="Blues", axis=1),
                     use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

    with tab2:
        num_cols = df.select_dtypes(include=["number"]).columns.tolist()
        valid = [c for c in num_cols if c != target_col and df[c].nunique()/len(df) < 0.9]
        if not valid:
            st.info("시각화 가능한 수치형 컬럼이 없습니다.")
        else:
            r1, r2 = st.columns([2, 2])
            with r1:
                col_sel = st.selectbox("분석 컬럼", valid)
            with r2:
                chart = st.radio("차트", ["히스토그램", "박스플롯", "바이올린"], horizontal=True)
            cmap = {0: "#00b4d8", 1: "#ef233c"}
            if chart == "히스토그램":
                fig = px.histogram(df, x=col_sel, color=target_col, barmode="overlay",
                                   opacity=0.7, color_discrete_map=cmap)
            elif chart == "박스플롯":
                fig = px.box(df, x=target_col, y=col_sel, color=target_col,
                             color_discrete_map=cmap)
            else:
                fig = px.violin(df, x=target_col, y=col_sel, color=target_col,
                                box=True, color_discrete_map=cmap)
            fig.update_layout(**PLOTLY_THEME, title=f"<b>{col_sel}</b> 분포 분석",
                              height=420, margin=dict(t=50, b=20))
            st.plotly_chart(fig, use_container_width=True)

    with tab3:
        num_df = df.select_dtypes(include=["number"])
        if len(num_df.columns) > 1:
            corr = num_df.corr()
            fig = px.imshow(corr, color_continuous_scale="RdBu_r", aspect="auto",
                            text_auto=".2f")
            fig.update_layout(**PLOTLY_THEME, title="<b>피처 간 상관관계</b>",
                              height=520, margin=dict(t=50))
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("수치형 컬럼이 2개 이상 필요합니다.")

    with tab4:
        d1, d2 = st.columns(2)
        with d1:
            st.markdown("**결측치 현황**")
            m_df = pd.DataFrame({
                "컬럼": df.columns,
                "결측치": df.isnull().sum().values,
                "결측률(%)": (df.isnull().sum()/len(df)*100).round(2).values,
            })
            st.dataframe(m_df, use_container_width=True, height=320)
        with d2:
            st.markdown("**데이터 타입 & 유니크값**")
            t_df = pd.DataFrame({
                "컬럼": df.columns,
                "타입": df.dtypes.astype(str).values,
                "유니크": df.nunique().values,
            })
            st.dataframe(t_df, use_container_width=True, height=320)


# ══════════════════════════════════════════════════════════
# 페이지 2 — Model Lab
# ══════════════════════════════════════════════════════════
def page_model_lab():
    banner("🧪 Model Lab",
           "4개 모델을 3-fold 교차검증으로 비교하고, 최고 모델을 Optuna로 튜닝합니다.")

    if st.session_state.X is None:
        st.warning("⬅️ 먼저 **데이터 업로드 & EDA** 페이지에서 데이터를 확정해주세요.")
        return

    X, y = st.session_state.X, st.session_state.y

    # ── 모델 비교 ──────────────────────────────────────────
    section("📊 모델 비교 (3-fold Stratified CV)")
    btn_l, btn_r = st.columns([5, 1])
    with btn_r:
        run_btn = st.button("🚀 실행", type="primary", use_container_width=True)

    if run_btn:
        bar = st.progress(0, text="교차검증 준비 중...")
        cv_results = []
        cv_sk = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
        model_names = list(MODELS.keys())
        for i, (mname, base) in enumerate(MODELS.items()):
            bar.progress((i+1)/len(MODELS), text=f"{mname} 학습 중...")
            m = base.__class__(**base.get_params())
            acc = cross_val_score(m, X, y, cv=cv_sk, scoring="accuracy").mean()
            f1  = cross_val_score(m, X, y, cv=cv_sk, scoring="f1_weighted").mean()
            roc = cross_val_score(m, X, y, cv=cv_sk, scoring="roc_auc").mean()
            cv_results.append({"모델": mname, "Accuracy": round(acc,4),
                                "F1": round(f1,4), "ROC-AUC": round(roc,4)})
        bar.empty()

        cv_df = pd.DataFrame(cv_results).sort_values("ROC-AUC", ascending=False).reset_index(drop=True)
        st.session_state.cv_results = cv_df

        best_name = cv_df.iloc[0]["모델"]
        base = MODELS[best_name]
        bm = base.__class__(**base.get_params())
        bm.fit(X, y)
        st.session_state.best_model_name    = best_name
        st.session_state.best_model_trained = bm
        st.session_state.predictions        = bm.predict(X)

        save_history({
            "timestamp":  datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data_shape": list(X.shape),
            "target":     st.session_state.target_col,
            "best_model": best_name,
            "results":    cv_df.to_dict("records"),
            "optuna_applied": False,
        })

        st.markdown(f"""
        <div style="background:rgba(6,214,160,0.1);border:1px solid #06d6a0;
                    border-radius:10px;padding:14px 20px;margin:12px 0">
            ✅ &nbsp;<b style="color:#06d6a0">완료!</b>
            &nbsp; 최고 모델: <b style="color:#00b4d8">{best_name}</b>
            &nbsp;|&nbsp; ROC-AUC: <b style="color:#f1f5f9">{cv_df.iloc[0]['ROC-AUC']}</b>
        </div>""", unsafe_allow_html=True)

    if st.session_state.cv_results is not None:
        cv = st.session_state.cv_results

        # 리더보드
        section("🏆 리더보드")
        for i, row in cv.iterrows():
            medal = ["🥇", "🥈", "🥉", ""][min(i, 3)]
            is_best = i == 0
            bg = "rgba(0,180,216,0.08)" if is_best else "rgba(13,27,42,0.6)"
            border = "#00b4d8" if is_best else "#1e3a5f"
            st.markdown(f"""
            <div style="background:{bg};border:1px solid {border};border-radius:10px;
                        padding:14px 20px;margin:8px 0;display:flex;
                        align-items:center;gap:20px">
                <span style="font-size:1.4rem">{medal}</span>
                <span style="flex:2;font-weight:600;color:#f1f5f9;font-size:0.95rem">
                    {row['모델']}
                </span>
                <span style="flex:1;text-align:center">
                    <span style="font-size:0.72rem;color:#475569;display:block">Accuracy</span>
                    <span style="color:#cbd5e1;font-weight:600">{row['Accuracy']}</span>
                </span>
                <span style="flex:1;text-align:center">
                    <span style="font-size:0.72rem;color:#475569;display:block">F1</span>
                    <span style="color:#cbd5e1;font-weight:600">{row['F1']}</span>
                </span>
                <span style="flex:1;text-align:center">
                    <span style="font-size:0.72rem;color:#475569;display:block">ROC-AUC</span>
                    <span style="color:{'#00b4d8' if is_best else '#cbd5e1'};
                                font-weight:{'700' if is_best else '600'};
                                font-size:{'1.1rem' if is_best else '1rem'}">
                        {row['ROC-AUC']}
                    </span>
                </span>
            </div>""", unsafe_allow_html=True)

        # 차트
        fig = go.Figure()
        colors = ["#00b4d8", "#06d6a0", "#f9c74f"]
        for metric, color in zip(["Accuracy", "F1", "ROC-AUC"], colors):
            fig.add_trace(go.Bar(name=metric, x=cv["모델"], y=cv[metric],
                                 marker_color=color, opacity=0.85))
        fig.update_layout(**PLOTLY_THEME, barmode="group",
                          title="<b>모델별 성능 비교</b>",
                          height=360, margin=dict(t=50, b=20),
                          xaxis_tickangle=-10)
        st.plotly_chart(fig, use_container_width=True)

        # ── Optuna 튜닝 ────────────────────────────────────
        st.markdown("<hr style='border-color:#1e3a5f;margin:24px 0'>",
                    unsafe_allow_html=True)
        section(f"⚡ Optuna 하이퍼파라미터 튜닝 — {st.session_state.best_model_name}")

        if not OPTUNA_AVAILABLE:
            st.warning("`pip install optuna` 를 실행한 후 사용하세요.")
        else:
            oc1, oc2 = st.columns([3, 1])
            with oc1:
                n_trials = st.slider("탐색 횟수 (n_trials)", 10, 100, 30,
                                     help="높을수록 더 좋은 파라미터를 찾지만 시간이 걸립니다.")
            with oc2:
                st.markdown("<div style='height:28px'></div>", unsafe_allow_html=True)
                optuna_btn = st.button("⚡ 튜닝 시작", type="primary",
                                       use_container_width=True)

            if optuna_btn:
                with st.spinner(f"최적화 진행 중... ({n_trials} trials)"):
                    def objective(trial):
                        nm = st.session_state.best_model_name
                        if nm == "Random Forest":
                            m = RandomForestClassifier(
                                n_estimators=trial.suggest_int("n_estimators", 50, 300),
                                max_depth=trial.suggest_int("max_depth", 3, 15),
                                min_samples_split=trial.suggest_int("min_samples_split", 2, 10),
                                random_state=42)
                        elif nm == "Gradient Boosting":
                            m = GradientBoostingClassifier(
                                n_estimators=trial.suggest_int("n_estimators", 50, 300),
                                learning_rate=trial.suggest_float("learning_rate", 0.01, 0.3),
                                max_depth=trial.suggest_int("max_depth", 2, 8),
                                random_state=42)
                        else:
                            return 0.5
                        cv_sk2 = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
                        return cross_val_score(m, X, y, cv=cv_sk2, scoring="roc_auc").mean()

                    study = optuna.create_study(direction="maximize")
                    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)
                    bp = {**study.best_params, "random_state": 42}
                    nm = st.session_state.best_model_name
                    tuned = (RandomForestClassifier(**bp) if nm == "Random Forest"
                             else GradientBoostingClassifier(**bp)
                             if nm == "Gradient Boosting"
                             else st.session_state.best_model_trained)
                    tuned.fit(X, y)
                    st.session_state.best_model_trained = tuned
                    st.session_state.predictions = tuned.predict(X)
                    cv_sk2 = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
                    after  = round(cross_val_score(tuned, X, y, cv=cv_sk2,
                                                   scoring="roc_auc").mean(), 4)
                    before = cv.iloc[0]["ROC-AUC"]
                    st.session_state.optuna_result = {
                        "best_params": bp, "before_roc": before,
                        "after_roc": after,
                        "improvement": round((after - before)*100, 2),
                    }
                    save_history({
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "data_shape": list(X.shape),
                        "target": st.session_state.target_col,
                        "best_model": nm, "results": cv.to_dict("records"),
                        "optuna_applied": True, "optuna_params": str(bp),
                        "tuned_roc": after,
                    })
                    st.success("Optuna 튜닝 완료!")

            if st.session_state.optuna_result:
                opt = st.session_state.optuna_result
                ov1, ov2, ov3 = st.columns(3)
                ov1.metric("튜닝 전 ROC-AUC", opt["before_roc"])
                ov2.metric("튜닝 후 ROC-AUC", opt["after_roc"],
                           f"+{opt['improvement']}%")
                ov3.metric("최적 파라미터 수", len(opt["best_params"]))
                with st.expander("최적 파라미터 보기"):
                    st.json(opt["best_params"])

        # ── 최근 실험 비교 ─────────────────────────────────
        st.markdown("<hr style='border-color:#1e3a5f;margin:24px 0'>",
                    unsafe_allow_html=True)
        section("📋 최근 실험 비교 (최대 5건)")
        history = load_history()
        if history:
            rows = []
            for h in reversed(history[-5:]):
                br = next((r for r in h["results"] if r["모델"] == h["best_model"]), {})
                rows.append({
                    "시간": h["timestamp"], "데이터": f"{h['data_shape'][0]}×{h['data_shape'][1]}",
                    "최고 모델": h["best_model"], "ROC-AUC": br.get("ROC-AUC", "-"),
                    "Optuna": "✅" if h.get("optuna_applied") else "—",
                })
            st.dataframe(pd.DataFrame(rows), use_container_width=True, height=220)


# ══════════════════════════════════════════════════════════
# 페이지 3 — XAI 설명
# ══════════════════════════════════════════════════════════
def page_xai():
    banner("🔍 XAI 설명",
           "모델이 왜 그렇게 예측했는지 SHAP으로 설명합니다.")

    if st.session_state.best_model_trained is None:
        st.warning("⬅️ 먼저 **Model Lab**에서 모델을 학습해주세요.")
        return

    X, y   = st.session_state.X, st.session_state.y
    model  = st.session_state.best_model_trained

    tab1, tab2, tab3 = st.tabs(["🌐 전역 피처 중요도", "🎯 개별 샘플 설명", "❌ 오분류 예시"])

    # ── 전역 SHAP ─────────────────────────────────────────
    with tab1:
        section("전역 피처 중요도 (SHAP)")
        if not SHAP_AVAILABLE:
            st.info("shap 미설치 — 모델 기본 피처 중요도를 표시합니다.")
            if hasattr(model, "feature_importances_"):
                imp = pd.DataFrame({"피처": X.columns,
                                    "중요도": model.feature_importances_}
                                   ).sort_values("중요도")
                fig = px.bar(imp, x="중요도", y="피처", orientation="h",
                             color="중요도", color_continuous_scale="Blues")
                fig.update_layout(**PLOTLY_THEME, height=420, margin=dict(t=20))
                st.plotly_chart(fig, use_container_width=True)
        else:
            with st.spinner("SHAP 값 계산 중..."):
                try:
                    explainer = shap.TreeExplainer(model)
                    sample    = X.sample(min(300, len(X)), random_state=42)
                    sv        = explainer.shap_values(sample)
                    if isinstance(sv, list):
                        sv = sv[1]
                    mean_sv = np.abs(sv).mean(axis=0)
                    shap_df = pd.DataFrame({"피처": X.columns,
                                            "SHAP 평균 |값|": mean_sv}
                                           ).sort_values("SHAP 평균 |값|")
                    fig = px.bar(shap_df, x="SHAP 평균 |값|", y="피처",
                                 orientation="h", color="SHAP 평균 |값|",
                                 color_continuous_scale="Viridis")
                    fig.update_layout(**PLOTLY_THEME, height=420, margin=dict(t=20))
                    st.plotly_chart(fig, use_container_width=True)
                    st.session_state["_sv"]   = sv
                    st.session_state["_samp"] = sample
                except Exception as e:
                    st.error(f"SHAP 오류: {e}")
                    if hasattr(model, "feature_importances_"):
                        imp = pd.DataFrame({"피처": X.columns,
                                            "중요도": model.feature_importances_}
                                           ).sort_values("중요도")
                        fig = px.bar(imp, x="중요도", y="피처", orientation="h")
                        fig.update_layout(**PLOTLY_THEME)
                        st.plotly_chart(fig, use_container_width=True)

    # ── 개별 설명 ─────────────────────────────────────────
    with tab2:
        section("개별 샘플 설명")
        idx  = st.slider("샘플 인덱스", 0, len(X)-1, 0)
        row  = X.iloc[[idx]]
        pred = model.predict(row)[0]

        if hasattr(model, "predict_proba"):
            prob = model.predict_proba(row)[0]
            p1, p2, p3 = st.columns(3)
            status_color = "#ef233c" if pred == 1 else "#06d6a0"
            p1.metric("예측 결과", "🔴 고장" if pred == 1 else "🟢 정상")
            p2.metric("정상 확률", f"{prob[0]:.1%}")
            p3.metric("고장 확률", f"{prob[1]:.1%}")

        st.markdown("<div style='margin-top:12px'>", unsafe_allow_html=True)
        st.dataframe(row, use_container_width=True)

        if SHAP_AVAILABLE and "_sv" in st.session_state:
            sv = st.session_state["_sv"]
            if idx < len(sv):
                sr = pd.DataFrame({"피처": X.columns,
                                   "SHAP 값": sv[idx]}).sort_values("SHAP 값")
                colors = ["#ef233c" if v > 0 else "#00b4d8" for v in sr["SHAP 값"]]
                fig = go.Figure(go.Bar(x=sr["SHAP 값"], y=sr["피처"],
                                       orientation="h", marker_color=colors))
                fig.update_layout(**PLOTLY_THEME,
                                  title=f"<b>샘플 {idx}</b> — SHAP 기여도",
                                  height=360, margin=dict(t=50))
                st.plotly_chart(fig, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # ── 오분류 예시 ───────────────────────────────────────
    with tab3:
        section("오분류 예시 (최대 3건)")
        preds     = model.predict(X)
        wrong_idx = np.where(preds != y.values)[0]

        if len(wrong_idx) == 0:
            st.success("🎉 오분류 샘플이 없습니다!")
        else:
            st.markdown(f"""
            <div style="background:rgba(239,35,60,0.08);border:1px solid #ef233c;
                        border-radius:10px;padding:12px 18px;margin-bottom:16px">
                ⚠️ &nbsp;전체 <b>{len(wrong_idx):,}건</b>의 오분류 중 상위 3건을 표시합니다.
            </div>""", unsafe_allow_html=True)
            for i, wi in enumerate(wrong_idx[:3]):
                p = model.predict_proba(X.iloc[[wi]])[0] if hasattr(model, "predict_proba") else None
                with st.expander(
                    f"❌ 오분류 #{i+1}  ·  샘플 {wi}  ·  "
                    f"실제 {y.iloc[wi]} → 예측 {preds[wi]}"
                ):
                    st.dataframe(X.iloc[[wi]], use_container_width=True)
                    if p is not None:
                        cc1, cc2 = st.columns(2)
                        cc1.metric("정상 확률", f"{p[0]:.1%}")
                        cc2.metric("고장 확률", f"{p[1]:.1%}")


# ══════════════════════════════════════════════════════════
# 페이지 4 — Maintenance Center
# ══════════════════════════════════════════════════════════
def page_maintenance():
    banner("🔧 Maintenance Center",
           "고장 위험 설비를 순위화하고 정비 우선순위를 추천합니다.")

    if st.session_state.best_model_trained is None:
        st.warning("⬅️ 먼저 **Model Lab**에서 모델을 학습해주세요.")
        return

    X, model = st.session_state.X, st.session_state.best_model_trained
    preds = model.predict(X)
    probs = model.predict_proba(X)[:,1] if hasattr(model,"predict_proba") \
            else preds.astype(float)

    mc1, mc2 = st.columns([3, 1])
    with mc2:
        top_n = st.slider("Top N", 5, 50, 10)

    result_df = X.copy()
    result_df["설비ID"]   = range(len(result_df))
    result_df["예측"]     = preds
    result_df["고장확률"] = probs
    risk_df = (result_df[result_df["예측"]==1]
               .sort_values("고장확률", ascending=False).head(top_n))

    # KPI
    section("📊 현황 요약")
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("전체 설비", f"{len(X):,}")
    m2.metric("정상 예측", int((preds==0).sum()),
              f"{(preds==0).mean()*100:.1f}%")
    m3.metric("고장 예측", int(preds.sum()),
              f"{preds.mean()*100:.1f}%", delta_color="inverse")
    high_risk = int((probs >= 0.8).sum())
    m4.metric("고위험 (≥80%)", high_risk,
              delta_color="inverse" if high_risk > 0 else "normal")

    # 위험 차트
    section(f"⚠️ 위험 설비 Top {top_n}")
    if len(risk_df) == 0:
        st.success("✅ 현재 고장 예측 설비가 없습니다.")
    else:
        fig = px.bar(risk_df, x="설비ID", y="고장확률",
                     color="고장확률",
                     color_continuous_scale=[[0,"#f9c74f"],[0.5,"#f77f00"],[1,"#ef233c"]],
                     range_color=[0,1])
        fig.update_layout(**PLOTLY_THEME, height=320,
                          title=f"<b>설비별 고장 확률</b> (Top {top_n})",
                          margin=dict(t=50, b=20))
        fig.update_coloraxes(showscale=False)
        st.plotly_chart(fig, use_container_width=True)

    # 추천 카드
    section("🎯 정비 우선순위 추천 카드")
    if len(risk_df) == 0:
        st.info("추천할 위험 설비가 없습니다.")
    else:
        for _, row in risk_df.head(5).iterrows():
            p     = row["고장확률"]
            level = "high" if p >= 0.8 else "medium" if p >= 0.5 else "low"
            emoji = "🔴" if level=="high" else "🟡" if level=="medium" else "🟢"
            color = "#ef233c" if level=="high" else "#f9c74f" if level=="medium" else "#06d6a0"
            action = ("즉시 점검 및 가동 중단 검토" if level=="high"
                      else "이번 주 내 점검 권장" if level=="medium"
                      else "다음 정기 점검 시 확인")
            badge_txt = "긴급" if level=="high" else "주의" if level=="medium" else "관찰"
            st.markdown(f"""
            <div class="rec-card {level}">
                <div class="title">{emoji} 설비 #{int(row['설비ID'])}
                    <span class="badge badge-{'red' if level=='high' else 'yellow' if level=='medium' else 'green'}"
                          style="float:right;margin-top:2px">{badge_txt}</span>
                </div>
                <div class="prob">고장 확률:
                    <b style="color:{color};font-size:1.1rem">{p:.1%}</b>
                </div>
                <div class="action">📌 {action}</div>
            </div>""", unsafe_allow_html=True)

    # 에이전트 가이드 카드
    section("🤖 에이전트 실험 가이드")
    best_roc = (st.session_state.cv_results.iloc[0]["ROC-AUC"]
                if st.session_state.cv_results is not None else "-")
    opt = st.session_state.optuna_result
    optuna_line = (f"<p>✅ Optuna 튜닝 완료 — ROC-AUC "
                   f"{opt['before_roc']} → <b style='color:#06d6a0'>{opt['after_roc']}</b>"
                   f" (+{opt['improvement']}%)</p>" if opt else "")

    st.markdown(f"""
    <div class="agent-card">
        <h4>🤖 다음 실험 방향 추천</h4>
        <p>현재 최고 모델: <b style="color:#00b4d8">{st.session_state.best_model_name}</b>
           &nbsp;·&nbsp; ROC-AUC: <b style="color:#f1f5f9">{best_roc}</b></p>
        {optuna_line}
        <hr style="border-color:#1e3a5f;margin:14px 0">
        <p style="color:#94a3b8;font-size:0.82rem;margin-bottom:8px">💡 권장 다음 단계</p>
        <ul>
            <li>피처 엔지니어링: 온도 차이·도구 마모율 등 파생 변수 추가</li>
            <li>클래스 불균형: <code>class_weight="balanced"</code> 또는 SMOTE 적용</li>
            <li>임계값 조정: 고장 Recall 향상 목적으로 threshold 낮추기</li>
            <li>앙상블: 상위 2개 모델 Voting Classifier 구성 고려</li>
        </ul>
    </div>""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════
# 페이지 5 — 실험 기록
# ══════════════════════════════════════════════════════════
def page_experiment_history():
    banner("📊 실험 기록",
           "모든 실험 결과를 기록하고, 선택 단계를 부분 재실행할 수 있습니다.")

    history = load_history()
    if not history:
        st.markdown("""
        <div style="text-align:center;padding:60px 0;color:#334155">
            <div style="font-size:3rem">📭</div>
            <div style="margin-top:12px;font-size:1rem">저장된 실험 기록이 없습니다.</div>
            <div style="font-size:0.85rem;margin-top:6px">
                Model Lab에서 모델을 실행하면 자동으로 저장됩니다.
            </div>
        </div>""", unsafe_allow_html=True)
        return

    hl, hr = st.columns([5, 1])
    with hr:
        if st.button("🗑️ 전체 삭제", type="secondary", use_container_width=True):
            if os.path.exists(HISTORY_FILE):
                os.remove(HISTORY_FILE)
            st.rerun()

    # 요약 KPI
    total = len(history)
    optuna_cnt = sum(1 for h in history if h.get("optuna_applied"))
    best_rocs  = [next((r["ROC-AUC"] for r in h["results"]
                        if r["모델"] == h["best_model"]), 0) for h in history]
    hk1, hk2, hk3 = st.columns(3)
    hk1.metric("총 실험 수", total)
    hk2.metric("Optuna 적용", optuna_cnt)
    hk3.metric("최고 ROC-AUC", max(best_rocs) if best_rocs else "-")

    section("📋 전체 실험 이력")
    rows = []
    for i, h in enumerate(reversed(history)):
        br = next((r for r in h["results"] if r["모델"] == h["best_model"]), {})
        rows.append({
            "#": len(history)-i, "시간": h["timestamp"],
            "데이터": f"{h['data_shape'][0]}×{h['data_shape'][1]}",
            "타깃": h.get("target", "-"),
            "최고 모델": h["best_model"],
            "Accuracy": br.get("Accuracy", "-"),
            "F1": br.get("F1", "-"),
            "ROC-AUC": br.get("ROC-AUC", "-"),
            "Optuna": "✅" if h.get("optuna_applied") else "—",
        })
    st.dataframe(pd.DataFrame(rows), use_container_width=True, height=300)

    if len(rows) > 1:
        section("📈 ROC-AUC 성능 추이")
        trend = pd.DataFrame({
            "실험": [f"#{r['#']}" for r in rows[::-1]],
            "ROC-AUC": [r["ROC-AUC"] for r in rows[::-1]],
        })
        fig = px.line(trend, x="실험", y="ROC-AUC", markers=True)
        fig.update_traces(line_color="#00b4d8", marker_color="#00b4d8",
                          marker_size=8)
        fig.update_layout(**PLOTLY_THEME, height=260, margin=dict(t=20, b=20))
        st.plotly_chart(fig, use_container_width=True)

    # 부분 재실행
    st.markdown("<hr style='border-color:#1e3a5f;margin:24px 0'>",
                unsafe_allow_html=True)
    section("🔄 부분 재실행")

    if st.session_state.X is None:
        st.warning("재실행하려면 먼저 데이터를 업로드해주세요.")
        return

    rc1, rc2 = st.columns([2, 2])
    with rc1:
        rerun_cv   = st.checkbox("모델 비교 (CV) 재실행", value=True)
        rerun_shap = st.checkbox("SHAP 캐시 초기화", value=False)
    with rc2:
        X = st.session_state.X
        st.markdown(f"""
        <div style="background:#0d1b2a;border:1px solid #1e3a5f;border-radius:10px;
                    padding:14px 18px">
            <div style="font-size:0.75rem;color:#475569;margin-bottom:6px">현재 데이터</div>
            <div style="color:#cbd5e1;font-size:0.9rem">
                {X.shape[0]:,}행 × {X.shape[1]}열 &nbsp;·&nbsp;
                타깃: <b style="color:#00b4d8">{st.session_state.target_col}</b>
            </div>
        </div>""", unsafe_allow_html=True)

    if st.button("▶️ 재실행", type="primary"):
        if rerun_cv:
            with st.spinner("CV 재실행 중..."):
                cv_r = run_cv(st.session_state.X, st.session_state.y)
                st.session_state.cv_results = cv_r
                bn = cv_r.iloc[0]["모델"]
                base = MODELS[bn]
                bm = base.__class__(**base.get_params())
                bm.fit(st.session_state.X, st.session_state.y)
                st.session_state.best_model_name    = bn
                st.session_state.best_model_trained = bm
                st.session_state.predictions        = bm.predict(st.session_state.X)
            st.success("CV 재실행 완료!")
        if rerun_shap:
            for k in ["_sv", "_samp"]:
                st.session_state.pop(k, None)
            st.success("SHAP 캐시 초기화 완료 — XAI 페이지에서 재계산됩니다.")


# ══════════════════════════════════════════════════════════
# 페이지 6 — 리포트
# ══════════════════════════════════════════════════════════
def page_report():
    banner("📄 리포트 생성",
           "분석 결과를 HTML 리포트와 예측 CSV로 내보냅니다.")

    if st.session_state.cv_results is None:
        st.warning("⬅️ 먼저 **Model Lab**에서 모델을 학습해주세요.")
        return

    cv    = st.session_state.cv_results
    name  = st.session_state.best_model_name
    opt   = st.session_state.optuna_result
    X, y  = st.session_state.X, st.session_state.y
    preds = st.session_state.predictions
    now   = datetime.now().strftime("%Y-%m-%d %H:%M")

    # 요약 카드
    section("📋 리포트 요약")
    rc1, rc2, rc3, rc4 = st.columns(4)
    rc1.metric("생성 시각", now.split(" ")[1])
    rc2.metric("최고 모델", name.split()[0])
    rc3.metric("ROC-AUC", cv.iloc[0]["ROC-AUC"])
    if preds is not None:
        rc4.metric("최종 Accuracy", f"{accuracy_score(y, preds):.4f}")

    with st.expander("전체 내용 미리보기", expanded=True):
        st.markdown(f"**생성:** {now}  |  **데이터:** {X.shape[0]:,}행 × {X.shape[1]}열"
                    f"  |  **최고 모델:** {name}")
        st.dataframe(cv, use_container_width=True)
        if opt:
            st.markdown(f"**Optuna:** ROC-AUC {opt['before_roc']} → "
                        f"{opt['after_roc']} (+{opt['improvement']}%)")

    # HTML 생성
    opt_sec = (f"<h2>3. Optuna 튜닝</h2><p>ROC-AUC: {opt['before_roc']} → "
               f"{opt['after_roc']} (+{opt['improvement']}%)</p>"
               f"<p>파라미터: {opt['best_params']}</p>" if opt else "")
    perf_sec = (f"<h2>{'4' if opt else '3'}. 최종 성능</h2>"
                f"<p>Accuracy: {accuracy_score(y,preds):.4f} | "
                f"F1: {f1_score(y,preds,average='weighted'):.4f}</p>"
                if preds is not None else "")
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>설비 고장 예측 리포트</title>
<style>
  body{{font-family:'Malgun Gothic',sans-serif;max-width:960px;margin:40px auto;
        color:#1e293b;background:#f8fafc}}
  h1{{color:#0077b6;border-bottom:3px solid #0077b6;padding-bottom:12px}}
  h2{{color:#023e8a;margin-top:36px;font-size:1.2rem}}
  table{{width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden}}
  th{{background:#0077b6;color:white;padding:12px;font-size:.9rem}}
  td{{padding:10px;border-bottom:1px solid #e2e8f0;font-size:.88rem}}
  tr:hover{{background:#f0f9ff}}
  .card{{display:inline-block;background:#e0f2fe;padding:12px 22px;border-radius:10px;
          margin:6px;min-width:120px}}
  .cl{{font-size:.75rem;color:#64748b;text-transform:uppercase}}
  .cv{{font-size:1.6rem;font-weight:700;color:#0077b6}}
  .footer{{margin-top:48px;color:#94a3b8;font-size:.8rem;text-align:center}}
</style></head><body>
  <h1>⚙️ 설비 고장 예측 분석 리포트</h1>
  <p style="color:#64748b">생성: {now}</p>
  <h2>1. 데이터 개요</h2>
  <div class="card"><div class="cl">행 수</div><div class="cv">{X.shape[0]:,}</div></div>
  <div class="card"><div class="cl">피처 수</div><div class="cv">{X.shape[1]}</div></div>
  <div class="card"><div class="cl">최고 모델</div><div class="cv" style="font-size:1rem">{name}</div></div>
  <h2>2. 모델 비교 (3-fold CV)</h2>{cv.to_html(index=False)}
  {opt_sec}{perf_sec}
  <div class="footer">Generated by FailureAI</div>
</body></html>"""

    section("⬇️ 다운로드")
    dl1, dl2 = st.columns(2)
    with dl1:
        st.download_button("📥 HTML 리포트 다운로드",
                           data=html.encode("utf-8"),
                           file_name=f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html",
                           mime="text/html", type="primary", use_container_width=True)
    with dl2:
        if preds is not None:
            out = X.copy()
            out["actual"] = y.values
            out["predicted"] = preds
            st.download_button("📥 예측 결과 CSV",
                               data=out.to_csv(index=False).encode("utf-8"),
                               file_name=f"predictions_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                               mime="text/csv", use_container_width=True)

    # 최근 실행 기록
    st.markdown("<hr style='border-color:#1e3a5f;margin:28px 0'>",
                unsafe_allow_html=True)
    section("🕐 최근 실행 기록")
    history = load_history()
    for h in reversed(history[-3:]):
        br = next((r for r in h["results"] if r["모델"] == h["best_model"]), {})
        with st.expander(f"📌 {h['timestamp']}  ·  {h['best_model']}"):
            hc1, hc2, hc3 = st.columns(3)
            hc1.metric("모델", h["best_model"])
            hc2.metric("ROC-AUC", br.get("ROC-AUC", "-"))
            hc3.metric("Optuna", "적용" if h.get("optuna_applied") else "미적용")
            if st.button("🔄 재실행", key=f"rr_{h['timestamp']}"):
                st.info("데이터를 다시 업로드한 뒤 Model Lab에서 실행해주세요.")


# ── 라우터 ────────────────────────────────────────────────
if   page == "📂  데이터 업로드 & EDA":  page_upload_eda()
elif page == "🧪  Model Lab":            page_model_lab()
elif page == "🔍  XAI 설명":             page_xai()
elif page == "🔧  Maintenance Center":   page_maintenance()
elif page == "📊  실험 기록":             page_experiment_history()
elif page == "📄  리포트":               page_report()
