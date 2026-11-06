import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export default function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmOptions | null>(null);
  const [toast, setToast] = useState("");
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setRequest(options);
    });
  }, []);

  const close = useCallback((confirmed: boolean) => {
    if (confirmed) setToast("Confirmed");
    resolver.current?.(confirmed);
    resolver.current = null;
    setRequest(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!request) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close, request]);

  const dialog = request ? createPortal(
    <div
      className="confirm-dialog-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close(false);
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h2 id="confirm-dialog-title">{request.title}</h2>
        <p id="confirm-dialog-message">{request.message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={() => close(false)}>
            {request.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            className={request.destructive ? "confirm-dialog-danger" : "confirm-dialog-accept"}
            onClick={() => close(true)}
          >
            {request.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  ) : null;

  return {
    confirm,
    dialog: (
      <>
        {dialog}
        {toast && createPortal(
          <div className="confirmation-toast" role="status" aria-live="polite">
            <span className="confirmation-toast-icon" aria-hidden="true">✓</span>
            <span>{toast}</span>
          </div>,
          document.body,
        )}
      </>
    ),
  };
}
