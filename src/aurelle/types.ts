export const TIERS = ["S", "A", "B", "C", "D", "E", "F"] as const;

export type Tier = (typeof TIERS)[number];

export type TierFilter = Tier | "ALL";

export type ViewMode = "grid" | "list";

export type SortKey =
  | "new"
  | "old"
  | "name-asc"
  | "name-desc"
  | "age-asc"
  | "age-desc"
  | "city"
  | "tier";

export type Screen = "archive" | "search" | "settings" | "profile" | "edit";

export type Profile = {
  id: string;
  name: string;
  age: number;
  height: number;
  city: string;
  telegram: string;
  tier: Tier;
  notes: string;
  photoIds: string[];
  createdAt: number;
  updatedAt: number;
  demo?: boolean;
};

export type Filters = {
  ageMin: number;
  ageMax: number;
  city: string;
  telegram: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  ageMin: 18,
  ageMax: 99,
  city: "",
  telegram: false,
};

export type VaultMeta = {
  encrypted: boolean;
  seeded: boolean;
  autoLockMs: number;
  salt?: string;
  verifyIv?: string;
  verify?: ArrayBuffer;
  bioCredentialId?: string;
  bioPrfSalt?: string;
  bioWrapIv?: string;
  bioWrappedKey?: ArrayBuffer;
};

export type ProfileRow = {
  id: string;
  enc: boolean;
  profile?: Profile;
  iv?: string;
  cipher?: ArrayBuffer;
};

export type PhotoRow = {
  id: string;
  profileId: string;
  enc: boolean;
  thumb: ArrayBuffer;
  full: ArrayBuffer;
  ivThumb?: string;
  ivFull?: string;
};

export type PhotoDraft = {
  key: string;
  existingId?: string;
  file?: File;
  url?: string;
};

export type ConfirmState = {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
  run: () => Promise<void> | void;
};

export type PinFlow = null | "create" | "change" | "disable";
