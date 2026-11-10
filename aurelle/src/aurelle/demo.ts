import type { Profile, Tier } from "@/aurelle/types";
import p01 from "@/aurelle/photos/01.jpg";
import p02 from "@/aurelle/photos/02.jpg";
import p03 from "@/aurelle/photos/03.jpg";
import p04 from "@/aurelle/photos/04.jpg";
import p05 from "@/aurelle/photos/05.jpg";
import p06 from "@/aurelle/photos/06.jpg";
import p07 from "@/aurelle/photos/07.jpg";
import p08 from "@/aurelle/photos/08.jpg";
import p09 from "@/aurelle/photos/09.jpg";

export type DemoSeed = {
  id: string;
  photoId: string;
  photoUrl: string;
  name: string;
  age: number;
  height: number;
  city: string;
  telegram: string;
  tier: Tier;
  notes: string;
};

const now = 1_762_000_000_000;

export const DEMOS: DemoSeed[] = [
  {
    id: "demo-sofia",
    photoId: "demo-sofia-p2",
    photoUrl: p09,
    name: "Sofia",
    age: 28,
    height: 174,
    city: "Saint Petersburg",
    telegram: "sofia_arc",
    tier: "S",
    notes: "Quiet, and speaks softly. Likes morning light, long coats, and cities by the water.",
  },
  {
    id: "demo-anastasia",
    photoId: "demo-anastasia-p2",
    photoUrl: p01,
    name: "Anastasia",
    age: 24,
    height: 170,
    city: "Moscow",
    telegram: "nastya_arc",
    tier: "S",
    notes: "Very kind. Likes travel and a beautiful life.",
  },
  {
    id: "demo-maria",
    photoId: "demo-maria-p2",
    photoUrl: p02,
    name: "Maria",
    age: 26,
    height: 168,
    city: "Saint Petersburg",
    telegram: "maria_spb",
    tier: "A",
    notes: "A quiet voice and a precise taste. Prefers northern light and long walks.",
  },
  {
    id: "demo-ekaterina",
    photoId: "demo-ekaterina-p2",
    photoUrl: p03,
    name: "Ekaterina",
    age: 22,
    height: 176,
    city: "Moscow",
    telegram: "katya_m",
    tier: "B",
    notes: "Composed and spare with words. Likes the theatre and late dinners.",
  },
  {
    id: "demo-victoria",
    photoId: "demo-victoria-p2",
    photoUrl: p04,
    name: "Victoria",
    age: 25,
    height: 172,
    city: "Kazan",
    telegram: "vika_kzn",
    tier: "C",
    notes: "Looks straight ahead. The notes keep only what must not be forgotten.",
  },
  {
    id: "demo-darya",
    photoId: "demo-darya-p2",
    photoUrl: p05,
    name: "Darya",
    age: 27,
    height: 165,
    city: "Moscow",
    telegram: "darya_notes",
    tier: "D",
    notes: "A warm tone and an unhurried pace. Often in the city for work.",
  },
  {
    id: "demo-ksenia",
    photoId: "demo-ksenia-p2",
    photoUrl: p06,
    name: "Ksenia",
    age: 23,
    height: 169,
    city: "Sochi",
    telegram: "ksenia_sochi",
    tier: "E",
    notes: "Easy to talk to. Likes the sea out of season.",
  },
  {
    id: "demo-alina",
    photoId: "demo-alina-p2",
    photoUrl: p07,
    name: "Alina",
    age: 29,
    height: 178,
    city: "Moscow",
    telegram: "alina_arc",
    tier: "A",
    notes: "Clear and composed. Values punctuality and short messages.",
  },
  {
    id: "demo-polina",
    photoId: "demo-polina-p2",
    photoUrl: p08,
    name: "Polina",
    age: 21,
    height: 163,
    city: "Kazan",
    telegram: "polina_k",
    tier: "F",
    notes: "A soft manner, attentive to detail.",
  },
];

export function demoProfiles(): Profile[] {
  return DEMOS.map((demo, index) => ({
    id: demo.id,
    name: demo.name,
    age: demo.age,
    height: demo.height,
    city: demo.city,
    telegram: demo.telegram,
    tier: demo.tier,
    notes: demo.notes,
    photoIds: [demo.photoId],
    createdAt: now - index * 86_400_000,
    updatedAt: now - index * 86_400_000,
    demo: true,
  }));
}

export const PRELOAD_PHOTOS = [p01, p02, p03, p04];
