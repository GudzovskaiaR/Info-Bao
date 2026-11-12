// Хук PostToolUse: перевірка правил збірки у змінених SCSS-файлах.
// Помилки повертаються Claude (код виходу 2), щоб він одразу їх виправив.
import fs from 'fs'
import path from 'path'

const input = JSON.parse(fs.readFileSync(0, 'utf-8') || '{}')
const filePath = input.tool_input?.file_path || input.tool_response?.filePath
if (!filePath || !filePath.endsWith('.scss') || !fs.existsSync(filePath)) process.exit(0)

// Перевіряємо лише код проєкту: готові компоненти збірки та міксини не чіпаємо
const normalized = filePath.replace(/\\/g, '/')
const checkedDirs = ['src/components/custom/', 'src/components/pages/', 'src/styles/']
if (!checkedDirs.some(dir => normalized.includes(dir)) || normalized.includes('src/styles/includes/')) process.exit(0)

const source = fs.readFileSync(filePath, 'utf-8')
const problems = []

// Заміна коментарів пробілами зі збереженням переносів рядків (для номерів рядків)
const code = source
	.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
	.replace(/\/\/[^\n]*/g, match => ' '.repeat(match.length))

// 1. toRem(): збірка сама переводить px у rem
code.split('\n').forEach((line, index) => {
	if (/\btoRem\s*\(/.test(line)) {
		problems.push(`рядок ${index + 1}: toRem() не використовується, пиши звичайні px (збірка сама переводить у rem)`)
	}
})

// 2. :hover має бути всередині html:not([data-fls-touch]) & { }
const stack = []
let selector = ''
let line = 1
let selectorLine = 1
for (let i = 0; i < code.length; i++) {
	const char = code[i]
	if (char === '\n') line++
	// Інтерполяція #{...} не відкриває блок
	if (char === '#' && code[i + 1] === '{') {
		const end = code.indexOf('}', i)
		selector += code.slice(i, end + 1)
		i = end
		continue
	}
	if (char === '{') {
		const current = selector.trim()
		stack.push(current)
		if (current.includes(':hover') && !stack.some(item => item.includes('data-fls-touch'))) {
			problems.push(`рядок ${selectorLine}: "${current.replace(/\s+/g, ' ')}" — ховер обгортай у html:not([data-fls-touch]) & { }`)
		}
		selector = ''
	} else if (char === '}') {
		stack.pop()
		selector = ''
	} else if (char === ';') {
		selector = ''
	} else {
		if (!selector.trim() && char.trim()) selectorLine = line
		selector += char
	}
}

if (problems.length) {
	console.error(`Правила збірки FLS порушено у ${path.basename(filePath)}:\n- ${problems.join('\n- ')}`)
	process.exit(2)
}
