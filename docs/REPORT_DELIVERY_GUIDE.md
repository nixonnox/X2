# Report Delivery Guide

## Email Delivery

### Dev Mode (MockEmailProvider)

- 항상 성공 응답 반환
- 200ms 지연 시뮬레이션
- 발송 로그 유지 (`getSentLog()`)

### Production (ResendEmailProvider)

```typescript
// report-delivery.ts의 scaffold 참고
import { Resend } from "resend";

class ResendEmailProvider implements IEmailProvider {
  private client: Resend;
  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }
  async send(params) {
    const { data, error } = await this.client.emails.send({
      from: "X2 Reports <reports@x2.app>",
      to: params.to,
      subject: params.subject,
      html: params.body,
    });
    return { success: !error, messageId: data?.id, error: error?.message };
  }
}
```

### Email Template

한국어 플레인텍스트 형식:

- 핵심 KPI 4개 (조회수, 참여율, 팔로워, 댓글)
- 주요 인사이트 3개
- 리포트 링크

## Share Links

### Creating

```typescript
import { shareLinkService } from "@/lib/reports";

const link = shareLinkService.create("rpt-001", 30); // 30일 만료
// → /reports/shared/{token}
```

### Features

- 32자 랜덤 토큰 생성
- 만료일 설정 (optional)
- 조회수 카운팅
- 활성/비활성 토글
- 공개 뷰어 페이지 (`/reports/shared/[token]`)

### Management

```typescript
shareLinkService.getByToken(token);
shareLinkService.getByReportId(reportId);
shareLinkService.incrementViewCount(token);
shareLinkService.disable(token);
shareLinkService.enable(token);
```

## Delivery Status Flow

```
pending → sent (성공)
pending → failed (실패)
```
