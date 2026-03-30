# Evolved Radial Visualization Spec

## 개요

리스닝마인드의 키워드 방사형+확장형 시각화를 진화시킨 형태이다. 시드 키워드를 중심으로 Taxonomy 카테고리와 데이터 블록 노드들이 동심원 구조로 배치되며, 업종별 시그널 강도와 관계를 시각적으로 탐색할 수 있다.

---

## 구조

### Center Node

- 시드 키워드를 표시하는 빛나는 원
- Glow 효과 적용 (box-shadow 또는 SVG filter)
- 그래프의 시각적 기준점 역할

### 1st Ring — Taxonomy 카테고리 노드

- Taxonomy 카테고리별 노드 배치
- **크기**: `clusterCount`에 비례하여 결정
- **색상**: 업종별 테마 색상 적용
- Center Node와 연결선으로 연결

### 2nd Ring — 데이터 블록 노드

- CLUSTER, PERSONA, PATH 등 데이터 블록 유형별 노드 배치
- 해당 Taxonomy 카테고리와 연결선으로 연결
- 노드 유형별 아이콘 또는 형태 구분

---

## 시각적 요소

### 노드 크기

- Cluster 수에 비례하여 노드 크기 결정
- 최소/최대 크기 범위 제한 (너무 작거나 크지 않도록)

### 노드 색상 — 업종별 테마

| 업종 | 색상 |
|------|------|
| BEAUTY | Pink (`#EC4899`) |
| FNB | Orange (`#F97316`) |
| FINANCE | Blue (`#3B82F6`) |
| ENTERTAINMENT | Purple (`#8B5CF6`) |

### 연결선

- **굵기**: 관련도에 비례
- **점선**: 저신뢰 연결 표시
- **실선**: 일반 연결

### Glow 효과

- 중심 노드: 항상 Glow 적용
- 활성 카테고리: hover 또는 선택 시 Glow 적용

---

## Overlay

시그널 상태를 노드 위에 오버레이로 표현한다.

| Overlay | 시각적 표현 | 의미 |
|---------|------------|------|
| Social signal | 파란 작은 점 | 소셜 시그널이 존재함 |
| Low confidence | 주황 점선 테두리 | 신뢰도가 낮음 |
| Benchmark gap | 주황 하이라이트 | 벤치마크 대비 차이 존재 |

---

## Interaction

### Hover

- 카테고리명 표시
- 클러스터 수 표시
- CSS transition으로 부드러운 확대 애니메이션

### Click

- `onNodeClick` 콜백 호출
- 향후 side panel 연결용으로 예약
- 클릭된 노드의 상세 데이터를 콜백 파라미터로 전달

---

## 기술 구현

### 렌더링

- **Inline SVG** 사용 (외부 라이브러리 의존 없음)
- CSS `transform`으로 노드 배치

### 좌표 계산

- `sin/cos`로 원형 좌표 계산
- 1st Ring, 2nd Ring 각각의 반지름 설정
- 노드 수에 따라 각도 균등 배분

### 애니메이션

- CSS `transition`으로 hover 애니메이션 구현
- `transform: scale()` 및 `opacity` 변화
- 초기 렌더링 시 fade-in 효과 적용
