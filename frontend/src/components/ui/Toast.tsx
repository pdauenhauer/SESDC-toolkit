import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useCallback, useContext, useEffect, useRef, useState } from "preact/hooks";
import { Check, CircleAlert } from "lucide-preact";

type Tone = "success" | "error";
type Flash = (message: string, durationMs?: number, tone?: Tone) => void;

const ToastContext = createContext<Flash>(() => {});

/** App-wide toast host: a single pill fixed at the bottom-center. */
export function ToastProvider({ children }: { children: ComponentChildren }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const flash = useCallback<Flash>((message, durationMs = 1800, tone = "success") => {
    window.clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = window.setTimeout(() => setToast(null), durationMs);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={flash}>
      {children}
      {toast && (
        <div role="status" class={`mg-toast${toast.tone === "error" ? " mg-toast--error" : ""}`} key={toast.message}>
          <span class="mg-toast__icon">
            {toast.tone === "error" ? <CircleAlert size={16} strokeWidth={2} /> : <Check size={16} strokeWidth={2} />}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

/** Returns `flash(message, durationMs?, tone?)`. Default 1.8s (app); Account uses 3s. */
export function useToast(): Flash {
  return useContext(ToastContext);
}
