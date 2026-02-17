# 한강물 서버

Express 기반 접속 통계. 오전 0시(KST) 기준으로 일별 초기화됩니다.

## 실행

```bash
pnpm install
node --experimental-strip-types src/index.ts
```

기본 포트는 `3000`이며, `PORT` 환경 변수로 변경할 수 있습니다.

## API

**`GET /api/stats/total`**

- **같은 사용자(쿠키 기준)는 당일 1번만** 카운트합니다. 같은 날 리로드/재호출해도 인원수는 늘지 않습니다.
- 쿠키 `hw_visit`에는 **마지막 집계 시각(타임스탬프 ms)** 이 저장됩니다. 서버는 이 값이 오늘 00:00~24:00 KST 구간 안인지로 당일 중복 여부를 판별합니다.
- `GET /` 로 접속하면 `/api/stats/total` 로 리다이렉트됩니다.
- **클라이언트**: 이 API를 호출할 때 **쿠키가 전달되어야** 중복 제거가 동작합니다(같은 도메인에서 호출하거나 `fetch` 시 `credentials: 'include'` 등).

**응답 예:**

```json
{
  "instanceId": "07wzik",
  "today": 9,
  "allTime": 9,
  "date": "2026-02-17",
  "timezone": "Asia/Seoul"
}
```

- `today`: 오늘(KST) 이 API를 호출한 횟수 (매일 00:00 KST 초기화)
- `allTime`: 서버 기동 후 누적 호출 횟수

## 통계가 요청마다 다르게 나올 때

통계는 **프로세스 메모리**에만 있어서, **인스턴스(프로세스)마다 숫자가 따로** 쌓입니다.

- **Vercel 등 서버리스**: 요청마다 다른 인스턴스가 담당할 수 있어, `today` / `allTime`이 요청할 때마다 줄었다 늘었다 할 수 있음.
- **확인 방법**: 응답의 `instanceId`가 호출마다 바뀌면 서로 다른 인스턴스에 요청이 간 것입니다.

**안정적으로 한 통계를 쓰려면:** 단일 인스턴스에서만 서버를 돌리거나, DB/Redis 등 공용 저장소에 저장하도록 바꾸면 됩니다.

## CORS

토스 미니앱(테스트/실제)에서 API 호출이 되도록 다음 Origin을 허용합니다.

- `https://*.private-apps.tossmini.com` (QR 테스트)
- `https://*.apps.tossmini.com` (실제 서비스)

`credentials: true`로 설정되어 있어, 위 도메인에서 `fetch(..., { credentials: 'include' })`로 호출하면 쿠키가 전달됩니다.

## 참고

- 통계는 메모리에만 저장되며, 서버 재시작 시 초기화됩니다.
- 모든 시간은 **Asia/Seoul(KST)** 기준입니다.
