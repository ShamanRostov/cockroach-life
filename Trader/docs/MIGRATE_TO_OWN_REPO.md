# Переезд в https://github.com/ShamanRostov/Trader

Текущий Cloud Agent привязан к `cockroach-life` и **не может сам** сменить репозиторий.
Токен установки Cursor GitHub App сейчас видит только `ShamanRostov/cockroach-life`.

## Что сделать вам (1–2 минуты)

1. Убедитесь, что репозиторий существует: https://github.com/ShamanRostov/Trader
2. Выдайте Cursor доступ к нему:
   - GitHub → **Settings → Applications → Cursor** → Repository access → добавьте **Trader**
   - либо при создании Cloud Agent согласитесь на доступ к этому репо
3. Запустите **новый** Cloud Agent на `ShamanRostov/Trader` (ветка `main`)
4. Напишите агенту: «залей код из cockroach-life/Trader» — или запушьте вручную (ниже)

## Ручной push (с вашего ПК)

```bash
# вариант A: из клона cockroach-life
cd cockroach-life/Trader
git init -b main
git add -A
git commit -m "Initial Trader import"
git remote add origin https://github.com/ShamanRostov/Trader.git
git push -u origin main
```

```bash
# вариант B: архив от агента (Trader-standalone.tar.gz)
tar -xzf Trader-standalone.tar.gz
cd Trader-standalone
git remote add origin https://github.com/ShamanRostov/Trader.git
git push -u origin main
```

После первого push работайте **только** в репо Trader.
Папку `Trader/` в `cockroach-life` можно позже удалить отдельным PR.
