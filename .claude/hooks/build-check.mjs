// Хуки SessionStart і Stop: перевірка, що проєкт збирається.
// SessionStart (аргумент "baseline") запам'ятовує стан файлів.
// Stop запускає npm run build, лише якщо файли змінились, і повертає Claude помилки збірки.
import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const stateFile = path.join(os.tmpdir(), `fls-build-${crypto.createHash('md5').update(projectDir).digest('hex')}.txt`)
const isBaseline = process.argv.includes('baseline')

let input = {}
try { input = JSON.parse(fs.readFileSync(0, 'utf-8') || '{}') } catch (error) { }
// Claude вже виправляє помилки після попереднього запуску цього хука
if (input.stop_hook_active) process.exit(0)

// Відбиток стану: кількість файлів і час останньої зміни
function getFingerprint() {
	const ignored = new Set(['node_modules', 'dist', 'build', 'zip', '.git'])
	let count = 0
	let latest = 0
	const walk = dir => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			if (ignored.has(entry.name)) continue
			const full = path.join(dir, entry.name)
			if (entry.isDirectory()) {
				walk(full)
			} else if (entry.name !== 'reload.txt') {
				count++
				latest = Math.max(latest, fs.statSync(full).mtimeMs)
			}
		}
	}
	for (const item of ['src', 'template_modules']) {
		fs.existsSync(path.join(projectDir, item)) ? walk(path.join(projectDir, item)) : null
	}
	for (const file of ['template.config.js', 'vite.config.js', 'package.json']) {
		const full = path.join(projectDir, file)
		if (fs.existsSync(full)) {
			count++
			latest = Math.max(latest, fs.statSync(full).mtimeMs)
		}
	}
	return `${count}:${Math.round(latest)}`
}

const saved = fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf-8') : ''
if (isBaseline || !saved) {
	fs.writeFileSync(stateFile, getFingerprint())
	process.exit(0)
}
if (saved === getFingerprint()) process.exit(0)

let output = ''
let failed = false
try {
	output = execSync('npm run build', { cwd: projectDir, encoding: 'utf-8', stdio: 'pipe', timeout: 240000 })
} catch (error) {
	failed = true
	output = `${error.stdout || ''}${error.stderr || ''}${error.message || ''}`
}
// Помилки шаблонів (posthtml) не зупиняють Vite, тому шукаємо їх у виводі
if (!failed && /\b(Reference|Syntax|Type)Error\b|Error: /.test(output)) failed = true

if (failed) {
	const tail = output.replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').slice(-40).join('\n')
	console.error(`npm run build завершився з помилкою. Виправ її перед завершенням роботи:\n${tail}`)
	process.exit(2)
}
// Збірка може змінювати файли в src (шрифти, спрайт), тому зберігаємо стан після неї
fs.writeFileSync(stateFile, getFingerprint())
