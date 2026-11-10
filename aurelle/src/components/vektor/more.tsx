import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn, fieldClass, Screen, Segment } from "@/components/vektor/ui";
import { ACCENT_LABEL, ACCENTS } from "@/vektor/labels";
import { focusMinutesOn, formatClock, parseSnapshot, remainingMs, ymd } from "@/vektor/logic";
import { useVektor } from "@/vektor/store";
import type { Accent, Mode } from "@/vektor/types";

const PRESETS = [15, 25, 50];

export function MoreScreen({ now }: { now: Date }) {
  const settings = useVektor((state) => state.settings);
  const timer = useVektor((state) => state.timer);
  const sessions = useVektor((state) => state.sessions);
  const patchSettings = useVektor((state) => state.patchSettings);
  const setPreset = useVektor((state) => state.setPreset);
  const startTimer = useVektor((state) => state.startTimer);
  const pauseTimer = useVektor((state) => state.pauseTimer);
  const applySnapshot = useVektor((state) => state.applySnapshot);
  const resetDemo = useVektor((state) => state.resetDemo);
  const [tick, setTick] = useState(() => Date.now());
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const today = ymd(now);

  useEffect(() => {
    if (!timer.running) return;
    const id = setInterval(() => setTick(Date.now()), 200);
    return () => clearInterval(id);
  }, [timer.running]);

  const left = remainingMs(timer, tick);
  const ratio = timer.totalMs === 0 ? 0 : Math.min(100, Math.round((left / timer.totalMs) * 100));
  const focus = focusMinutesOn(sessions, today);

  function exportBackup() {
    const state = useVektor.getState();
    const blob = new Blob(
      [
        JSON.stringify(
          {
            app: "vektor",
            version: 1,
            tasks: state.tasks,
            habits: state.habits,
            notes: state.notes,
            sessions: state.sessions,
            settings: state.settings,
            timer: state.timer,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vektor-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Файл резервной копии скачан.");
  }

  async function importBackup(file: File) {
    try {
      const parsed = parseSnapshot(JSON.parse(await file.text()));
      if (!parsed) {
        setMessage("В файле нет данных ВЕКТОР.");
        return;
      }
      applySnapshot(parsed);
      setMessage("Данные восстановлены.");
    } catch {
      setMessage("Не получилось прочитать файл.");
    }
  }

  return (
    <Screen title="Ещё">
      <article className="rounded-card bg-surface p-5">
        <div className="flex items-end justify-between">
          <p className="text-sm text-muted">Фокус</p>
          <p className="text-sm text-muted">{focus} мин сегодня</p>
        </div>
        <p className="mt-2 text-6xl font-semibold tabular-nums leading-none">{formatClock(left)}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-raised">
          <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${ratio}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {PRESETS.map((minutes) => {
            const on = timer.totalMs === minutes * 60_000;
            return (
              <button
                key={minutes}
                type="button"
                aria-pressed={on}
                onClick={() => setPreset(minutes)}
                className={cn(
                  "h-11 rounded-full text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96]",
                  on ? "bg-accent text-on-accent" : "bg-raised text-muted",
                )}
              >
                {minutes} мин
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={timer.running ? pauseTimer : startTimer}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-on-accent transition-transform duration-150 ease-out active:scale-[0.96]"
          >
            {timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {timer.running ? "Пауза" : "Старт"}
          </button>
          <button
            type="button"
            onClick={() => setPreset(Math.round(timer.totalMs / 60_000) || 25)}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-raised text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96]"
          >
            <RotateCcw className="h-4 w-4" />
            Сброс
          </button>
        </div>
      </article>

      {sessions.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {sessions.slice(0, 4).map((session) => (
            <li key={session.id} className="flex items-center justify-between rounded-card bg-surface px-4 py-3 text-sm">
              <span className="tabular-nums">{session.minutes} мин</span>
              <span className="text-muted">
                {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(session.at)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm text-muted">
        Как к вам обращаться
        <input
          value={settings.name}
          maxLength={40}
          onChange={(event) => patchSettings({ name: event.target.value })}
          className={fieldClass}
          placeholder="Имя"
        />
      </label>

      <Segment
        label="Тема"
        value={settings.mode}
        onChange={(mode: Mode) => patchSettings({ mode })}
        options={[
          { id: "dark", label: "Тёмная" },
          { id: "light", label: "Светлая" },
        ]}
      />
      <Segment
        label="Цвет"
        value={settings.accent}
        onChange={(accent: Accent) => patchSettings({ accent })}
        options={ACCENTS.map((accent) => ({ id: accent, label: ACCENT_LABEL[accent] }))}
      />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted">Данные на устройстве</h2>
        <button type="button" onClick={exportBackup} className="h-12 rounded-full bg-surface text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96]">
          Скачать резервную копию
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="h-12 rounded-full bg-surface text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          Восстановить из файла
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void importBackup(file);
          }}
        />
        <button
          type="button"
          onClick={() => {
            resetDemo();
            setMessage("Снова пример данных.");
          }}
          className="h-12 rounded-full bg-raised text-sm font-medium text-muted transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          Вернуть пример
        </button>
        {message ? <p className="text-sm text-accent">{message}</p> : null}
      </div>

      <article className="rounded-card bg-surface p-4">
        <h2 className="font-medium">Поставить на Android</h2>
        <ApkLink />
        <p className="mt-3 text-sm text-pretty text-muted">
          APK ставится вручную: разрешите установку из этого источника. Через Chrome приложение обновляется само.
        </p>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-4 text-sm text-pretty text-muted">
          <li>Опубликуйте приложение кнопкой вверху чата.</li>
          <li>Откройте ссылку в Chrome на телефоне.</li>
          <li>Меню браузера → «Установить приложение» или «Добавить на главный экран».</li>
          <li>ВЕКТОР откроется на весь экран, как обычное приложение, без адресной строки.</li>
        </ol>
        <p className="mt-3 text-sm text-pretty text-muted">
          Дела, привычки и заметки остаются в этом браузере. Чтобы перенести их, скачайте копию и восстановите на телефоне.
        </p>
      </article>
      <p className="pb-2 text-center text-xs text-faint">ВЕКТОР · система дня · только на устройстве</p>
    </Screen>
  );
}

function ApkLink() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(window.location.hostname !== "appassets.androidplatform.net");
  }, []);
  if (!show) return null;
  return (
    <a
      href="/vektor.apk"
      download="VEKTOR.apk"
      className="mt-3 flex h-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent transition-transform duration-150 ease-out active:scale-[0.96]"
    >
      Скачать APK
    </a>
  );
}
