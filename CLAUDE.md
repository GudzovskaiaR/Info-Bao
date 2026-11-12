@AGENTS.md

## Claude Code

- **Хуки** (`.claude/settings.json`, скрипти в `.claude/hooks/`):
  - після зміни SCSS у `custom`, `pages` і `src/styles` перевіряються `toRem()` і ховер без `html:not([data-fls-touch])` — помилки треба одразу виправити;
  - зміна файлів у `template_modules/` вимагає підтвердження користувача;
  - наприкінці відповіді, якщо файли змінились, запускається `npm run build`; якщо збірка падає — виправ помилку.
- Команди `deploy`, `wpdeploy`, `git`, `zip`, `tmp` і `git push` завжди потребують підтвердження користувача.
- **Субагенти** (`.claude/agents/`):
  - `fls-reviewer` — рев'ю коду за чек-листом `fls-review`, лише читає;
  - `fls-qa` — перевірка сторінок у браузері на всіх ширинах.
