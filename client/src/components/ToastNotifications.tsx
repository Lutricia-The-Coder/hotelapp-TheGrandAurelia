import {
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ToastType = "error" | "success";
type Toast = { id: number; message: string; type: ToastType };

const ToastContext = createContext<((message: string, type: ToastType) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: ToastType) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current.slice(-2), { id, message, type }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      4500,
    );
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className="toast-stack" aria-live="polite">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={`app-toast app-toast-${toast.type}`}
                role={toast.type === "error" ? "alert" : "status"}
              >
                <span className="app-toast-icon" aria-hidden="true">
                  {toast.type === "error" ? (
                    <AlertTriangle size={14} strokeWidth={2.3} />
                  ) : (
                    <Check size={14} strokeWidth={2.5} />
                  )}
                </span>
                <span>{toast.message}</span>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() =>
                    setToasts((current) => current.filter((item) => item.id !== toast.id))
                  }
                >
                  <X size={14} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function ToastMessage({
  message,
  type = "error",
}: {
  message: string;
  type?: ToastType;
}) {
  const notify = useContext(ToastContext);

  if (!notify) {
    throw new Error("ToastMessage must be rendered inside ToastProvider.");
  }

  useEffect(() => {
    if (message) notify(message, type);
  }, [message, notify, type]);

  return null;
}
