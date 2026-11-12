// Підкючення функціоналу для роботи з WP
import '../../fls-wp-includes.js'
// Підключення функціоналу "Чортоги Фрілансера"
import { addTouchAttr, addLoadedAttr, isMobile, FLS } from "@js/common/functions.js"

// Додавання data-fls-touch для HTML на мобільних пристроях
addTouchAttr()