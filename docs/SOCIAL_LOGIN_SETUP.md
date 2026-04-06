# 소셜 로그인 설정 가이드

X2 프로젝트의 소셜 로그인(Google, Naver, Kakao)을 설정하는 방법입니다.

## 아키텍처

- Auth.js v5 (NextAuth) 기반
- 설정 파일: `packages/auth/src/config.ts`
- API 라우트: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- 콜백 URL 패턴: `https://{도메인}/api/auth/callback/{provider}`

환경변수가 설정된 provider만 자동으로 활성화됩니다.

---

## Google OAuth

### 1. Google Cloud Console 설정

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 프로젝트 선택 (또는 새 프로젝트 생성)
3. **API 및 서비스** > **사용자 인증 정보** 이동
4. **사용자 인증 정보 만들기** > **OAuth 클라이언트 ID** 선택
5. 애플리케이션 유형: **웹 애플리케이션**
6. 승인된 리다이렉션 URI 추가:
   - 프로덕션: `https://x2-nixonnox.vercel.app/api/auth/callback/google`
   - 로컬 개발: `http://localhost:3000/api/auth/callback/google`

### 2. 환경변수

```
AUTH_GOOGLE_ID=클라이언트_ID
AUTH_GOOGLE_SECRET=클라이언트_보안_비밀번호
```

---

## Naver Login

### 1. 네이버 개발자센터 설정

1. [네이버 개발자센터](https://developers.naver.com) 접속
2. **Application** > **애플리케이션 등록** 이동
3. 사용 API: **네이버 로그인** 선택
4. 제공 정보 선택: 이메일(필수), 이름, 프로필 사진
5. 환경: **PC 웹** 선택
6. 서비스 URL: `https://x2-nixonnox.vercel.app`
7. Callback URL:
   - 프로덕션: `https://x2-nixonnox.vercel.app/api/auth/callback/naver`
   - 로컬 개발: `http://localhost:3000/api/auth/callback/naver`

### 2. 환경변수

```
AUTH_NAVER_ID=Client_ID
AUTH_NAVER_SECRET=Client_Secret
```

---

## Kakao Login

### 1. 카카오 개발자센터 설정

1. [카카오 개발자센터](https://developers.kakao.com) 접속
2. **내 애플리케이션** > **애플리케이션 추가하기**
3. 앱 생성 후 **카카오 로그인** 활성화
4. **카카오 로그인** > **Redirect URI** 등록:
   - 프로덕션: `https://x2-nixonnox.vercel.app/api/auth/callback/kakao`
   - 로컬 개발: `http://localhost:3000/api/auth/callback/kakao`
5. **동의 항목** 설정: 닉네임(필수), 이메일(필수), 프로필 사진(선택)
6. **보안** > **Client Secret** 생성 및 활성화

### 2. 환경변수

```
AUTH_KAKAO_ID=REST_API_키  (앱 키 > REST API 키)
AUTH_KAKAO_SECRET=Client_Secret  (보안 > Client Secret 코드)
```

---

## Vercel 환경변수 설정

CLI로 설정하는 방법:

```bash
# Google
vercel env add AUTH_GOOGLE_ID production
vercel env add AUTH_GOOGLE_SECRET production

# Naver
vercel env add AUTH_NAVER_ID production
vercel env add AUTH_NAVER_SECRET production

# Kakao
vercel env add AUTH_KAKAO_ID production
vercel env add AUTH_KAKAO_SECRET production
```

또는 Vercel 대시보드에서 **Settings** > **Environment Variables**에서 직접 추가합니다.

---

## 로컬 개발 환경

`.env.local` 파일에 환경변수를 추가합니다:

```env
# 소셜 로그인 (선택 - 없으면 해당 provider 비활성화)
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_NAVER_ID=...
AUTH_NAVER_SECRET=...
AUTH_KAKAO_ID=...
AUTH_KAKAO_SECRET=...

# 개발용 간편 로그인 (소셜 로그인 없이 테스트 가능)
AUTH_DEV_LOGIN=true
```

소셜 로그인 키 없이도 `AUTH_DEV_LOGIN=true`로 로컬 개발이 가능합니다.

---

## 체크리스트

- [ ] Google OAuth 클라이언트 생성 및 콜백 URL 등록
- [ ] Naver 애플리케이션 등록 및 콜백 URL 등록
- [ ] Kakao 애플리케이션 등록 및 콜백 URL 등록
- [ ] Vercel에 6개 환경변수 등록
- [ ] 배포 후 각 소셜 로그인 테스트
