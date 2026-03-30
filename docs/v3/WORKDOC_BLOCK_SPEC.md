# WorkDoc Block Spec

> 7종 블록 유형별 구조, title/oneLiner/sentences/evidence/structuredData 상세

## 1. 공통 섹션 구조

```typescript
{
  id: string;
  blockType: WorkDocBlockType;
  title: string;               // 섹션 제목
  oneLiner: string;            // 한 줄 요약 (복붙용)
  sentences: WorkDocSentenceBlock[];  // 본문 문장들
  structuredData?: Record<string, unknown>;  // 구조화 데이터
  evidenceRefs: EvidenceRef[];  // 근거 연결
  sourceRefs: SourceRef[];      // 출처 연결
  quality: WorkDocQualityMeta;  // 품질 메타
  order: number;
}
```

## 2. 문장 블록 구조

```typescript
{
  sentence: string;           // 톤 적용된 문장
  tone: SentenceTone;         // REPORT | MESSENGER | MEETING_BULLET | FORMAL
  evidenceRef?: EvidenceRef;  // "이 문장이 어디서 나왔는지"
  qualityNote?: string;       // 품질 경고 (stale/partial/mock)
}
```

## 3. 블록 유형별 상세

### 3.1 QUICK_SUMMARY

| 항목 | 내용 |
|------|------|
| 목적 | 보고서/메신저 첫 줄에 붙이는 한 줄 요약 |
| title | "요약" |
| oneLiner | "'프로틴 음료' 분석: 관심 영역 5개, 고객 유형 3개, 콘텐츠 공백 2개" |
| sentences | 관심 영역 수, 고객 유형 수, 콘텐츠 공백 수 |
| evidence | search_intelligence_quality |
| 생성 조건 | 항상 생성 |

### 3.2 KEY_FINDING

| 항목 | 내용 |
|------|------|
| 목적 | 핵심 발견 사항 나열 |
| title | "핵심 발견 사항" |
| oneLiner | 가장 중요한 발견 1건 |
| sentences | 클러스터 기반 + 페르소나 기반 + 콘텐츠 공백 + 허브 키워드 + insight 기반 |
| evidence | search_cluster_distribution, search_persona_profiles, search_roadview_stages, search_pathfinder_graph |
| 생성 조건 | 1건 이상 발견 필요 (없으면 null) |

### 3.3 EVIDENCE

| 항목 | 내용 |
|------|------|
| 목적 | 근거 자료 정리 (부록/첨부용) |
| title | "분석 근거 자료" |
| oneLiner | "총 N건의 근거 자료" |
| sentences | evidence별 카테고리 + snippet 요약 (최대 8건) |
| structuredData | { evidenceCount, categories[] } |
| 생성 조건 | evidence 1건 이상 필요 |

### 3.4 ACTION

| 항목 | 내용 |
|------|------|
| 목적 | 우선순위별 실행 항목 정리 |
| title | "실행 항목" |
| oneLiner | "긴급 N건, 중요 N건의 실행 항목" |
| sentences | [긴급]/[중요]/[일반] 태그 + 액션 + 담당자 (최대 7건) |
| structuredData | { totalActions, highCount, mediumCount } |
| 생성 조건 | action 1건 이상 필요 |

### 3.5 RISK_NOTE

| 항목 | 내용 |
|------|------|
| 목적 | 리스크/주의 사항 정리 |
| title | "리스크 및 주의 사항" |
| oneLiner | "N건의 주의 사항" |
| sentences | 품질 경고 (mock/stale/partial/low-confidence) + 콘텐츠 공백 리스크 + 경고 메시지 |
| evidence | search_quality_warnings |
| 생성 조건 | 리스크 1건 이상 감지 필요 (없으면 null) |

### 3.6 FAQ

| 항목 | 내용 |
|------|------|
| 목적 | 클러스터에서 추출된 자주 묻는 질문 정리 |
| title | "자주 묻는 질문" |
| oneLiner | "N개 FAQ 정리" |
| sentences | Q: 질문 / A: 해당 관심 영역 설명 (최대 6건) |
| structuredData | { questions: [{ q, a }] } |
| evidence | search_cluster_detail |
| 생성 조건 | cluster에 keyQuestions 필요 |

### 3.7 COMPARISON

| 항목 | 내용 |
|------|------|
| 목적 | 관심 영역/여정 단계 비교 표 |
| title | "비교 분석" |
| oneLiner | "N개 항목 비교" |
| sentences | 항목별 label: value (note) 형태 |
| structuredData | { rows: [{ label, value, note }] } |
| evidence | search_cluster_distribution, search_roadview_stages |
| 생성 조건 | cluster 또는 roadview 데이터 필요 |

## 4. 톤별 문장 변환 규칙

| 톤 | 규칙 | 예시 |
|----|------|------|
| REPORT | "~로 분석됩니다." | "관심 영역 5개가 분류된 것으로 분석됩니다." |
| MESSENGER | "~입니다. 확인 부탁드립니다." | "관심 영역 5개입니다. 확인 부탁드립니다." |
| MEETING_BULLET | "• ~" | "• 관심 영역 5개 분류" |
| FORMAL | "~한 것으로 분석되었습니다." | "관심 영역 5개가 분류된 것으로 분석되었습니다." |

## 5. 품질 경고 문구

| 상태 | 문구 |
|------|------|
| isMockOnly | "[검증 필요] 샘플 데이터 기반" |
| stale | "[주의] 오래된 데이터" |
| isPartial | "[참고] 일부 데이터만 수집됨" |
| confidence < 0.5 | "[참고] 신뢰도 낮음" |

## 6. Evidence 카테고리 매핑

| 블록 유형 | 사용하는 Evidence 카테고리 |
|----------|--------------------------|
| QUICK_SUMMARY | search_intelligence_quality |
| KEY_FINDING | search_cluster_distribution, search_persona_profiles, search_roadview_stages, search_pathfinder_graph |
| EVIDENCE | 전체 evidenceRefs |
| ACTION | (없음 — insight/action 기반) |
| RISK_NOTE | search_quality_warnings |
| FAQ | search_cluster_detail |
| COMPARISON | search_cluster_distribution, search_roadview_stages |
