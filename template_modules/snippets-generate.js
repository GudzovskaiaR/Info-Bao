import fs from 'fs'
import path from 'path'
import templateConfig from '../template.config.js'
import logger from './logger.js'

const isProduction = process.env.NODE_ENV === 'production'

export default function addSnippets() {
	if (!isProduction) {
		!fs.existsSync('.vscode') ? fs.mkdirSync('.vscode') : null
		fs.copyFileSync('template_modules/assets/fls.code-snippets', '.vscode/fls.code-snippets')
		logger('_VS_SNIPPETS')
	}
}