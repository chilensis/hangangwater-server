import express from 'express'
import cors from 'cors'

const app = express()

const ALLOWED_ORIGIN_SUFFIXES = ['.private-apps.tossmini.com', '.apps.tossmini.com']
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || !origin.startsWith('https://')) return false
  return ALLOWED_ORIGIN_SUFFIXES.some((s) => origin.endsWith(s))
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) {
        cb(null, origin!)
      } else {
        cb(null, false)
      }
    },
    credentials: true,
  })
)

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const COOKIE_VISIT = 'hw_visit'

function getTodayStartKST(): number {
  const utc = Date.now()
  const kstVirtual = new Date(utc + KST_OFFSET_MS)
  const y = kstVirtual.getUTCFullYear()
  const m = kstVirtual.getUTCMonth()
  const d = kstVirtual.getUTCDate()
  return Date.UTC(y, m, d, 0, 0, 0, 0) - KST_OFFSET_MS
}

function getTodayDateStringKST(): string {
  return new Date(getTodayStartKST() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

const ONE_DAY_MS = 86400 * 1000

/** 쿠키에 저장된 타임스탬프(ms)가 오늘 KST 구간 안이면 true */
function isVisitTimeWithinTodayKST(visitTs: number): boolean {
  const todayStart = getTodayStartKST()
  return visitTs >= todayStart && visitTs < todayStart + ONE_DAY_MS
}

function getCookie(req: express.Request, name: string): string | undefined {
  const raw = req.headers.cookie
  if (!raw) return undefined
  const found = raw.split(';').map((s) => s.trim().split('=')).find(([k]) => k === name)
  return found ? decodeURIComponent(found[1] ?? '') : undefined
}

const instanceId = Math.random().toString(36).slice(2, 8)
let todayStartKST = getTodayStartKST()
let todayCount = 0
let allTimeTotal = 0

/** 같은 IP가 N분 안에 여러 번 호출해도 1명으로만 셈 (쿠키 없는 요청·중복 호출 완화) */
const IP_COOLDOWN_MS = 10 * 60 * 1000 // 10분
const lastCountByIp = new Map<string, number>()

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for']
  const first = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : forwarded?.[0]
  return first || req.socket?.remoteAddress || req.ip || ''
}

app.get('/api/stats/total', (req, res) => {
  const nowStart = getTodayStartKST()
  if (nowStart > todayStartKST) {
    todayStartKST = nowStart
    todayCount = 0
    lastCountByIp.clear()
  }

  const now = Date.now()
  const todayStr = getTodayDateStringKST()
  const visitCookieRaw = getCookie(req, COOKIE_VISIT)?.trim()
  const visitTs = visitCookieRaw ? Number(visitCookieRaw) : NaN
  const alreadyCountedToday = !Number.isNaN(visitTs) && isVisitTimeWithinTodayKST(visitTs)

  const ip = getClientIp(req)
  const lastCountAt = lastCountByIp.get(ip)
  const withinIpCooldown = lastCountAt != null && now - lastCountAt < IP_COOLDOWN_MS

  if (!alreadyCountedToday && !withinIpCooldown) {
    todayCount += 1
    allTimeTotal += 1
    if (ip) lastCountByIp.set(ip, now)
    for (const [k, t] of lastCountByIp.entries()) {
      if (now - t > IP_COOLDOWN_MS) lastCountByIp.delete(k)
    }
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_VISIT}=${now}; Path=/; Max-Age=${86400 * 2}; SameSite=None; Secure`
    )
  } else if (todayCount === 0) {
    // 재시작/다른 인스턴스로 메모리가 0인데, 쿠키로 오늘 방문자는 있음 → 최소 1명으로 표시
    todayCount = 1
    if (allTimeTotal === 0) allTimeTotal = 1
  }

  res.json({
    instanceId,
    today: todayCount,
    allTime: allTimeTotal,
    date: todayStr,
    timezone: 'Asia/Seoul',
  })
})

app.get('/', (req, res) => {
  res.redirect('/api/stats/total')
})

const port = Number(process.env.PORT) || 3000
app.listen(port, () => console.log(`http://localhost:${port}`))

export default app
