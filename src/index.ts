import express from 'express'

const app = express()
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

function getTodayStartKST(): number {
  const utc = Date.now()
  const kstVirtual = new Date(utc + KST_OFFSET_MS)
  const y = kstVirtual.getUTCFullYear()
  const m = kstVirtual.getUTCMonth()
  const d = kstVirtual.getUTCDate()
  return Date.UTC(y, m, d, 0, 0, 0, 0) - KST_OFFSET_MS
}

function isTodayKST(ts: number): boolean {
  return ts >= getTodayStartKST()
}

function getHourKST(ts: number): number {
  const d = new Date(ts + KST_OFFSET_MS)
  return d.getUTCHours()
}

let todayStartKST = getTodayStartKST()
const hourlyCounts = new Array<number>(24).fill(0)
let allTimeTotal = 0

function ensureDayAndRecord(ts: number) {
  const nowStart = getTodayStartKST()
  if (nowStart > todayStartKST) {
    todayStartKST = nowStart
    hourlyCounts.fill(0)
  }
  if (isTodayKST(ts)) {
    const hour = getHourKST(ts)
    hourlyCounts[hour] += 1
  }
  allTimeTotal += 1
}

app.get('/api/visit', (req, res) => {
  const ts = Date.now()
  ensureDayAndRecord(ts)
  res.status(204).send()
})

app.get('/api/stats/hourly', (req, res) => {
  const nowStart = getTodayStartKST()
  if (nowStart > todayStartKST) {
    todayStartKST = nowStart
    hourlyCounts.fill(0)
  }
  const items = hourlyCounts.map((count, hour) => ({ hour, count }))
  res.json({
    date: new Date(todayStartKST + KST_OFFSET_MS).toISOString().slice(0, 10),
    timezone: 'Asia/Seoul',
    hourly: items,
  })
})

app.get('/api/stats/total', (req, res) => {
  const nowStart = getTodayStartKST()
  if (nowStart > todayStartKST) {
    todayStartKST = nowStart
    hourlyCounts.fill(0)
  }
  const todayTotal = hourlyCounts.reduce((a, b) => a + b, 0)
  res.json({
    today: todayTotal,
    allTime: allTimeTotal,
    date: new Date(todayStartKST + KST_OFFSET_MS).toISOString().slice(0, 10),
    timezone: 'Asia/Seoul',
  })
})

app.get('/', (req, res) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head><meta charset="utf-8"/><title>한강물</title></head>
      <body>
        <a href="/api/stats/hourly">시간별 접속</a>
        <a href="/api/stats/total">총 접속</a>
        <script>fetch('/api/visit').catch(() => {})</script>
      </body>
    </html>
  `)
})

const port = Number(process.env.PORT) || 3000
app.listen(port, () => console.log(`http://localhost:${port}`))

export default app
