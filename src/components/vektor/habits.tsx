import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { HABIT_ICON } from "@/components/vektor/icons";
import { cn, fieldClass, IconAction, PrimaryButton, Screen, Sheet } from "@/components/vektor/ui";
import { HABIT_ICON_LABEL, HABIT_ICONS } from "@/vektor/labels";
import { streak, weekdayShort, weekOf, ymd } from "@/vektor/logic";
import { useVektor } from "@/vektor/store";
import type { HabitIconName } from "@/vektor/types";

export function HabitsScreen({ now }: { now: Date }) {
  const habits = useVektor((state) => state.habits);
  const toggleHabit = useVektor((state) => state.toggleHabit);
  const addHabit = useVektor((state) => state.addHabit);
  const deleteHabit = useVektor((state) => state.deleteHabit);
  const [open, setOpen] = useState(false);
  const today = ymd(now);
  const days = weekOf(today);

  return (
    <Screen
      title="Привычки"
      action={
        <IconAction label="Новая привычка" onClick={() => setOpen(true)}>
          <Plus className="h-5 w-5" />
        </IconAction>
      }
    >
      <p className="-mt-2 text-sm text-muted">Отметьте день. Серия считается подряд, с сегодня или со вчера.</p>
      {habits.length === 0 ? (
        <p className="rounded-card bg-surface px-4 py-8 text-center text-sm text-muted">Пока ни одной привычки.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {habits.map((habit) => {
            const Icon = HABIT_ICON[habit.icon];
            const run = streak(habit.checks, today);
            return (
              <li key={habit.id} className="rounded-card bg-surface p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-raised text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{habit.title}</p>
                    <p className="text-sm text-muted">{run === 0 ? "Серия ещё не началась" : `Серия ${run} ${daysWord(run)}`}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Удалить «${habit.title}»`}
                    onClick={() => deleteHabit(habit.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-transform duration-150 ease-out active:scale-[0.96]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const on = habit.checks.includes(day);
                    const isToday = day === today;
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={on}
                        aria-label={`${habit.title}, ${weekdayShort(day)} ${day.slice(8)}`}
                        onClick={() => toggleHabit(habit.id, day)}
                        className="flex flex-col items-center gap-1 rounded-xl py-1 transition-transform duration-150 ease-out active:scale-[0.96]"
                      >
                        <span className={cn("text-xs", isToday ? "font-semibold text-ink" : "text-muted")}>{weekdayShort(day)}</span>
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-xs tabular-nums",
                            on ? "bg-accent text-on-accent" : "bg-raised text-muted",
                            isToday && !on && "ring-1 ring-accent",
                          )}
                        >
                          {Number(day.slice(8))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {open ? <HabitSheet onClose={() => setOpen(false)} onSave={addHabit} /> : null}
    </Screen>
  );
}

function HabitSheet({ onClose, onSave }: { onClose: () => void; onSave: (title: string, icon: HabitIconName) => void }) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState<HabitIconName>("droplets");
  return (
    <Sheet title="Новая привычка" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Название
          <input
            value={title}
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, зарядка"
            className={fieldClass}
            autoFocus
          />
        </label>
        <div className="grid grid-cols-3 gap-2">
          {HABIT_ICONS.map((name) => {
            const Icon = HABIT_ICON[name];
            const on = icon === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={on}
                onClick={() => setIcon(name)}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-xs transition-transform duration-150 ease-out active:scale-[0.96]",
                  on ? "bg-accent text-on-accent" : "bg-raised text-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {HABIT_ICON_LABEL[name]}
              </button>
            );
          })}
        </div>
        <PrimaryButton
          disabled={!title.trim()}
          onClick={() => {
            onSave(title.trim(), icon);
            onClose();
          }}
        >
          Добавить
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

function daysWord(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}
