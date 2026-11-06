import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { ToastMessage } from "./ToastNotifications";

type AuthMode = "login" | "register" | null;

type AuthModalProps = {
  authMode: AuthMode;
  setAuthMode: Dispatch<SetStateAction<AuthMode>>;
  authName: string;
  setAuthName: Dispatch<SetStateAction<string>>;
  authEmail: string;
  setAuthEmail: Dispatch<SetStateAction<string>>;
  authTitle: string;
  setAuthTitle: Dispatch<SetStateAction<string>>;
  authPassword: string;
  setAuthPassword: Dispatch<SetStateAction<string>>;
  authConfirmPassword: string;
  setAuthConfirmPassword: Dispatch<SetStateAction<string>>;
  authMessage: string;
  setAuthMessage: Dispatch<SetStateAction<string>>;
  authError: string;
  setAuthError: Dispatch<SetStateAction<string>>;
  authLoading: boolean;
  handleAuthSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  apiBaseUrl: string;
};

export default function AuthModal({
  authMode,
  setAuthMode,
  authName,
  setAuthName,
  authEmail,
  setAuthEmail,
  authTitle,
  setAuthTitle,
  authPassword,
  setAuthPassword,
  authConfirmPassword,
  setAuthConfirmPassword,
  authMessage,
  setAuthMessage,
  authError,
  setAuthError,
  authLoading,
  handleAuthSubmit,
  apiBaseUrl,
}: AuthModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const closeModal = useCallback(() => {
    setAuthMode(null);
    setAuthMessage("");
    setAuthError("");
  }, [setAuthError, setAuthMessage, setAuthMode]);

  useEffect(() => {
    if (authMode === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [authMode, closeModal]);

  if (authMode === null) return null;

  return (
    <section
      className="auth-section"
      id="auth"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          type="button"
          className="auth-close"
          onClick={closeModal}
          aria-label="Close authentication form"
        >
          ×
        </button>

        <p className="eyebrow">
          <span /> THE GRAND AURELIA
        </p>

        <h2 id="auth-title">
          {authMode === "login" ? (
            <>Welcome <em>back.</em></>
          ) : (
            <>Create your <em>account.</em></>
          )}
        </h2>

        <p className="auth-description">
          {authMode === "login"
            ? "Sign in to continue your journey with us."
            : "Join us and make your next stay special."}
        </p>

        <form onSubmit={handleAuthSubmit}>
          {authMode === "register" && (
            <>
              <label className="auth-label">
                Title
                <select
                  value={authTitle}
                  onChange={(event) => setAuthTitle(event.target.value)}
                  required
                >
                  <option value="">Select your title</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Miss">Miss</option>
                  <option value="Dr">Dr</option>
                  <option value="Prof">Prof</option>
                </select>
              </label>

              <label className="auth-label">
                Full name
                <input
                  type="text"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  autoComplete="name"
                  placeholder="Your full name"
                  maxLength={100}
                  required
                />
              </label>
            </>
          )}

          <label className="auth-label">
            Email address
            <input
              type="email"
              value={authEmail}
              onChange={(event) => setAuthEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="auth-label">
            Password
            <div className="password-input-wrap">
              <input
                type={showPassword ? "text" : "password"}
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                placeholder={
                  authMode === "register"
                    ? "8+ characters, uppercase, number, symbol"
                    : "Your password"
                }
                required
              />
              <button
                type="button"
                className="password-visibility-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {showPassword && <path d="m4 4 16 16" />}
                </svg>
              </button>
            </div>
          </label>

          {authMode === "register" && (
            <label className="auth-label">
              Confirm password
              <div className="password-input-wrap">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={authConfirmPassword}
                  onChange={(event) =>
                    setAuthConfirmPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  placeholder="Enter your password again"
                  required
                />
                <button
                  type="button"
                  className="password-visibility-toggle"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                    {showConfirmPassword && <path d="m4 4 16 16" />}
                  </svg>
                </button>
              </div>
            </label>
          )}

          <ToastMessage message={authError} />

          {authMessage && (
            <p className="auth-feedback auth-feedback-success" role="status">
              {authMessage}
            </p>
          )}

          <button
            type="submit"
            className="gold-button auth-submit"
            disabled={authLoading}
          >
            {authLoading
              ? "Please wait..."
              : authMode === "login"
                ? "Sign in"
                : "Create account"}
            {!authLoading && <span>→</span>}
          </button>
        </form>

        <div className="google-auth-divider">
          <span>or</span>
        </div>

        <a
          className="google-signin-button"
          href={`${apiBaseUrl}/auth/google`}
          aria-label="Continue with Google"
        >
          <span className="google-signin-mark" aria-hidden="true">
            G
          </span>
          <span>Continue with Google</span>
        </a>

        <p className="auth-switch">
          {authMode === "login"
            ? "New to The Grand Aurelia?"
            : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === "login" ? "register" : "login");
              setAuthMessage("");
              setAuthError("");
              setAuthConfirmPassword("");
            }}
          >
            {authMode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </section>
  );
}
