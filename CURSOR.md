# AURELLE в Cursor

Это уже готовый проект: React + Vite. Не Android Studio.

## Открыть

1. Распакуйте архив.
2. Cursor → File → Open Folder → папка с `package.json`.
3. Нужен Node.js 22 (https://nodejs.org).

## Запуск

```bash
npm install
npm run dev
```

Откройте http://localhost:8080

Архив, фото, PIN и настройки живут только в браузере (IndexedDB). Сервер не хранит анкеты.

Код приложения: `src/components/aurelle` и `src/aurelle`.
Главный экран: `src/routes/index.tsx`.
