"""Deterministic supervisor planner for the staged Agentic AutoML roadmap.

PR-27 uses this planner only to persist a goal-first plan. It does not execute
tools, call an LLM, or mark any tool step as completed.
"""

from __future__ import annotations

from backend.schemas.agent import AgentPlan, AgentPlanStep


class SupervisorPlanner:
    """Builds the first runtime-safe plan contract for Agentic AutoML."""

    unsupported_keywords = (
        "clustering",
        "cluster",
        "군집",
        "클러스터",
        "causal",
        "causality",
        "인과",
        "uplift",
        "anomaly",
        "이상 탐지",
        "rag",
        "document",
        "문서",
        "이미지",
        "image",
        "multi target",
        "multi-target",
        "다중 타깃",
    )

    def is_supported_goal(self, user_goal: str) -> bool:
        text = (user_goal or "").lower()
        return not any(keyword in text for keyword in self.unsupported_keywords)

    def create_unsupported_plan(self, user_goal: str) -> AgentPlan:
        normalized_goal = user_goal.strip() or "CSV 예측 분석 목표가 필요합니다."
        return AgentPlan(
            goal=normalized_goal,
            steps=[
                AgentPlanStep(
                    step_id="review-unsupported-goal",
                    title="지원 범위 확인 필요",
                    tool_name=None,
                    reason="현재 Agent Mode는 CSV 기반 분류/회귀 예측 분석을 우선 지원합니다.",
                    expected_input="사용자가 작성한 자연어 분석 목표",
                    expected_output="지원 가능 여부와 사용자가 다시 선택해야 할 분석 방향",
                    status="pending",
                    human_review_may_be_required=True,
                )
            ],
        )

    def create_initial_plan(self, user_goal: str) -> AgentPlan:
        normalized_goal = user_goal.strip() or "업로드한 CSV에서 예측 가능한 목표를 찾고 보고서로 정리합니다."
        if not self.is_supported_goal(normalized_goal):
            return self.create_unsupported_plan(normalized_goal)
        return AgentPlan(
            goal=normalized_goal,
            steps=[
                AgentPlanStep(
                    step_id="profile-data",
                    title="데이터 구조와 품질 확인",
                    tool_name="data_profile_tool",
                    reason="CSV가 예측 분석 흐름을 지원할 수 있는지 먼저 확인합니다.",
                    expected_input="업로드된 CSV 또는 연결된 dataset_id",
                    expected_output="행/열 수, 결측치, 타입, 식별자 후보, 품질 경고",
                ),
                AgentPlanStep(
                    step_id="recommend-target",
                    title="예측 타깃 후보 추천",
                    tool_name="target_recommendation_tool",
                    reason="사용자 목표와 컬럼 구조를 비교해 예측할 값을 정합니다.",
                    expected_input="사용자 목표, 데이터 프로파일, 스키마 검증 결과",
                    expected_output="추천 타깃, task type, 추천 이유, 제외 후보",
                    human_review_may_be_required=True,
                ),
                AgentPlanStep(
                    step_id="check-leakage",
                    title="누수 위험과 제외 컬럼 확인",
                    tool_name="leakage_check_tool",
                    reason="ID, 정답을 직접 알려주는 컬럼, 예측 시점 이후 정보를 분리합니다.",
                    expected_input="추천 타깃, feature 후보, 데이터 프로파일",
                    expected_output="누수 위험, 제외 추천, human review 필요 여부",
                    human_review_may_be_required=True,
                ),
                AgentPlanStep(
                    step_id="train-and-evaluate",
                    title="모델 비교와 성능 평가 준비",
                    tool_name="automl_training_tool",
                    reason="다음 PR에서 기존 AutoML 기능을 tool adapter로 연결합니다.",
                    expected_input="타깃, 제외 컬럼, task type, training budget",
                    expected_output="모델 비교 결과와 best model 후보",
                ),
                AgentPlanStep(
                    step_id="write-report",
                    title="근거 기반 보고서 준비",
                    tool_name="report_writer_tool",
                    reason="관찰 결과와 판단 근거를 보고서 구조로 연결합니다.",
                    expected_input="데이터 품질, 모델 성능, 설명 가능성, 한계",
                    expected_output="grounded report 초안과 다음 행동",
                ),
            ],
        )
