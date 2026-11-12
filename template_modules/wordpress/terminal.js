import { exec } from "child_process"

import logger from '../logger.js'

const args = process.argv.slice(2)

const isMacOS = process.platform === "darwin"
const isLinux = process.platform === "linux"

const isSudo = isMacOS || isLinux ? "sudo " : ""

// --pull always: перевіряти свіжі образи (інакше latest береться з кешу і WordPress ставиться застарілий)
const startPullScriptString = `${isSudo}docker compose up -d --pull always --quiet-pull`
const startScriptString = `${isSudo}docker compose up -d`
const stopScriptString = `${isSudo}docker compose down --volumes`

if (args.includes("up")) {
	dockerStart()
} else if (args.includes("down")) {
	dockerStop()
}
function dockerStart() {
	logger("(!)Запуск Docker (перевірка оновлень образів)...")
	exec(startPullScriptString, (error, stdout, stderr) => {
		if (error) {
			// Без інтернету оновлення не завантажаться - запускаємо з наявних образів
			logger("(!)Не вдалося перевірити оновлення образів, запуск з наявних...")
			exec(startScriptString, (error, stdout, stderr) => {
				if (error) {
					logger(`(!!)Помилка: ${error.message}`)
					return
				}
				logger(`Docker запущено`)
			})
			return
		}
		//if (stderr) {
		//	logger(`Попередження: ${stderr}`)
		//}
		logger(`Docker запущено`) //:\n${stdout}
	})
}
function dockerStop() {
	logger("(!)Зупинка Docker...")
	exec(stopScriptString, (error, stdout, stderr) => {
		if (error) {
			logger(`(!!)Помилка: ${error.message}`)
			return
		}
		//if (stderr) {
		//logger(`(!!)Попередження: ${stderr}`)
		//}
		logger(`Docker зупинено`) //:\n${stdout}
	})
}