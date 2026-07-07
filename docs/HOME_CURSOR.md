# Открыть проект дома в Cursor

Репозиторий: **https://github.com/ShamanRostov/cockroach-life**  
Ветка: **`main`** (актуальная версия **v0.4.1**)

---

## 1. Клонировать (один раз)

**Windows (PowerShell или cmd):**

```powershell
cd C:\UnityProject
git clone https://github.com/ShamanRostov/cockroach-life.git
cd cockroach-life
```

Если папка `C:\UnityProject\Сockroach life` уже есть со старым кодом — проще клонировать в новую папку `cockroach-life` и работать из неё.

---

## 2. Открыть в Cursor

1. Cursor → **File → Open Folder**
2. Выберите папку `cockroach-life` (или `C:\UnityProject\cockroach-life`)
3. Либо из терминала: `cursor .` внутри папки проекта

Файл `Сockroach life.code-workspace` в корне — можно открыть двойным кликом, Cursor подхватит весь проект.

---

## 3. Запуск игры

**Проще всего:** дважды кликнуть `start.bat` в корне.

**Или в терминале Cursor:**

```bash
npm install
npm run dev
```

Откройте в браузере **http://localhost:5173** (не открывайте `index.html` напрямую — нужен Vite).

Проверка сборки:

```bash
npm run build
```

---

## 4. Синхронизация с облаком

Перед работой дома:

```bash
git pull origin main
```

После своих правок:

```bash
git add -A
git commit -m "описание изменений"
git push origin main
```

Тогда Cloud Agent в Cursor снова увидит ваш код на GitHub.

---

## Если что-то не работает

| Проблема | Решение |
|----------|---------|
| `git clone` просит логин | Войдите в GitHub в браузере; для HTTPS используйте [Personal Access Token](https://github.com/settings/tokens) вместо пароля |
| Порт 5173 занят | Vite сам выберет 5174 — смотрите URL в терминале |
| Чёрный экран | Запускайте только через `npm run dev`, не file:// |
| Нет `node` | Установите [Node.js LTS](https://nodejs.org/) (нужен v18+) |

Подробнее: `README.md`, облачная работа: `docs/CLOUD_CONTINUITY.md`.
