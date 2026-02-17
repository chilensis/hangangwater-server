import express from 'express'

const app = express()
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

app.get('/api/stats/total', (req, res) => {
  const nowStart = getTodayStartKST()
  if (nowStart > todayStartKST) {
    todayStartKST = nowStart
    todayCount = 0
  }

  const todayStr = getTodayDateStringKST()
  const alreadyCountedToday = getCookie(req, COOKIE_VISIT) === todayStr

  if (!alreadyCountedToday) {
    todayCount += 1
    allTimeTotal += 1
    res.setHeader(
      'Set-Cookie',
      `${COOKIE_VISIT}=${todayStr}; Path=/; Max-Age=${86400 * 2}; SameSite=Lax`
    )
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
