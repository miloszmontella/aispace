import type { Accent, HabitIconName, ListId, Priority } from "@/vektor/types";

export const LIST_LABEL: Record<ListId, string> = {
  inbox: "Входящие",
  work: "Работа",
  home: "Дом",
  later: "Потом",
};

export const LISTS: ListId[] = ["inbox", "work", "home", "later"];

export const PRIORITY_LABEL: Record<Priority, string> = {
  none: "Без приоритета",
  low: "Низкий",
  mid: "Средний",
  high: "Высокий",
};

export const PRIORITIES: Priority[] = ["none", "low", "mid", "high"];

export const ACCENT_LABEL: Record<Accent, string> = {
  lagoon: "Лагуна",
  amber: "Янтарь",
  clay: "Глина",
};

export const ACCENTS: Accent[] = ["lagoon", "amber", "clay"];

export const HABIT_ICON_LABEL: Record<HabitIconName, string> = {
  droplets: "Вода",
  footprints: "Шаги",
  book: "Книга",
  moon: "Вечер",
  dumbbell: "Сила",
  coffee: "Утро",
};

export const HABIT_ICONS: HabitIconName[] = ["droplets", "footprints", "book", "moon", "dumbbell", "coffee"];
