import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 700 } })
await p.goto('http://localhost:3001/portfolio?demo', { waitUntil: 'networkidle' })
const btn = p.getByRole('button', { name: 'START DEMO WALLET', exact: true })
if (await btn.count()) await btn.click()
await p.waitForTimeout(3000)
await p.screenshot({ path: '/tmp/pf-size.png', clip: { x: 0, y: 130, width: 1440, height: 220 } })
await b.close()
