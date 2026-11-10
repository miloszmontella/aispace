import { useEffect, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import * as Switch from "@radix-ui/react-switch";
import { X } from "lucide-react";
import { citiesFrom, SORT_OPTIONS, sortLabel } from "@/aurelle/format";
import { useAurelle } from "@/aurelle/store";
import type { Filters, Tier, TierFilter } from "@/aurelle/types";
import { DEFAULT_FILTERS, TIERS } from "@/aurelle/types";
import { PinPad } from "@/components/aurelle/pin-pad";

export function Overlays() {
  const toast = useAurelle((state) => state.toast);
  const busy = useAurelle((state) => state.busy);
  const covered = useAurelle((state) => state.covered);
  const locked = useAurelle((state) => state.locked);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => useAurelle.setState({ toast: null }), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <>
      <FilterSheet />
      <SortSheet />
      <TierSheet />
      <ConfirmDialog />
      <PinSheet />
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
      {busy ? (
        <div className="busy" role="status">
          <p>{busy}</p>
        </div>
      ) : null}
      {covered && !locked ? (
        <div className="cover">
          <p className="wordmark">Aurelle</p>
        </div>
      ) : null}
    </>
  );
}

function FilterSheet() {
  const open = useAurelle((state) => state.filterOpen);
  const filters = useAurelle((state) => state.filters);
  const tier = useAurelle((state) => state.tier);
  const profiles = useAurelle((state) => state.profiles);
  const sort = useAurelle((state) => state.sort);
  const setFilters = useAurelle((state) => state.setFilters);
  const setTier = useAurelle((state) => state.setTier);
  const setFilterOpen = useAurelle((state) => state.setFilterOpen);
  const setSortOpen = useAurelle((state) => state.setSortOpen);
  const [draftTier, setDraftTier] = useState<TierFilter>(tier);
  const [draft, setDraft] = useState<Filters>(filters);
  const [citiesOpen, setCitiesOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftTier(tier);
    setDraft(filters);
    setCitiesOpen(false);
  }, [open, tier, filters]);

  if (!open) return null;
  const cities = citiesFrom(profiles);

  return (
    <div className="backdrop" onClick={() => setFilterOpen(false)}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Filters" onClick={(event) => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head">
          <h2>Filters</h2>
          <button type="button" className="ghost" aria-label="Close" onClick={() => setFilterOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <p className="field-label">Tier</p>
        <div className="tier-pick" style={{ margin: "0.55rem 0 1rem" }}>
          {(["ALL", ...TIERS] as TierFilter[]).map((item) => (
            <button key={item} type="button" className={draftTier === item ? "on" : undefined} onClick={() => setDraftTier(item)}>
              {item === "ALL" ? "All" : item}
            </button>
          ))}
        </div>
        <p className="field-label">Age</p>
        <div className="age-ends">
          <span>from {draft.ageMin}</span>
          <span>to {draft.ageMax}</span>
        </div>
        <Slider.Root
          className="age-slider"
          min={18}
          max={99}
          step={1}
          minStepsBetweenThumbs={0}
          value={[draft.ageMin, draft.ageMax]}
          onValueChange={([ageMin, ageMax]) => setDraft((current) => ({ ...current, ageMin: ageMin ?? 18, ageMax: ageMax ?? 99 }))}
        >
          <Slider.Track className="age-track">
            <Slider.Range className="age-range" />
          </Slider.Track>
          <Slider.Thumb className="age-thumb" aria-label="Minimum age" />
          <Slider.Thumb className="age-thumb" aria-label="Maximum age" />
        </Slider.Root>
        <p className="field-label">City</p>
        <button type="button" className="set-row" onClick={() => setCitiesOpen((value) => !value)}>
          <span className="set-copy">
            <strong>{draft.city || "All cities"}</strong>
            <em>Choose a city</em>
          </span>
        </button>
        {citiesOpen ? (
          <div>
            <button type="button" className={draft.city === "" ? "city-row on" : "city-row"} onClick={() => setDraft((current) => ({ ...current, city: "" }))}>
              <span className="radio" /> All cities
            </button>
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                className={draft.city === city ? "city-row on" : "city-row"}
                onClick={() => setDraft((current) => ({ ...current, city }))}
              >
                <span className="radio" /> {city}
              </button>
            ))}
          </div>
        ) : null}
        <div className="set-row">
          <span className="set-copy">
            <strong>Telegram</strong>
            <em>Only profiles with a username</em>
          </span>
          <Switch.Root
            className="sw"
            checked={draft.telegram}
            aria-label="Telegram only"
            onCheckedChange={(checked) => setDraft((current) => ({ ...current, telegram: checked }))}
          >
            <Switch.Thumb className="sw-thumb" />
          </Switch.Root>
        </div>
        <button type="button" className="set-row" onClick={() => { setFilterOpen(false); setSortOpen(true); }}>
          <span className="set-copy">
            <strong>Sort</strong>
            <em>{sortLabel(sort)}</em>
          </span>
        </button>
        <button
          type="button"
          className="btn-block primary"
          onClick={() => {
            setTier(draftTier);
            setFilters(draft);
            setFilterOpen(false);
          }}
        >
          Apply
        </button>
        <button
          type="button"
          className="btn-block"
          onClick={() => {
            setDraftTier("ALL");
            setDraft(DEFAULT_FILTERS);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function SortSheet() {
  const open = useAurelle((state) => state.sortOpen);
  const sort = useAurelle((state) => state.sort);
  const setSort = useAurelle((state) => state.setSort);
  const setSortOpen = useAurelle((state) => state.setSortOpen);
  if (!open) return null;
  return (
    <div className="backdrop" onClick={() => setSortOpen(false)}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Sort" onClick={(event) => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head">
          <h2>Sort</h2>
          <button type="button" className="ghost" aria-label="Close" onClick={() => setSortOpen(false)}>
            <X size={18} />
          </button>
        </div>
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={sort === option.id}
            className={sort === option.id ? "sort-row on" : "sort-row"}
            onClick={() => setSort(option.id)}
          >
            <span className="radio" />
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TierSheet() {
  const id = useAurelle((state) => state.tierPickFor);
  const profile = useAurelle((state) => state.profiles.find((item) => item.id === id));
  const assignTier = useAurelle((state) => state.assignTier);
  const setTierPickFor = useAurelle((state) => state.setTierPickFor);
  if (!id || !profile) return null;
  return (
    <div className="backdrop" onClick={() => setTierPickFor(null)}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Change tier" onClick={(event) => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head">
          <h2>Tier</h2>
          <button type="button" className="ghost" aria-label="Close" onClick={() => setTierPickFor(null)}>
            <X size={18} />
          </button>
        </div>
        <p className="subtitle">{profile.name}</p>
        <div className="tier-pick" style={{ marginTop: "1rem" }}>
          {TIERS.map((tier) => (
            <button key={tier} type="button" className={profile.tier === tier ? "on" : undefined} onClick={() => void assignTier(profile.id, tier as Tier)}>
              {tier}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog() {
  const confirm = useAurelle((state) => state.confirm);
  const ask = useAurelle((state) => state.ask);
  if (!confirm) return null;
  return (
    <div className="backdrop" onClick={() => ask(null)}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2>{confirm.title}</h2>
        <p>{confirm.body}</p>
        <button
          type="button"
          className={confirm.danger ? "btn-block danger" : "btn-block primary"}
          onClick={() => void confirm.run()}
        >
          {confirm.confirm}
        </button>
        <button type="button" className="btn-block" onClick={() => ask(null)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function PinSheet() {
  const flow = useAurelle((state) => state.pinFlow);
  const setPinFlow = useAurelle((state) => state.setPinFlow);
  const enable = useAurelle((state) => state.enablePin);
  const change = useAurelle((state) => state.changePin);
  const disable = useAurelle((state) => state.disablePin);
  const verifyCurrent = useAurelle((state) => state.verifyCurrent);
  const busy = useAurelle((state) => state.busy);
  const [step, setStep] = useState<"current" | "next" | "confirm">("next");
  const [first, setFirst] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorId, setErrorId] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  useEffect(() => {
    if (!flow) return;
    setFirst("");
    setError(null);
    setStep(flow === "create" ? "next" : "current");
    setResetKey((value) => value + 1);
  }, [flow]);

  if (!flow) return null;

  const title = flow === "create" ? "Set a PIN" : flow === "change" ? "New PIN" : "Turn off PIN";
  const subtitle =
    step === "current"
      ? "Enter the current code"
      : step === "confirm"
        ? "Repeat the code"
        : flow === "disable"
          ? "Confirm the current code again"
          : "Four digits. The code cannot be recovered.";

  async function submit(pin: string) {
    if (step === "current") {
      const ok = await verifyCurrent(pin);
      if (!ok) {
        setError("Wrong PIN");
        setErrorId((value) => value + 1);
        return;
      }
      if (flow === "disable") {
        await disable();
        return;
      }
      setStep("next");
      setResetKey((value) => value + 1);
      setError(null);
      return;
    }
    if (step === "next") {
      setFirst(pin);
      setStep("confirm");
      setResetKey((value) => value + 1);
      return;
    }
    if (pin !== first) {
      setError("Codes do not match");
      setErrorId((value) => value + 1);
      setStep(flow === "create" ? "next" : "next");
      setFirst("");
      return;
    }
    if (flow === "change") await change(pin);
    else await enable(pin);
  }

  return (
    <div className="backdrop" onClick={() => setPinFlow(null)}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="grab" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="ghost" aria-label="Close" onClick={() => setPinFlow(null)}>
            <X size={18} />
          </button>
        </div>
        <p className="subtitle">{subtitle}</p>
        <PinPad
          resetKey={resetKey}
          errorId={errorId}
          error={error}
          disabled={Boolean(busy)}
          onSubmit={(pin) => void submit(pin)}
        />
      </div>
    </div>
  );
}
