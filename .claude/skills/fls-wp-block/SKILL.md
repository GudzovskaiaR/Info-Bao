---
name: fls-wp-block
description: Перенести готовий HTML-компонент збірки "Чертоги Фрілансера" у WordPress-блок (ACF) — PHP-шаблон, block.json і поля ACF. Використовуй, коли просять зробити WP-блок, підключити компонент до WordPress або винести контент компонента в редактор.
---

# Компонент → WP-блок (ACF)

Компонент: $ARGUMENTS

## Як влаштовано у збірці

- Блоки лежать у `src/wordpress/fls-theme/components/blocks/<name>/`: `<name>.php` + `block.json`.
- Реєструються автоматично в `functions.php` (хук `acf/init`, перебирає всі `*/block.json`; папка `_example` пропускається). Нічого реєструвати вручну не треба.
- Поля ACF блоку беруться через `$fields = get_fls_fields();` на початку PHP-шаблону. Для налагодження — `vd($fields);`.
- **JS і SCSS не дублюються**: збірка сканує PHP-файли теми на `data-fls-<name>` і сама підключає `src/components/**/<name>/<name>.js` (а з ним і SCSS). Тому атрибут `data-fls-<name>` у PHP обов'язковий, а стилі лишаються в HTML-компоненті.
- Стилі для превʼю в адмінці збирає `npm run wpblocks`.

## Кроки

1. **Знайди HTML-компонент** `src/components/**/<name>/<name>.html` і прочитай його разом з `.scss` та `.js`. Якщо компонента немає — спершу запропонуй створити його скілом `fls-component`.

2. **Створи заготовку блоку**, якщо її ще немає:
   ```
   npm run add <name>
   ```
   (команда створить WP-блок, а HTML-частину пропустить, якщо вона вже існує). Якщо команда повідомляє, що компонент існує, — створи `<name>.php` і `block.json` вручну за шаблоном нижче.

3. **Спроєктуй поля ACF.** Пройдись по HTML і для кожного змінного вмісту визнач поле:

   | У верстці | Тип поля ACF | Вивід у PHP |
   |---|---|---|
   | Заголовок, короткий текст | Text | `esc_html($fields['title'])` |
   | Абзаци з форматуванням | WYSIWYG | `wp_kses_post($fields['text'])` |
   | Картинка | Image (Return: Array) | `wp_get_attachment_image($fields['image']['ID'], 'large', false, ['class' => '<name>__image'])` |
   | Кнопка / посилання | Link (Return: Array) | `esc_url($link['url'])`, `esc_html($link['title'])`, `esc_attr($link['target'] ?: '_self')` |
   | Повторювані картки, пункти | Repeater | `foreach ($fields['items'] as $item)` |
   | Перемикач (показати/сховати) | True/False | `if (!empty($fields['show_button']))` |

   Назви полів — латиницею, `snake_case`, за змістом (`title`, `subtitle`, `items`), а не `field_1`.

4. **Напиши PHP-шаблон** `<name>.php`:
   - та сама розмітка і ті самі класи, що в HTML-компоненті, з атрибутом `data-fls-<name>`;
   - кожне поле обгорни перевіркою `<?php if (!empty($fields['title'])) : ?>`, щоб порожні поля не лишали порожніх тегів;
   - **завжди екрануй вивід** (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`);
   - `data-fls-*` опції компонента, які варто змінювати з адмінки, теж винеси в поля.

   ```php
   <?php $fields = get_fls_fields(); ?>
   <?php // vd($fields); ?>

   <section data-fls-<name> class="<name>">
   	<div class="<name>__container">
   		<?php if (!empty($fields['title'])) : ?>
   			<h2 class="<name>__title"><?php echo esc_html($fields['title']); ?></h2>
   		<?php endif; ?>
   	</div>
   </section>
   ```

5. **Онови `block.json`**: людська назва в `title` (українською), доречна `category` (`text`, `media`, `design`, `formatting`), `description`. Решту полів заготовки не чіпай.

6. **Згенеруй JSON групи полів для імпорту** у файл `src/wordpress/fls-theme/components/blocks/<name>/acf-<name>.json` (формат ACF Tools → Export: масив з однією групою; `key` у групи `group_<name>`, у полів `field_<name>_<field>`; `location`: `[[{"param": "block", "operator": "==", "value": "acf/<name>"}]]`).

7. **Звіт користувачу**:
   - які файли створені/змінені;
   - таблиця полів (назва, тип, для чого);
   - як імпортувати поля: WP-адмінка → ACF → Tools → Import → `acf-<name>.json`; якщо блок не з'явився в правилі Location — вибрати його вручну за назвою;
   - нагадай перевірити в `npm run wp` (редактор + фронт) і зібрати стилі адмінки `npm run wpblocks`.
