# 한강물 서버

Express 기반 접속 통계 API 서버. 오전 0시(KST) 기준으로 일별 초기화되며, 시간별 접속 인원과 총 접속 인원을 조회할 수 있습니다.

## 실행

```bash
pnpm install
node --experimental-strip-types src/index.ts
```

기본 포트는 `3000`이며, `PORT` 환경 변수로 변경할 수 있습니다.

## API

| 경로 | 설명 |
|------|------|
| `GET /` | 홈. 접속 시 `/api/visit`이 호출되어 1회 기록됩니다. |
| `GET /api/visit` | 접속 1회 기록 (204 No Content) |
| `GET /api/stats/hourly` | **시간별 접속 인원** (당일 0~23시, KST) |
| `GET /api/stats/total` | **총 접속 인원** (오늘 + 전체 누적) |

### 시간별 접속 `GET /api/stats/hourly`

- 당일(KST) 0시~23시 구간별 접속 횟수
- 매일 00:00 KST에 초기화

**응답 예:**

```json
{
  "date": "2025-02-17",
  "timezone": "Asia/Seoul",
  "hourly": [
    { "hour": 0, "count": 3 },
    { "hour": 1, "count": 0 },
    ...
  ]
}
```

### 총 접속 `GET /api/stats/total`

- `today`: 오늘(KST) 접속 횟수
- `allTime`: 서버 기동 후 누적 접속 횟수

**응답 예:**

```json
{
  "today": 42,
  "allTime": 1234,
  "date": "2025-02-17",
  "timezone": "Asia/Seoul"
}
```

## 통계가 요청마다 다르게 나올 때

통계는 **프로세스 메모리**에만 있어서, **인스턴스(프로세스)마다 숫자가 따로** 쌓입니다.

- **Vercel 등 서버리스**: 요청마다 다른 인스턴스가 담당할 수 있어, `today` / `allTime`이 요청할 때마다 줄었다 늘었다 할 수 있음.
- **확인 방법**: `/api/stats/total` 응답에 `instanceId`가 들어 있습니다. 여러 번 호출했을 때 `instanceId`가 바뀌면 서로 다른 인스턴스에 요청이 간 것이고, 그래서 숫자가 들쭉날쭉한 것.

**안정적으로 한 통계를 쓰려면:**

1. **단일 인스턴스**에서만 서버를 돌리거나  
2. **DB나 Redis** 같은 공용 저장소에 접속 수를 저장하도록 바꾸면 됩니다.

## 참고

- 통계는 메모리에만 저장되며, 서버 재시작 시 초기화됩니다.
- 모든 시간은 **Asia/Seoul(KST)** 기준입니다.
- 응답의 `instanceId`는 이 프로세스 식별용이며, 같은 인스턴스면 값이 동일합니다.
