import { BookOpen, Coffee, Droplets, Dumbbell, Footprints, Moon, type LucideIcon } from "lucide-react";
import type { HabitIconName } from "@/vektor/types";

export const HABIT_ICON: Record<HabitIconName, LucideIcon> = {
  droplets: Droplets,
  footprints: Footprints,
  book: BookOpen,
  moon: Moon,
  dumbbell: Dumbbell,
  coffee: Coffee,
};
