// Порівняння скріншотів сторінок до і після змін
// npm run shots           - зібрати проєкт, зняти скріншоти та порівняти з еталоном
// npm run shots -- --update - зібрати проєкт і зберегти скріншоти як новий еталон
// Налаштування шаблону
import templateConfig from '../template.config.js'
// Логгер
import logger from './logger.js'

import fs from 'fs'
import path from 'path'
import http from 'http'
import { globSync } from 'glob'
import { chromium } from 'playwright-core'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const config = {
	widths: [1920, 1200, 992, 768, 375, 320],
	threshold: 0.1,
	maxdiff: 0.1,
	...templateConfig.screenshots
}
const isUpdate = process.argv.includes('--update')
const root = 'screenshots'
const dirs = {
	baseline: `${root}/baseline`,
	current: `${root}/current`,
	diff: `${root}/diff`
}
const mimeTypes = {
	'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
	'.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
	'.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
	'.woff2': 'font/woff2', '.woff': 'font/woff', '.mp4': 'video/mp4'
}

// Простий сервер для dist: модулі JS не працюють через file://
function startServer() {
	const server = http.createServer((request, response) => {
		let file = decodeURIComponent(request.url.split('?')[0])
		file = path.join('dist', file.endsWith('/') ? `${file}index.html` : file)
		if (!path.resolve(file).startsWith(path.resolve('dist')) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
			response.writeHead(404)
			response.end()
			return
		}
		response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file)] || 'application/octet-stream' })
		fs.createReadStream(file).pipe(response)
	})
	return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)))
}
// Браузер: встановлений Edge або Chrome, без завантаження окремого Chromium
async function launchBrowser() {
	for (const channel of ['msedge', 'chrome', undefined]) {
		try {
			return await chromium.launch({ channel })
		} catch (error) { }
	}
	logger(`_SHOTS_NO_BROWSER`)
	process.exit(1)
}
// Зображення однакового розміру для порівняння (менше доповнюється прозорими пікселями)
function resizeTo(image, width, height) {
	if (image.width === width && image.height === height) return image
	const output = new PNG({ width, height })
	PNG.bitblt(image, output, 0, 0, image.width, image.height, 0, 0)
	return output
}

async function run() {
	const pages = globSync('dist/*.html').map(file => path.basename(file)).sort()
	if (!pages.length) {
		logger(`_SHOTS_NO_PAGES`)
		process.exit(1)
	}
	const target = isUpdate ? dirs.baseline : dirs.current
	fs.rmSync(target, { recursive: true, force: true })
	fs.rmSync(dirs.diff, { recursive: true, force: true })
	fs.mkdirSync(target, { recursive: true })

	const server = await startServer()
	const browser = await launchBrowser()
	const context = await browser.newContext({ reducedMotion: 'reduce' })
	const page = await context.newPage()
	const overflow = []

	logger(`_SHOTS_START`, [pages.length, config.widths.length])
	for (const pageName of pages) {
		for (const width of config.widths) {
			await page.setViewportSize({ width, height: 900 })
			await page.goto(`http://127.0.0.1:${server.address().port}/${pageName}`, { waitUntil: 'networkidle' })
			// Без анімацій і курсора, щоб скріншоти не відрізнялись випадково
			await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}' })
			await page.evaluate(async () => {
				await document.fonts.ready
				// Ліниві зображення завантажуються лише біля екрана
				document.querySelectorAll('img[loading="lazy"]').forEach(image => image.loading = 'eager')
				await Promise.all(Array.from(document.images).filter(image => !image.complete).map(image => new Promise(resolve => { image.onload = image.onerror = resolve })))
			})
			// Вміст за межами екрана — найчастіша помилка адаптиву.
			// .wrapper обрізає його (overflow: clip), тому скролу може не бути — шукаємо самі елементи.
			// Пропускаємо елементи в контейнерах, що навмисно обрізають вміст (слайдери, бігучий рядок)
			const outside = await page.evaluate(() => {
				const viewport = document.documentElement.clientWidth
				const isClipped = element => {
					for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
						if (parent.classList.contains('wrapper')) return false
						if (getComputedStyle(parent).overflowX !== 'visible') return true
					}
					return false
				}
				const result = []
				for (const element of document.body.querySelectorAll('*')) {
					const rect = element.getBoundingClientRect()
					if (rect.width && rect.right > viewport + 1 && getComputedStyle(element).position !== 'fixed' && !isClipped(element)) {
						result.push(`${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? '.' + element.className.trim().split(/\s+/).join('.') : ''} (${Math.round(rect.right)}px)`)
					}
				}
				return { scroll: document.documentElement.scrollWidth > viewport, elements: result.slice(0, 3) }
			})
			if (outside.scroll || outside.elements.length) {
				overflow.push(`${pageName} @ ${width}px: ${outside.elements.join(', ') || 'горизонтальний скрол'}`)
			}
			await page.screenshot({ path: `${target}/${pageName.replace('.html', '')}-${width}.png`, fullPage: true })
		}
	}
	await browser.close()
	server.close()

	overflow.forEach(item => logger(`_SHOTS_OVERFLOW`, item))
	if (isUpdate) {
		logger(`_SHOTS_BASELINE_DONE`, dirs.baseline)
		return
	}
	if (!fs.existsSync(dirs.baseline)) {
		logger(`_SHOTS_NO_BASELINE`)
		return
	}

	// Порівняння з еталоном
	fs.mkdirSync(dirs.diff, { recursive: true })
	let changed = 0
	for (const file of globSync(`${dirs.current}/*.png`).map(item => path.basename(item)).sort()) {
		const baselineFile = `${dirs.baseline}/${file}`
		if (!fs.existsSync(baselineFile)) {
			logger(`_SHOTS_NEW`, file)
			continue
		}
		const before = PNG.sync.read(fs.readFileSync(baselineFile))
		const after = PNG.sync.read(fs.readFileSync(`${dirs.current}/${file}`))
		const width = Math.max(before.width, after.width)
		const height = Math.max(before.height, after.height)
		const diff = new PNG({ width, height })
		const pixels = pixelmatch(resizeTo(before, width, height).data, resizeTo(after, width, height).data, diff.data, width, height, { threshold: config.threshold })
		const percent = pixels / (width * height) * 100
		if (percent > config.maxdiff || before.height !== after.height) {
			changed++
			fs.writeFileSync(`${dirs.diff}/${file}`, PNG.sync.write(diff))
			const heightNote = before.height !== after.height ? `, висота ${before.height} → ${after.height}px` : ''
			logger(`_SHOTS_CHANGED`, [file, `${percent.toFixed(2)}%${heightNote}`])
		}
	}
	changed ? logger(`_SHOTS_RESULT`, [changed, dirs.diff]) : logger(`_SHOTS_SAME`)
}
run()
