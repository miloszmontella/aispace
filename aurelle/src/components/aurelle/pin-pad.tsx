import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { tap } from "@/aurelle/format";

export function PinPad({
  resetKey,
  errorId,
  error,
  disabled,
  onSubmit,
}: {
  resetKey: number;
  errorId: number;
  error?: string | null;
  disabled?: boolean;
  onSubmit: (pin: string) => void;
}) {
  const [digits, setDigits] = useState("");
  const [shake, setShake] = useState(false);
  const submitRef = useRef(onSubmit);
  submitRef.current = onSubmit;

  useEffect(() => {
    setDigits("");
  }, [resetKey]);

  useEffect(() => {
    if (!errorId) return;
    setDigits("");
    setShake(true);
    const timer = window.setTimeout(() => setShake(false), 360);
    return () => window.clearTimeout(timer);
  }, [errorId]);

  useEffect(() => {
    if (digits.length === 4) submitRef.current(digits);
  }, [digits]);

  function push(digit: string) {
    if (disabled) return;
    tap(6);
    setDigits((current) => (current.length >= 4 ? current : `${current}${digit}`));
  }

  return (
    <div>
      <div className={shake ? "pin-dots shake" : "pin-dots"} aria-label="PIN">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className={index < digits.length ? "pin-dot fill" : "pin-dot"} />
        ))}
      </div>
      <p className="pin-msg">{error ?? ""}</p>
      <div className="pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button key={digit} type="button" onClick={() => push(digit)} disabled={disabled}>
            {digit}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => push("0")} disabled={disabled}>
          0
        </button>
        <button
          type="button"
          className="subtle"
          aria-label="Delete digit"
          onClick={() => setDigits((value) => value.slice(0, -1))}
          disabled={disabled}
        >
          <Delete size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
