// Підключення функціоналу "Чортоги Фрілансера"
import { FLS } from "@js/common/functions.js"

let formErrorCounter = 0;

// Валідація форм
export let formValidate = {
	getErrors(form) {
		FLS(`_FLS_FORM_VALIDATE`);
		let error = 0;
		let formRequiredItems = form.querySelectorAll('[required]');
		if (formRequiredItems.length) {
			formRequiredItems.forEach(formRequiredItem => {
				if ((formRequiredItem.offsetParent !== null || formRequiredItem.tagName === "SELECT") && !formRequiredItem.disabled) {
					error += this.validateInput(formRequiredItem);
				}
			});
		}
		return error;
	},
	validateInput(formRequiredItem) {
		let error = 0;
		if (formRequiredItem.type === "email") {
			formRequiredItem.value = formRequiredItem.value.replace(" ", "");
			if (this.emailTest(formRequiredItem)) {
				this.addError(formRequiredItem);
				this.removeSuccess(formRequiredItem);
				error++;
			} else {
				this.removeError(formRequiredItem);
				this.addSuccess(formRequiredItem);
			}
		} else if (formRequiredItem.type === "checkbox" && !formRequiredItem.checked) {
			this.addError(formRequiredItem);
			this.removeSuccess(formRequiredItem);
			error++;
		} else {
			if (!formRequiredItem.value.trim()) {
				this.addError(formRequiredItem);
				this.removeSuccess(formRequiredItem);
				error++;
			} else {
				this.removeError(formRequiredItem);
				this.addSuccess(formRequiredItem);
			}
		}
		return error;
	},
	addError(formRequiredItem) {
		formRequiredItem.classList.add('--form-error');
		formRequiredItem.parentElement.classList.add('--form-error');
		formRequiredItem.setAttribute('aria-invalid', 'true');
		this.removeErrorText(formRequiredItem);
		if (formRequiredItem.dataset.flsFormErrtext) {
			const errorId = `fls-form-error-${++formErrorCounter}`;
			formRequiredItem.parentElement.insertAdjacentHTML('beforeend', `<div id="${errorId}" role="alert" data-fls-form-error>${formRequiredItem.dataset.flsFormErrtext}</div>`);
			formRequiredItem.setAttribute('aria-describedby', [formRequiredItem.getAttribute('aria-describedby'), errorId].filter(Boolean).join(' '));
		}
	},
	// Видаляє текст помилки саме цього поля: в одного батька може бути кілька полів
	removeErrorText(formRequiredItem) {
		const describedBy = (formRequiredItem.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
		describedBy.filter(id => id.startsWith('fls-form-error-')).forEach(id => document.getElementById(id)?.remove());
		const otherIds = describedBy.filter(id => !id.startsWith('fls-form-error-'));
		otherIds.length ? formRequiredItem.setAttribute('aria-describedby', otherIds.join(' ')) : formRequiredItem.removeAttribute('aria-describedby');
	},
	removeError(formRequiredItem) {
		formRequiredItem.classList.remove('--form-error');
		formRequiredItem.parentElement.classList.remove('--form-error');
		formRequiredItem.removeAttribute('aria-invalid');
		this.removeErrorText(formRequiredItem);
	},
	addSuccess(formRequiredItem) {
		formRequiredItem.classList.add('--form-success');
		formRequiredItem.parentElement.classList.add('--form-success');
	},
	removeSuccess(formRequiredItem) {
		formRequiredItem.classList.remove('--form-success')
		formRequiredItem.parentElement.classList.remove('--form-success')
	},
	removeFocus(formRequiredItem) {
		formRequiredItem.classList.remove('--form-focus')
		formRequiredItem.parentElement.classList.remove('--form-focus')
	},
	formClean(form) {
		form.reset();
		setTimeout(() => {
			let inputs = form.querySelectorAll('input,textarea')
			for (let index = 0; index < inputs.length; index++) {
				const el = inputs[index];
				formValidate.removeFocus(el)
				formValidate.removeSuccess(el)
				formValidate.removeError(el)
			}
			let checkboxes = form.querySelectorAll('input[type="checkbox"]')
			if (checkboxes.length) {
				checkboxes.forEach(checkbox => {
					checkbox.checked = false
				})
			}
			if (window['flsSelect']) {
				let selects = form.querySelectorAll('select[data-fls-select]')
				if (selects.length) {
					selects.forEach(select => {
						window['flsSelect'].selectBuild(select)
					})
				}
			}
		}, 0)
	},
	emailTest(formRequiredItem) {
		return !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,8})+$/.test(formRequiredItem.value);
	}
}