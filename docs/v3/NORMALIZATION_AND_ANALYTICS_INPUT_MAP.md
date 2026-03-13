# Normalization & Analytics Input Map

> Phase 5 산출물 2/4 — 정규화 레이어 및 분석 엔진 입력 매핑

## 1. Normalization Layer

### 1.1 Data Flow

```
Platform API Response (raw)
    │
    ▼
normalizeChannel() / normalizeContent() / normalizeComment() / normalizeMention()
    │
    ▼
NormalizedChannel / NormalizedContent / NormalizedComment / NormalizedMention
    │
    ▼
Repository.upsert() / Repository.bulkCreate()
    │
    ▼
Prisma Model (DB record)
```

### 1.2 Channel Normalization

| Source Field (ChannelInfo) | Normalized Field    | DB Column                      | Transform |
| -------------------------- | ------------------- | ------------------------------ | --------- |
| `platform`                 | `platform`          | `channels.platform`            | Direct    |
| `platformChannelId`        | `platformChannelId` | `channels.platform_channel_id` | Direct    |
| `name`                     | `name`              | `channels.name`                | Direct    |
| `url`                      | `url`               | `channels.url`                 | Direct    |
| `thumbnailUrl`             | `thumbnailUrl`      | `channels.thumbnail_url`       | Direct    |
| `subscriberCount`          | `subscriberCount`   | `channels.subscriber_count`    | Null → 0  |
| `contentCount`             | `contentCount`      | `channels.content_count`       | Null → 0  |

### 1.3 Content Normalization

| Source Field (ContentInfo) | Normalized Field    | DB Column                      | Transform                                                                |
| -------------------------- | ------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `platformContentId`        | `platformContentId` | `contents.platform_content_id` | Direct                                                                   |
| `title`                    | `title`             | `contents.title`               | Direct                                                                   |
| `description`              | `description`       | `contents.description`         | Direct                                                                   |
| _(derived from platform)_  | `contentType`       | `contents.content_type`        | Platform map: youtube→VIDEO, instagram→POST, tiktok→SHORT_VIDEO, x→TWEET |
| _(built from platform+id)_ | `url`               | `contents.url`                 | `buildContentUrl(platform, contentId)`                                   |
| `thumbnailUrl`             | `thumbnailUrl`      | `contents.thumbnail_url`       | Direct                                                                   |
| `publishedAt`              | `publishedAt`       | `contents.published_at`        | Date coercion                                                            |
| `viewCount`                | `viewCount`         | `contents.view_count`          | Direct                                                                   |
| `likeCount`                | `likeCount`         | `contents.like_count`          | Direct                                                                   |
| `commentCount`             | `commentCount`      | `contents.comment_count`       | Direct                                                                   |
| _(calculated)_             | `engagementRate`    | `contents.engagement_rate`     | `(likes + comments) / views * 100`, 2 decimal places                     |

### 1.4 Comment Normalization

**YouTube-specific** (`normalizeYouTubeComment`):

| Source Field                                        | Normalized Field    | Transform    |
| --------------------------------------------------- | ------------------- | ------------ |
| `snippet.topLevelComment.id`                        | `platformCommentId` | Direct       |
| `snippet.topLevelComment.snippet.authorDisplayName` | `authorName`        | Direct       |
| `snippet.topLevelComment.snippet.authorChannelUrl`  | `authorProfileUrl`  | Null-safe    |
| `snippet.topLevelComment.snippet.textDisplay`       | `text`              | Direct       |
| `snippet.topLevelComment.snippet.likeCount`         | `likeCount`         | Direct       |
| `snippet.topLevelComment.snippet.publishedAt`       | `publishedAt`       | `new Date()` |

**Generic** (`normalizeComment`): Flat key mapping with defaults.

### 1.5 Mention Normalization

| Source Field    | Normalized Field | Transform                                       |
| --------------- | ---------------- | ----------------------------------------------- |
| `platform`      | `platform`       | Direct                                          |
| `sourceUrl`     | `sourceUrl`      | Direct                                          |
| `authorName`    | `authorName`     | Null-safe                                       |
| `text`          | `text`           | Direct                                          |
| `mentionedAt`   | `mentionedAt`    | Date coercion                                   |
| `sentiment`     | `sentiment`      | Validated: POSITIVE/NEGATIVE/NEUTRAL/MIXED only |
| `reachEstimate` | `reachEstimate`  | Default 0                                       |

## 2. Analytics Engine Connection

### 2.1 Dual-Mode Architecture

`AnalyticsInputBuilder`는 두 가지 모드로 동작:

**Direct dispatch** (서비스 직접 호출):

- `createServices()`에서 4개 분석 서비스를 `setServices()`로 주입
- `dispatchXxx()` 메서드가 해당 서비스 메서드를 직접 호출
- 동기적 처리 — 수집 완료 후 즉시 분석 시작

**Input building** (큐 페이로드 생성):

- `buildXxxInputs()` 메서드가 직렬화 가능한 typed 배열 반환
- BullMQ 연동 시 큐에 push하여 비동기 처리
- 대규모 분석 시 사용 (현재 TODO)

### 2.2 Comment Analysis

**Trigger**: After content/comment collection → `dispatchCommentAnalysis(trace)` or `buildCommentAnalysisInputs()`

| Mode   | Flow                                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Direct | `comment.findUnanalyzed()` → group by contentId → `CommentAnalysisService.analyzeComments(contentId, trace)` per group |
| Queue  | `comment.findUnanalyzed()` → `CommentAnalysisInput[]` for BullMQ                                                       |

**Service input**: `analyzeComments(contentId: string, trace)` — service internally calls `findUnanalyzed()` again within its batch size
**Output**: CommentAnalysis record (sentiment, isQuestion, isRisk, isSpam, topics, keyPhrases)

### 2.3 Listening Analysis

**Trigger**: Listening scheduled job → `dispatchListeningAnalysis(projectId, trace)` or `buildListeningInputs()`

| Mode   | Flow                                                                                                                        |
| ------ | --------------------------------------------------------------------------------------------------------------------------- |
| Direct | `ListeningAnalysisService.collectMentions(projectId, trace)` — service handles keyword lookup + mention fetching internally |
| Queue  | `mention.findByProject()` → keyword matching → `ListeningAnalysisInput[]`                                                   |

**Service input**: `collectMentions(projectId, trace)` — self-contained, fetches keywords and mentions internally
**Output**: Mention records with sentiment, keyword performance metrics

### 2.4 Intent Analysis

**Trigger**: Intent scheduled job → `dispatchIntentAnalysis(projectId, trace)` or `buildIntentInputs()`

| Mode   | Flow                                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Direct | `intent.findQueriesByProject()` → filter QUEUED/IN_PROGRESS → `IntentAnalysisService.processIntentAnalysis(queryId, trace)` per query |
| Queue  | `intent.findQueriesByProject()` → filter → `IntentAnalysisInput[]`                                                                    |

**Service input**: `processIntentAnalysis(queryId, trace)` — fetches query by ID, runs AI expansion, saves results
**Output**: IntentKeywordResult records, resultGraph, resultSummary

### 2.5 GEO/AEO Visibility

**Trigger**: GEO/AEO scheduled job → `dispatchGeoAeoCollection(projectId, trace)` or `buildGeoAeoInputs()`

| Mode   | Flow                                                                                        |
| ------ | ------------------------------------------------------------------------------------------- |
| Direct | `GeoAeoService.collectSnapshots(projectId, trace)` — iterates keywords × engines internally |
| Queue  | `aeo.findKeywordsByProject()` × 4 engines → `GeoAeoInput[]`                                 |

**Service input**: `collectSnapshots(projectId, trace)` — self-contained, handles keyword and engine iteration
**Output**: AeoSnapshot records, CitationReadyReportSource updates

## 3. Upsert Strategies Summary

| Entity             | Unique Key                                 | Strategy                    |
| ------------------ | ------------------------------------------ | --------------------------- |
| Channel            | `[projectId, platform, platformChannelId]` | Update metadata on conflict |
| Content            | `[channelId, platformContentId]`           | Update metrics on conflict  |
| ContentMetricDaily | `[contentId, date]`                        | Update daily snapshot       |
| ChannelSnapshot    | `[channelId, date]`                        | Update daily snapshot       |
| Comment            | `skipDuplicates` on bulk create            | Skip existing records       |
| RawSocialMention   | `[projectId, platform, platformPostId]`    | Skip duplicates             |
| AeoSnapshot        | `[keywordId, date, engine]`                | Update on conflict          |
