import { addDays, ymd } from "@/vektor/logic";
import type { Snapshot } from "@/vektor/types";

const MIN = 60_000;

export function createDemo(now = new Date()): Snapshot {
  const today = ymd(now);
  const ago = (days: number) => addDays(today, -days);
  const t = now.getTime();

  return {
    settings: { name: "Алекс", mode: "dark", accent: "lagoon" },
    timer: { running: false, endsAt: null, remainingMs: 25 * MIN, totalMs: 25 * MIN },
    sessions: [
      { id: "s-today", minutes: 25, at: t - 3 * 60 * MIN },
      { id: "s-yday", minutes: 50, at: t - 26 * 60 * MIN },
    ],
    tasks: [
      {
        id: "t-net",
        title: "Оплатить домашний интернет",
        notes: "Квитанция в почте, списать с карты.",
        list: "home",
        priority: "high",
        due: ago(1),
        done: false,
        doneAt: null,
        createdAt: t - 5 * 86400000,
      },
      {
        id: "t-report",
        title: "Сдать черновик квартального отчёта",
        notes: "Цифры у Марины в таблице. Не забыть раздел про риски.",
        list: "work",
        priority: "high",
        due: today,
        done: false,
        doneAt: null,
        createdAt: t - 2 * 86400000,
      },
      {
        id: "t-filter",
        title: "Купить фильтр для воды",
        notes: "",
        list: "home",
        priority: "mid",
        due: today,
        done: false,
        doneAt: null,
        createdAt: t - 86400000,
      },
      {
        id: "t-call",
        title: "Созвон с командой в 16:00",
        notes: "Повестка: сроки и кто закрывает макет.",
        list: "work",
        priority: "mid",
        due: today,
        done: true,
        doneAt: today,
        createdAt: t - 86400000,
      },
      {
        id: "t-mail",
        title: "Разобрать входящие за неделю",
        notes: "",
        list: "inbox",
        priority: "low",
        due: null,
        done: false,
        doneAt: null,
        createdAt: t - 3 * 86400000,
      },
      {
        id: "t-dentist",
        title: "Записаться к стоматологу",
        notes: "Утро, не пятница.",
        list: "home",
        priority: "low",
        due: addDays(today, 3),
        done: false,
        doneAt: null,
        createdAt: t - 4 * 86400000,
      },
      {
        id: "t-book",
        title: "Дочитать главу про внимание",
        notes: "",
        list: "later",
        priority: "none",
        due: null,
        done: false,
        doneAt: null,
        createdAt: t - 6 * 86400000,
      },
    ],
    habits: [
      { id: "h-water", title: "Стакан воды утром", icon: "droplets", checks: [1, 2, 3, 4, 5, 6, 7, 8].map(ago) },
      { id: "h-walk", title: "Прогулка 30 минут", icon: "footprints", checks: [0, 2, 3, 5, 6].map(ago) },
      { id: "h-read", title: "Двадцать страниц", icon: "book", checks: Array.from({ length: 12 }, (_, i) => ago(i)) },
      { id: "h-moon", title: "Экран выключен к 23:00", icon: "moon", checks: [1, 2, 4, 5, 8].map(ago) },
    ],
    notes: [
      {
        id: "n-kazan",
        title: "Поездка в Казань",
        body: "Октябрь или начало ноября. Отель у Кремля, не шумный центр. Взять пальто и удобную обувь. Спросить у Лены про балет.",
        pinned: true,
        updatedAt: t - 2 * 3600000,
      },
      {
        id: "n-mail",
        title: "Черновик письма заказчику",
        body: "Добрый день. Черновик отчёта будет в пятницу до 18:00. В нём сроки, риски и что уже согласовано. Если нужно раньше — напишите.",
        pinned: false,
        updatedAt: t - 20 * 3600000,
      },
      {
        id: "n-shop",
        title: "Купить на неделю",
        body: "Овёс, яйца, зелень, кофе, фильтр для воды, средство для стёкол.",
        pinned: false,
        updatedAt: t - 50 * 3600000,
      },
    ],
  };
}
