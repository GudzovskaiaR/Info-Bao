# WordPress-тема та плагін збірки

Правила для роботи в `src/wordpress/`. Загальні правила збірки — у кореневому `AGENTS.md`.

- Режим WordPress: `npm run wp` (docker + дев-сервер), `npm run wpbuild` (збірка теми), `npm run wpblocks` (стилі блоків для редактора), `npm run wpstop` (зупинка docker). Встановлення — скіл `fls-wp-install`.
- Тема — `fls-theme/`, плагін — `fls-plugin/`. Docker монтує їх у WordPress напряму, тож зміни видно одразу.
- **JS і SCSS компонентів не дублюються в темі**: збірка сканує PHP-файли теми на атрибут `data-fls-<name>` і сама підключає `src/components/**/<name>/<name>.js` разом зі стилями. Тому в PHP-розмітці атрибут `data-fls-<name>` обов'язковий.
- Сторінки теми — `fls-theme/pages/<page>.php` (`Template Name`), частини — `fls-theme/components/`.
- **WP-блоки** — `fls-theme/components/blocks/<name>/`: `<name>.php` + `block.json`. Реєструються автоматично (хук `acf/init`), папка `_example` пропускається. Перенесення компонента у блок — скіл `fls-wp-block`.
- Поля ACF: `$fields = get_fls_fields();` (усі поля блоку чи сторінки), `get_fls_field('name')` (одне поле). Для налагодження — `vd($fields);`.
- **Весь вивід екрануй**: `esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`. Кожне поле перевіряй на порожнечу перед виводом.
- Стилі блоків для редактора збирає `npm run wpblocks` у `fls-theme/components/blocks/admin/dist/`.
- Не змінюй `fls-theme/build/` і `inc/assets-include.php` вручну — їх генерує збірка.
