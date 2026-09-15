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

## 4. Синхронизация с облаком (чтобы ничего не терялось)

**Прогресс = то, что на GitHub.** Подробный сценарий: **[CLOUD_CONTINUITY.md](./CLOUD_CONTINUITY.md)**.

### Перед работой дома

```powershell
git checkout main
git pull origin main
```

Если продолжаете задачу агента — переключитесь на **его ветку** (имя в PR / на странице агента):

```powershell
git fetch origin
git checkout cursor/имя-ветки
git pull
```

### После своих правок

```powershell
git add -A
git commit -m "описание изменений"
git push
```

Предпочтительно: правки в feature-ветке → **Pull Request** → merge в `main` на GitHub.  
Прямой push в `main` допустим только для мелких личных правок, когда вы один и уверены.

### Перенести Cloud Agent на компьютер

1. Откройте эту папку в Cursor Desktop  
2. Запустите локальный агент  
3. Agents Window → у облачного агента **Move to → Local**

Либо просто `git checkout` его ветки и продолжайте в новом чате.

---

## Если что-то не работает

| Проблема | Решение |
|----------|---------|
| `git clone` просит логин | Войдите в GitHub в браузере; для HTTPS используйте [Personal Access Token](https://github.com/settings/tokens) вместо пароля |
| Порт 5173 занят | Vite сам выберет 5174 — смотрите URL в терминале |
| Чёрный экран | Запускайте только через `npm run dev`, не file:// |
| Нет `node` | Установите [Node.js LTS](https://nodejs.org/) (нужен v18+) |
| Дома нет изменений агента | Не сделали pull / не та ветка — см. раздел 4 |

Подробнее: `README.md`, облачная работа: `docs/CLOUD_CONTINUITY.md`.
