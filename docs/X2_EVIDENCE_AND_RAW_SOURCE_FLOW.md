# X2 Evidence and Raw Source Flow

## 데이터 흐름 전체도

```
[외부 API]
  │
  ├─ Naver (4종)
  ├─ YouTube / X / Instagram / TikTok
  ├─ NewsAPI / GDELT
  ├─ SerpAPI / DataForSEO / Google Ads
  └─ Perplexity (GEO/AEO)
  │
  ▼
[Provider Adapter Layer]
  │ fetchMentions(keyword, options) → SocialMention[]
  │
  ▼
[RawSocialMention] ← DB 저장 (원문 보존)
  │ postUrl: 원문 링크
  │ text: 본문/제목
  │ sentiment: 감성
  │ topics: 추출 토픽
  │
  ▼
[Collection Worker] (BullMQ, 6시간 주기)
  │ 감성 분석, 토픽 추출, 스팸 필터
  │
  ▼
[SocialMentionSnapshot] ← 일별 집계
  │ totalCount, positiveCount, buzzLevel
  │ topicSignals, sampleMentions
  │
  ▼
[Intelligence Analysis]
  │ intent 분류, 클러스터링, 여정 분석
  │
  ▼
[EvidenceBundleItem] ← 근거 패키징
  │ category, label, summary, dataSourceType
  │
  ▼
[EvidenceRef + SourceRef] ← 문서/보고서용 변환
  │ evidenceId, snippet, sourceType, url, trustScore
  │
  ▼
[Export Pipeline]
  │ Word / PPT / PDF / CSV / XLSX
  └─ evidence 필수, mock 경고, 품질 메타 유지

## Drill-Down 경로

차트 클릭 → 근거 블록 (EvidenceRef)
  → snippet 표시 (요약)
  → postUrl 링크 (원문 이동)
  → 관련 멘션 목록 (RawSocialMention 쿼리)

## Evidence 필수 정책

- Export 시 evidence 0건이면 거부 (ExportOrchestratorService.validate)
- Mock 데이터 기반 export에 isMockBased 경고 표시
- confidence < 0.5 시 LOW_CONFIDENCE 경고
- 30일 이상 데이터 stale 경고
```
