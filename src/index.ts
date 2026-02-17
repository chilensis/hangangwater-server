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
  todayCount += 1
  allTimeTotal += 1

  res.json({
    instanceId,
    today: todayCount,
    allTime: allTimeTotal,
    date: new Date(todayStartKST + KST_OFFSET_MS).toISOString().slice(0, 10),
    timezone: 'Asia/Seoul',
  })
})

app.get('/', (req, res) => {
  res.redirect('/api/stats/total')
})

const port = Number(process.env.PORT) || 3000
app.listen(port, () => console.log(`http://localhost:${port}`))

export default app
