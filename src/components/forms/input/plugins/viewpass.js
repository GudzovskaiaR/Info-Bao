// Функціонал "Показати пароль"
function viewPass() {
	document.addEventListener("click", function (e) {
		let targetElement = e.target.closest('[data-fls-input-viewpass]');
		if (targetElement) {
			// Кнопка без type="button" інакше відправить форму
			e.preventDefault();
			let inputType = targetElement.classList.contains('--viewpass-active') ? "password" : "text";
			targetElement.parentElement.querySelector('input').setAttribute("type", inputType);
			targetElement.classList.toggle('--viewpass-active');
			targetElement.setAttribute('aria-pressed', inputType === "text");
		}
	});
}
document.querySelector('[data-fls-input-viewpass]') ?
	window.addEventListener('load', viewPass) : null