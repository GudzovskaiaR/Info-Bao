// Налаштування шаблону
import templateConfig from '../template.config.js'
// Логгер
import logger from './logger.js'

import { globSync } from 'glob'
import fs from 'fs'
import path from 'path'

const isWp = process.argv.includes('--wp')

const seo = templateConfig.seo || {}
const siteUrl = (seo.url || '').trim().replace(/\/+$/, '')

const titleMaxLength = 60
const descriptionMaxLength = 160

// Зображення для прев'ю, які треба скопіювати в dist без оптимізації
const ogImages = new Set()

export const seoPlugins = [
	...((seo.enable && !isWp) ? [{
		name: 'seo',
		apply: 'build',
		transformIndexHtml: {
			order: 'pre',
			handler: (html, { filename }) => addHeadTags(html, filename)
		},
		// На writeBundle, щоб файли були готові до закриття збірки (zip, ftp)
		writeBundle: {
			order: 'post',
			sequential: true,
			handler: () => {
				const pages = globSync('dist/*.html').map(file => path.basename(file)).sort()
				copyOgImages()
				if (siteUrl) {
					seo.indexable !== false && seo.sitemap !== false ? createSitemap(pages) : null
				} else {
					logger(`_SEO_NO_URL`)
				}
				seo.robots !== false ? createRobots() : null
				if (seo.check?.enable !== false) {
					const errors = checkPages(pages)
					if (errors && seo.check?.strict) {
						logger(`_SEO_STRICT_STOP`)
						throw new Error(`SEO: ${errors}`)
					}
				}
			}
		}
	}] : [])
]

// Адреса сторінки на сайті
function getPageUrl(page) {
	const name = page.replace(/\.html$/, '')
	if (name === 'index') return `${siteUrl}/`
	return `${siteUrl}/${seo.cleanUrls ? name : page}`
}
// Необов'язкові поля сторінки (ogTitle, ogImage...) з її locals.
// Читаються з файлу, а не через шаблон: відсутня змінна в шаблоні ламає всю сторінку
function getPageLocals(filename) {
	try {
		const source = fs.readFileSync(filename, 'utf-8')
		const locals = source.match(/<template[^>]*?\blocals='([^']*)'/)
		return locals ? JSON.parse(locals[1]) : {}
	} catch (error) {
		return {}
	}
}
// Значення content мета-тега
function getMeta(html, attr, name) {
	const tags = html.match(/<meta\s[^>]*>/gi) || []
	for (const tag of tags) {
		if (new RegExp(`\\s${attr}=["']${name}["']`, 'i').test(tag)) {
			const content = tag.match(/\scontent=(?:"([^"]*)"|'([^']*)')/i)
			return content ? (content[1] ?? content[2] ?? '') : ''
		}
	}
	return null
}
function getTitle(html) {
	const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
	return title ? title[1].trim() : ''
}
function hasNoindex(html) {
	return /noindex/i.test(getMeta(html, 'name', 'robots') || '')
}
function escapeAttr(value) {
	return String(value).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
// Шлях зображення у src і на сайті
function resolveImage(image) {
	if (/^https?:\/\//i.test(image)) return { url: image }
	const source = image.startsWith('@img') ? image.replace('@img', 'src/assets/img') : `src/${image.replace(/^\.?\//, '')}`
	return { source, url: `${siteUrl}/${source.replace(/^src\//, '')}` }
}
// Додавання canonical та Open Graph
function addHeadTags(html, filename) {
	if (!html || !html.includes('</head>')) return html

	const page = path.basename(filename)
	const locals = getPageLocals(filename)
	const noindex = hasNoindex(html)
	const title = locals.ogTitle || getTitle(html)
	const description = locals.ogDescription || getMeta(html, 'name', 'description')
	const image = locals.ogImage || seo.ogImage
	const tags = []

	const addMeta = (attr, name, content) => {
		if (content && getMeta(html, attr, name) === null) {
			tags.push(`<meta ${attr}="${name}" content="${escapeAttr(content)}">`)
		}
	}

	if (seo.indexable === false && !noindex) {
		tags.push(`<meta name="robots" content="noindex, nofollow">`)
	}
	if (siteUrl && !noindex && !/<link\s[^>]*rel=["']canonical["']/i.test(html)) {
		tags.push(`<link rel="canonical" href="${getPageUrl(page)}">`)
	}
	addMeta('property', 'og:type', locals.ogType || 'website')
	addMeta('property', 'og:site_name', seo.siteName)
	addMeta('property', 'og:title', title)
	addMeta('property', 'og:description', description)
	if (siteUrl) {
		addMeta('property', 'og:url', getPageUrl(page))
	}
	let hasImage = getMeta(html, 'property', 'og:image') !== null
	if (image && siteUrl && !hasImage) {
		const { source, url } = resolveImage(image)
		source ? ogImages.add(source) : null
		addMeta('property', 'og:image', url)
		hasImage = true
	}
	addMeta('name', 'twitter:card', hasImage ? 'summary_large_image' : 'summary')

	return html.replace('</head>', `${tags.join('')}</head>`)
}
// Зображення для прев'ю мають лишатись у вихідному форматі: месенджери не завжди показують webp
function copyOgImages() {
	for (const source of ogImages) {
		if (fs.existsSync(source)) {
			const output = source.replace(/^src\//, 'dist/')
			fs.mkdirSync(path.dirname(output), { recursive: true })
			fs.copyFileSync(source, output)
		}
	}
}
// Створення sitemap.xml
function createSitemap(pages) {
	const urls = pages
		.filter(page => page !== '404.html' && !hasNoindex(fs.readFileSync(`dist/${page}`, 'utf-8')))
		.map(page => {
			const source = `src/${page}`
			const lastmod = fs.existsSync(source) ? `\n\t\t<lastmod>${fs.statSync(source).mtime.toISOString().split('T')[0]}</lastmod>` : ''
			return `\t<url>\n\t\t<loc>${getPageUrl(page)}</loc>${lastmod}\n\t</url>`
		})
	fs.writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, 'utf-8')
	logger(`_SEO_SITEMAP_DONE`, urls.length)
}
// Створення robots.txt
function createRobots() {
	let content = `User-agent: *\n`
	if (seo.indexable === false) {
		content += `Disallow: /\n`
	} else {
		content += `Allow: /\n`
		if (siteUrl && seo.sitemap !== false) {
			content += `Sitemap: ${siteUrl}/sitemap.xml\n`
		}
	}
	fs.writeFileSync('dist/robots.txt', content, 'utf-8')
	logger(`_SEO_ROBOTS_DONE`)
}
// Перевірка внутрішнього посилання
function isLinkBroken(href) {
	const link = href.split(/[?#]/)[0]
	if (!link || /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return false
	const file = path.join('dist', link.replace(/^\.?\//, ''))
	if (link.endsWith('.html')) return !fs.existsSync(file)
	if (seo.cleanUrls && !path.extname(link)) {
		return !fs.existsSync(`${file.replace(/[\\/]$/, '')}.html`) && !fs.existsSync(path.join(file, 'index.html'))
	}
	return false
}
// Перевірка сторінок
function checkPages(pages) {
	const titles = new Map()
	const descriptions = new Map()
	const report = new Map()
	let errors = 0
	let warnings = 0

	const add = (page, text, vars) => {
		!report.has(page) ? report.set(page, []) : null
		report.get(page).push([text, vars])
		text.startsWith('_SEO_ERR') ? errors++ : warnings++
	}

	for (const page of pages) {
		const html = fs.readFileSync(`dist/${page}`, 'utf-8')
		const content = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
		const title = getTitle(content)
		const description = getMeta(content, 'name', 'description')

		// Заголовок та опис
		if (!title) {
			add(page, `_SEO_ERR_TITLE`)
		} else {
			title.length > titleMaxLength ? add(page, `_SEO_WARN_TITLE_LONG`, title.length) : null
			titles.set(title, [...(titles.get(title) || []), page])
		}
		if (!description) {
			add(page, `_SEO_ERR_DESCRIPTION`)
		} else {
			description.length > descriptionMaxLength ? add(page, `_SEO_WARN_DESCRIPTION_LONG`, description.length) : null
			descriptions.set(description, [...(descriptions.get(description) || []), page])
		}
		// Заголовки сторінки
		const headings = (content.match(/<h[1-6][\s>]/gi) || []).map(heading => +heading[2])
		const h1Count = headings.filter(level => level === 1).length
		h1Count !== 1 ? add(page, `_SEO_ERR_H1`, h1Count) : null
		headings.forEach((level, index) => {
			if (index && level > headings[index - 1] + 1) {
				add(page, `_SEO_WARN_HEADING_SKIP`, [headings[index - 1], level])
			}
		})
		// Посилання
		for (const match of content.matchAll(/<a\s[^>]*href=["']([^"']*)["']/gi)) {
			isLinkBroken(match[1]) ? add(page, `_SEO_ERR_LINK`, match[1]) : null
		}
		// Зображення для прев'ю
		const ogImage = getMeta(content, 'property', 'og:image')
		if (ogImage && ogImage.startsWith(`${siteUrl}/`) && !fs.existsSync(`dist/${ogImage.replace(`${siteUrl}/`, '')}`)) {
			add(page, `_SEO_ERR_OGIMAGE`, ogImage)
		}
		// Закрита сторінка на відкритому сайті (для 404 чи "Дякуємо" це може бути навмисно)
		seo.indexable !== false && hasNoindex(content) ? add(page, `_SEO_WARN_NOINDEX`) : null
		// Атрибути
		const imagesNoAlt = (content.match(/<img\b[^>]*>/gi) || []).filter(image => !/\salt=/i.test(image)).length
		imagesNoAlt ? add(page, `_SEO_WARN_IMG_ALT`, imagesNoAlt) : null
		!/<html\b[^>]*\slang=["'][^"']+["']/i.test(content) ? add(page, `_SEO_WARN_LANG`) : null
	}
	// Дублікати між сторінками
	for (const [map, text] of [[titles, `_SEO_WARN_TITLE_DUPLICATE`], [descriptions, `_SEO_WARN_DESCRIPTION_DUPLICATE`]]) {
		for (const duplicates of map.values()) {
			if (duplicates.length > 1) {
				duplicates.forEach(page => add(page, text, duplicates.filter(item => item !== page).join(', ')))
			}
		}
	}
	// Звіт
	for (const [page, items] of report) {
		logger(`_SEO_PAGE`, page)
		items.forEach(([text, vars]) => logger(text, vars))
	}
	logger(errors || warnings ? `_SEO_CHECK_RESULT` : `_SEO_CHECK_DONE`, [pages.length, errors, warnings])
	return errors
}
