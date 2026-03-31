# X2 Source Normalization Schema

## 공통 정규화 구조

### RawSocialMention (DB 모델)

모든 소셜/뉴스/검색 원문이 이 스키마로 정규화됨.

```
id                String     // 유니크 ID
projectId         String     // 프로젝트
platform          Enum       // YOUTUBE | INSTAGRAM | TIKTOK | X | NAVER_BLOG | NAVER_NEWS | NAVER_CAFE | NAVER_KIN | NEWS_API | NEWS_HEADLINES | GDELT | COMMUNITY
platformPostId    String     // 원본 플랫폼 ID
postUrl           String?    // 원문 URL (drill-down용)
authorName        String?    // 작성자
authorHandle      String?    // @핸들
authorFollowers   Int?       // 팔로워 수
text              String     // 본문/제목+설명
mediaType         Enum?      // TEXT | IMAGE | VIDEO | CAROUSEL | LIVE
publishedAt       DateTime   // 게시 시각
viewCount         Int        // 조회수
likeCount         Int        // 좋아요
commentCount      Int        // 댓글수
shareCount        Int        // 공유수
engagementRate    Float      // 참여율
matchedKeyword    String     // 매칭된 키워드
matchType         Enum       // EXACT | HASHTAG | CONTEXT
sentiment         Enum?      // POSITIVE | NEUTRAL | NEGATIVE
topics            String[]   // 추출된 토픽
isSpam            Boolean    // 스팸 여부
collectedAt       DateTime   // 수집 시각
```

### NormalizedSearch (TypeScript 타입)

검색 데이터 소스의 정규화 구조.

```
keyword           String     // 원본 키워드
normalizedKeyword String     // 소문자/트림
locale            String     // "ko", "en" 등
country?          String     // ISO 3166-1 alpha-2 (KR, US, JP...)
language?         String     // ISO 639-1 (ko, en, ja...)
source            Enum       // google_ads | naver_search | serp_api | dataforseo | mock...
collectedAt       String     // ISO 날짜
```

### 지원 국가/언어

```
SupportedCountry: KR | US | JP | CN | GB | DE | FR | IN | BR | AU | CA | SG | TH | VN | ID
SupportedLanguage: ko | en | ja | zh | de | fr | es | pt | th | vi | id
COUNTRY_LANGUAGE_MAP: { KR: "ko", US: "en", JP: "ja", ... }
```

### sourceType 분류 체계

```
소셜:      YOUTUBE | INSTAGRAM | TIKTOK | X | COMMUNITY
국내 검색: NAVER_BLOG | NAVER_NEWS | NAVER_CAFE | NAVER_KIN
글로벌:    NEWS_API | NEWS_HEADLINES | GDELT
```

### SourceRef (Evidence 시스템)

```
sourceType: "SEARCH_ENGINE" | "ANALYTICS" | "SOCIAL" | "AEO_SNAPSHOT" | "INTERNAL" | "CITATION"
```
