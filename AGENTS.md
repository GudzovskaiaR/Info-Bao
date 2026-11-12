# Збірка "Чертоги Фрілансера" 4 (flsStart)

Спільні правила для AI-помічників (Claude Code, Copilot, Cursor та ін.).

Фронтенд-збірка на Vite: HTML-компоненти (posthtml include/extend), SCSS, ванільний JS-модулі.
Мова коментарів і повідомлень у коді — українська. Автор Андріканич Євген

## Загальний підхід до розробки інтерфейсу

- Вивчай підхід до створення інтерфейсів Андріканича Євгена, автора каналу "Фрілансер по життю"

## Команди

- `npm run dev` — дев-сервер (порт з `template.config.js` → `server.port`)
- `npm run build` — продакшн-збірка в `dist/`
- `npm run add <name>` — створити компонент у `src/components/custom/<name>/` (+ WP-блок; `--nowp` щоб без нього)
- `npm run new <name>` — створити нову сторінку
- `npm run shots` — зібрати проєкт, зняти скріншоти всіх сторінок на ширинах із `screenshots.widths` і порівняти з еталоном; `npm run shots -- --update` — зберегти еталон. Також показує вміст, що виходить за межі екрана. Зроби еталон перед змінами, які можуть зачепити інші сторінки (глобальні стилі, готові компоненти), і порівняй після.
- `npm run wp` / `wpbuild` — режим WordPress (docker)
- Якщо просять зробити сайт на WordPress, його треба встановити можливостями збірки — за скілом `fls-wp-install`.

Не запускай `deploy`, `wpdeploy`, `git`, `zip`, `tmp` і `git push` без прямого прохання — вони вивантажують або пакують файли.

## Структура

- `src/*.html` — сторінки. Збираються з шаблону `@components/templates/main/main.html` через `<template src>` + `<block name>` + `<include src locals='{}'>`.
- `src/components/layout|forms|effects` — готові компоненти збірки. Не змінюй їх без потреби, краще створи новий у `custom`.
- `src/components/custom/` — компоненти проєкту.
- `src/components/pages/<page>/` — вміст конкретної сторінки.
- `src/styles/` — глобальні стилі: `style.scss`, `a11y.scss`, `variables.css`, `settings.scss` (брейкпоінти, ширина контейнера), `includes/mixins.scss`.
- `src/php/` — серверні обробники (sendmail, telegram).
- `src/wordpress/` — WP-тема і плагін; правила для них — у `src/wordpress/AGENTS.md`.
- `template_modules/` — код самої збірки. Не редагуй без прямого прохання.
- Аліаси: `@components`, `@js`, `@styles`, `@img`, `@fonts`, `@files`.

## Сторінка компонентів

Для розробки компонентів окремо від сторінок використовуй вбудовану сторінку компонентів:

- увімкни `devcomponents.enable: true` у `template.config.js` — при `npm run dev` створиться `src/_components.html` (назва з `devcomponents.filename`);
- підключай туди компоненти через `<include>` у різних станах і з різними `locals`, перевіряй їх там на всіх ширинах;
- сторінка не потрапляє у збірку `dist` і відкривається з навігаційної панелі («Розробка компонентів»).

## Як влаштований компонент

Папка `<name>/` з трьома файлами з однаковою назвою: `<name>.html`, `<name>.scss`, `<name>.js`.

- Кореневий елемент має атрибут `data-fls-<name>` і клас `<name>`.
- **JS підключається автоматично**: збірка шукає `data-fls-<name>` в HTML сторінки і додає `<script type="module" src=".../<name>.js">`. Не імпортуй JS компонента вручну в `app.js`.
- SCSS імпортується з JS компонента: `import "./<name>.scss"`.
- Плагіни компонента — у `<name>/plugins/<plugin>.js`, підключаються за атрибутом `data-fls-<name>-<plugin>`.
- Файли, що починаються з `_`, у автопідключення не потрапляють.

Шаблон JS:

```js
// Підключення функціоналу "Чертоги Фрілансера"
import { addTouchAttr, addLoadedAttr, isMobile, FLS } from "@js/common/functions.js"

import "./<name>.scss"

export function <name>() {
	const items = document.querySelectorAll('[data-fls-<name>]')
	if (!items.length) return
	// ...
}
window.addEventListener('load', <name>)
```

- Налаштування компонента передавай через `data-fls-<name>-<option>` і читай з `dataset` (`el.dataset.fls<Name><Option>`).
- Корисні хелпери з `@js/common/functions.js`: `slideUp/slideDown/slideToggle`, `dataMediaQueries`, `isMobile`, `isReducedMotion`, `FLS` (лог).

## Стилі

- Для загальних стилів використовуй наявний селектор `body` у `src/styles/style.scss`, загальні елементи можна винести в компоненти.
- Якщо в макеті багато іконок, створюй іконковий шрифт можливостями збірки.
- Методологія BEM: `.block`, `.block__element`, модифікатори і стани — класами з `--` (`--active`, `--spoller-init`).
- Розміри пиши звичайними `px` — збірка при білді сама переводить їх у `rem` (`styles.pxtorem` у `template.config.js`), `toRem()` не використовуй; медіа-запити — `@media (max-width: toEm($mobile))`.
- Брейкпоінти з `settings.scss`: `$pc`, `$tablet` (992), `$mobile` (768), `$mobileSmall` (480).
- **Адаптив — до 320px** (`$minWidth` у `settings.scss`): на ширині 320 нічого не вилазить, немає горизонтального скролу, тексти не обрізаються, усіма об'єктами зручно користуватись.
- **Кнопки на мобільних** (`toEm($mobileSmall)` і менше) — по можливості на всю ширину (`width: 100%`), щоб збільшити площу натискання. Кілька кнопок поруч — у стовпчик, кожна на всю ширину.
- **Фонові зображення** — стеж, щоб важлива частина (обличчя, товар, текст на фото) лишалась у кадрі на всіх ширинах: налаштовуй `object-position` / `background-position` під кожен брейкпоінт, за потреби — окрема мобільна картинка через `<picture>`.
- **Мобільне меню** — пункти вирівнюй з того ж боку, що й іконка бургера (бургер праворуч → пункти праворуч), щоб до них було легко дотягнутись тим самим пальцем.
- Адаптивні значення — міксин `@include adaptiveValue("font-size", 40, 24)`.
- Ховер завжди обгортай у `html:not([data-fls-touch]) & { }`.
- Контейнер — клас `<name>__container` (глобальні стилі контейнера вже є).
- Кольори і шрифти — CSS-змінні з `src/styles/variables.css`.

## Доступність

- Базові стилі — у `src/styles/a11y.scss`: посилання «Перейти до вмісту», `:focus-visible`, `prefers-reduced-motion`. Не прибирай `outline` без заміни на видимий стиль фокуса.
- Дія — `<button type="button">`, перехід — `<a href>`. Інтерактив на `div`/`span` не роби.
- Кнопки-іконки — з `aria-label`; стан перемикачів — `aria-expanded` / `aria-pressed` / `aria-selected`.
- У полів форм — `<label>` (не лише `placeholder`) і доречний `autocomplete`.
- Змістовний `alt` для зображень, `alt=""` — для декоративних.
- Усе, що працює мишею, має працювати з клавіатури (Tab, Enter, Space, Esc, стрілки для слайдерів і табів).
- JS-анімації (паралакс, рух за мишею, GSAP) не запускай при `isReducedMotion()`.
- Області натискання на мобільних — від 44×44px.

## SEO

- Блок `seo` у `template.config.js`. Модуль `template_modules/seo.js` працює лише під час `npm run build` і не для WordPress: створює `sitemap.xml`, `robots.txt`, додає `canonical`, Open Graph і перевіряє сторінки.
- Перед запуском сайту заповни `seo.url`, `seo.siteName`, `seo.ogImage`. На тестовому домені став `indexable: false`.
- У кожної сторінки має бути свій `title` і `description` в `locals`, один `h1`, заголовки без пропуску рівнів.
- Необов'язкові поля сторінки в `locals`: `ogTitle`, `ogDescription`, `ogImage`, `ogType`. Порожні беруться з `title`, `description` і `seo.ogImage`.
- Зображення для прев'ю — jpg або png, 1200×630.
- Сторінки, яким не потрібна індексація (404, «Дякуємо»), — `"noindex":"true"`.

## Правила роботи

- Якщо шаблон використовує `[[змінну]]`, вона має бути в `locals` кожної сторінки: відсутня змінна ламає збірку всієї сторінки. Нове поле або додавай в усі сторінки, або читай поза шаблоном.
- Відступи — табуляція.
- Назви компонентів — латиницею, малими літерами, без цифр і розділових знаків.
- Зображення: `<img src="@img/...">` — збірка сама оптимізує, генерує webp, додає `width`/`height` і `loading="lazy"` (крім перших `images.optimize.lazyskip` зображень сторінки). Для зображення першого екрана, яке стоїть нижче в коді, вкажи `loading="eager"` вручну.
- Після змін перевіряй результат через `npm run dev`.

## Скіли

Покрокові інструкції для задач — у `.claude/skills/<назва>/SKILL.md`:

| Скіл | Задача |
|---|---|
| `fls-component` | новий компонент чи секція |
| `fls-page` | нова сторінка |
| `fls-figma` | верстка з Figma, макета або скріншота |
| `fls-tokens` | кольори, шрифти й сітка з макета у змінні проєкту |
| `fls-review` | рев'ю верстки |
| `fls-a11y` | доступність компонентів |
| `fls-wp-install` | встановлення локального WordPress |
| `fls-wp-block` | перенесення компонента у WordPress/ACF |
| `fls-launch` | перевірка перед запуском сайту |
| `fls-handoff` | передача проєкту клієнту |
| `fls-update` | оновлення старого проєкту до нової версії збірки |
