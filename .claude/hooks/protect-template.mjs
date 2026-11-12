// Хук PreToolUse: підтвердження користувача перед зміною коду самої збірки (template_modules).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const input = JSON.parse(fs.readFileSync(0, 'utf-8') || '{}')
const filePath = input.tool_input?.file_path
if (!filePath) process.exit(0)

const relative = path.relative(projectDir, path.resolve(projectDir, filePath)).replace(/\\/g, '/')
if (relative.startsWith('template_modules/')) {
	console.log(JSON.stringify({
		hookSpecificOutput: {
			hookEventName: 'PreToolUse',
			permissionDecision: 'ask',
			permissionDecisionReason: `Зміна коду збірки (${relative}). Підтвердьте, що це потрібно.`
		}
	}))
}
