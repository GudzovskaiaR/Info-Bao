// Підключення функціоналу "Чортоги Фрілансера"
import { addTouchAttr, bodyLockStatus, bodyLockToggle, FLS } from "@js/common/functions.js"

import './menu.scss'

export function menuInit() {
	const html = document.documentElement
	const menuButton = document.querySelector('[data-fls-menu]')
	const menuBody = menuButton.closest('.menu')?.querySelector('.menu__body')

	// Опис кнопки для допоміжних технологій
	!menuButton.hasAttribute('aria-label') && !menuButton.textContent.trim() ? menuButton.setAttribute('aria-label', 'Меню') : null
	if (menuBody) {
		menuBody.id = menuBody.id || 'menu-body'
		menuButton.setAttribute('aria-controls', menuBody.id)
	}
	// Меню закривається і з інших модулів (gotoBlock, scrollto), тому стан беремо з атрибута
	const setExpanded = () => menuButton.setAttribute('aria-expanded', html.hasAttribute('data-fls-menu-open'))
	setExpanded()
	new MutationObserver(setExpanded).observe(html, { attributes: true, attributeFilter: ['data-fls-menu-open'] })

	document.addEventListener("click", function (e) {
		if (bodyLockStatus && e.target.closest('[data-fls-menu]')) {
			bodyLockToggle()
			html.toggleAttribute("data-fls-menu-open")
		}
	})
	// Закриття ESC
	document.addEventListener("keydown", function (e) {
		if (e.code === 'Escape' && bodyLockStatus && html.hasAttribute('data-fls-menu-open')) {
			bodyLockToggle()
			html.removeAttribute('data-fls-menu-open')
			menuButton.focus()
		}
	})
}

document.querySelector('[data-fls-menu]') ?
	window.addEventListener('load', menuInit) : null