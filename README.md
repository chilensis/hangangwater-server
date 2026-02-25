# 한강물 서버

접속 통계 API와 서울시 대기질 API 프록시를 제공하는 Express 서버입니다.

---

## 1. 로컬에서 실행하는 방법

### 1-1. 저장소 클론 및 의존성 설치

```bash
git clone <이 레포 주소>
cd hangangwater-server
pnpm install
```

### 1-2. 환경 변수 설정

1. 프로젝트 루트에 `.env` 파일을 만듭니다.
2. 아래 내용을 넣고, `SEOUL_OPENAPI_KEY` 값만 **본인 인증키**로 바꿔서 저장합니다.

```env
# 서울 열린데이터광장 인증키 (https://data.seoul.go.kr 에서 발급)
SEOUL_OPENAPI_KEY=여기에_인증키_입력
```

- 인증키가 없으면 **대기질 API**(`/api/air-quality`)만 동작하지 않고, 접속 통계 API는 그대로 동작합니다.
- `.env`는 Git에 올라가지 않습니다. (`.gitignore`에 포함됨)

### 1-3. 서버 실행

```bash
node --experimental-strip-types src/index.ts
```

- 터미널에 `http://localhost:3000` 이 뜨면 성공입니다.
- 포트를 바꾸려면: `PORT=4000 node --experimental-strip-types src/index.ts`

### 1-4. 동작 확인

- 브라우저에서 **http://localhost:3000** → 접속 통계 페이지로 이동합니다.
- **http://localhost:3000/api/stats/total** → 오늘/전체 접속 수 JSON.
- **http://localhost:3000/api/air-quality** → 대기질 데이터 JSON (환경 변수 설정 시).

---

## 2. Vercel에 배포하는 방법

### 2-1. Vercel에 프로젝트 연결

1. [Vercel](https://vercel.com) 로그인 후 **Add New** → **Project** 선택.
2. 이 레포(GitHub 등)를 선택하고 **Import**.
3. Framework Preset은 그대로 두거나 **Other** 선택 후 **Deploy** 진행.

### 2-2. 환경 변수 등록 (필수)

배포 후 **대기질 API**를 쓰려면 반드시 설정해야 합니다.

1. Vercel 대시보드에서 해당 프로젝트 선택.
2. **Settings** → **Environment Variables** 이동.
3. 아래처럼 추가합니다.

| Name               | Value        | Environment   |
|--------------------|-------------|----------------|
| `SEOUL_OPENAPI_KEY` | (발급받은 인증키) | Production, Preview |

4. **Save** 후, **Deployments**에서 **Redeploy** 한 번 하면 적용됩니다.

### 2-3. 배포 후 확인

- `https://(프로젝트명).vercel.app` 에 접속해 동작을 확인합니다.
- `https://(프로젝트명).vercel.app/api/stats/total`
- `https://(프로젝트명).vercel.app/api/air-quality`

---

## 3. 제공 API 요약

| 경로 | 설명 |
|------|------|
| `GET /` | `/api/stats/total` 로 리다이렉트 |
| `GET /api/stats/total` | 오늘 접속 수 + 전체 누적 접속 수 (쿠키로 1인 1회 집계) |
| `GET /api/air-quality` | 서울시 자치구별 대기질(미세먼지/초미세먼지) 데이터 |

---

## 4. API 상세

### 4-1. 접속 통계 `GET /api/stats/total`

- **쿼리**: 없음.
- **동작**: 호출 시 쿠키로 “오늘 이미 집계된 사용자”인지 판별. 처음이면 1명 추가 후 통계 반환.
- **응답 예시**

```json
{
  "instanceId": "07wzik",
  "today": 9,
  "allTime": 9,
  "date": "2026-02-17",
  "timezone": "Asia/Seoul"
}
```

- **클라이언트**: `fetch(url, { credentials: 'include' })` 로 호출해야 쿠키가 전달되어 1인 1회 집계가 됩니다.

### 4-2. 대기질 `GET /api/air-quality`

- **쿼리**
  - `districtCode` (선택): 서울 자치구 행정코드. 예: `111151`(중랑구). 없으면 최대 5건 조회.
- **호출 예**
  - 전체(1~5건): `GET /api/air-quality`
  - 특정 구: `GET /api/air-quality?districtCode=111151`
- **응답 예시**

```json
{
  "response": {
    "header": { "resultCode": "00" },
    "body": {
      "totalCount": 1,
      "items": {
        "item": [
          { "PM": "15", "FPM": "8", "MSRSTN_NM": "중랑구" }
        ]
      }
    }
  }
}
```

- `PM`: 미세먼지(PM10), `FPM`: 초미세먼지(PM2.5), `MSRSTN_NM`: 측정소(자치구) 이름.

---

## 5. CORS (토스 미니앱 등)

다음 Origin에서 API 호출이 가능하도록 허용되어 있습니다.

- `https://*.private-apps.tossmini.com` (QR 테스트)
- `https://*.apps.tossmini.com` (실제 서비스)

위 도메인에서는 `fetch(API_URL, { credentials: 'include' })` 로 호출하면 됩니다.

---

## 6. 참고 사항

- **통계**: 메모리에만 저장되며, 서버 재시작 시 초기화됩니다. Vercel처럼 인스턴스가 여러 개면 요청마다 숫자가 다르게 나올 수 있습니다.
- **시간**: 모든 기준은 **Asia/Seoul(KST)** 입니다.
- **같은 IP**: 10분에 1회만 카운트해, 중복 호출로 인한 과다 집계를 완화합니다.
