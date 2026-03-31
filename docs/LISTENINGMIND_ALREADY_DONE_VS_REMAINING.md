# ListeningMind: Already Done vs Remaining

---

## 이미 충분히 반영된 것 (추가 작업 불필요)

| 기능 | 근거 |
|------|------|
| Intent Finder 엔진 + UI | 40+ 패턴 분류기, 742줄 페이지, /api/intent/analyze |
| Pathfinder 그래프 + 여정 | Canvas 렌더러, 6단계 모델, before/after 전이 |
| Persona View 프로파일링 | 8 아키타입, 6축 레이더, content strategy |
| Road View A→B 경로 | endKeyword, 분기점, 대안 경로 |
| Cluster Finder 엔진 | Jaccard 클러스터링, GPT 분석 패널 |
| 키워드 저장/최근/히스토리 | IntelligenceKeyword 모델, bookmark UI |
| Intelligence 비교 3모드 | 키워드/업종/기간 비교 |
| 시간별 추이 + 이슈 타임라인 | hourlyTrend, issueTimeline DB 쿼리 |
| 연관어/감성 연관어 | relatedKeywords, sentimentTerms |
| 채널/콘텐츠 랭킹 | channelRankings, contentRankings |
| 알림 센터 + 설정 | snooze/dismiss, 이메일/웹훅, 임계값 |
| Export 5포맷 + 차트 이미지 | Word/PPT/PDF/CSV/XLSX + html2canvas |
| 브랜드 비교 | KPI 비교, 4가지 경쟁자 유형, 벤치마크 |
| GEO/AEO 분석 | 4축 점수, 인용 추적, Perplexity 연동 |
| 외부 API (v1) | trend/mentions/sentiment/rankings/evidence |
| 네이버 4종 어댑터 | 블로그/뉴스/카페/지식iN |
| 글로벌 뉴스 | NewsAPI everything + headlines |
| 국가/언어 타입 시스템 | 15개국 11개 언어 |
| Usage 대시보드 | tRPC 라우터 + 풀 UI |

## 부분만 된 것 (보강 필요)

| 기능 | 현재 상태 | 남은 작업 |
|------|----------|----------|
| 절대 검색량 | Google Ads 어댑터 존재 | API 키 설정 필요 (또는 DataForSEO sandbox) |
| 클러스터 네트워크 시각화 | 리스트+바차트만 | D3/Force-Graph 기반 네트워크 그래프 추가 |
| LLM 인사이트 해석 | "Upgrade path" 주석만 | 인사이트 서비스에 Claude/GPT 연동 |
| 워드클라우드 | RelatedKeywordMap (크기맵) | 전통 워드클라우드 라이브러리 적용 선택적 |
| 다중 키워드 동시 입력 | seed 1개 → 자동 확장 | 콤마 구분 다중 키워드 입력 UI |
| 실시간 신규 키워드 탐지 | 트렌드 차트 표시만 | anomaly detection + 신규 키워드 알림 |
| 실데이터 수집 파이프라인 | Worker/스케줄러 코드 존재 | Redis + Worker 실행 + 키워드 저장 필요 |

## 아직 안 된 것 (신규 개발 필요)

| 기능 | 설명 |
|------|------|
| 인구통계 분석 | 성별/연령 데이터 소스 + UI 전체 신규 |
| 카테고리 엔트리 포인트 | 카테고리 분류 체계 + 진입 경로 분석 |
| 데이터 수집 모니터링 UI | Worker 상태, 수집 성공/실패 현황 admin 페이지 |

## 검증만 하면 되는 것 (코드 있으나 end-to-end 미확인)

| 기능 | 필요한 검증 |
|------|-----------|
| Worker 스케줄러 | Redis 실행 + 키워드 저장 후 6시간 수집 사이클 확인 |
| 이메일/웹훅 발송 | Resend API 키 설정 후 실발송 확인 |
| Perplexity 스냅샷 수집 | API 키 설정 후 실제 AI 응답 + 인용 소스 확인 |
| Google Ads 검색량 | API 키 설정 후 절대 검색량 반환 확인 |
| 기간 비교 정확성 | 실데이터 2주+ 축적 후 비교 결과 정합성 확인 |
