import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { UserProfile } from "../api";
import { ToastMessage } from "../components/ToastNotifications";

type ProfilePageProps = {
  profile: UserProfile | null;
  profileLoading: boolean;
  profileError: string;
  profileMessage: string;
  profileSaving: boolean;
  profileName: string;
  setProfileName: Dispatch<SetStateAction<string>>;
  profileTitle: string;
  setProfileTitle: Dispatch<SetStateAction<string>>;
  setProfileError: Dispatch<SetStateAction<string>>;
  setProfileMessage: Dispatch<SetStateAction<string>>;
  handleSaveProfile: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  passwordError: string;
  passwordMessage: string;
  passwordCurrent: string;
  setPasswordCurrent: Dispatch<SetStateAction<string>>;
  passwordNew: string;
  setPasswordNew: Dispatch<SetStateAction<string>>;
  passwordConfirm: string;
  setPasswordConfirm: Dispatch<SetStateAction<string>>;
  passwordSaving: boolean;
  handleChangePassword: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleLoadMyBookings: () => Promise<void>;
  handleLoadFavorites: () => Promise<void>;
  onSignOut: () => void;
  showShortcuts?: boolean;
};

export default function ProfilePage({
  profile,
  profileLoading,
  profileError,
  profileMessage,
  profileSaving,
  profileName,
  setProfileName,
  profileTitle,
  setProfileTitle,
  setProfileError,
  setProfileMessage,
  handleSaveProfile,
  passwordError,
  passwordMessage,
  passwordCurrent,
  setPasswordCurrent,
  passwordNew,
  setPasswordNew,
  passwordConfirm,
  setPasswordConfirm,
  passwordSaving,
  handleChangePassword,
  handleLoadMyBookings,
  handleLoadFavorites,
  onSignOut,
  showShortcuts = true,
}: ProfilePageProps) {
  const [visiblePasswords, setVisiblePasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  function togglePasswordVisibility(field: keyof typeof visiblePasswords) {
    setVisiblePasswords((visible) => ({ ...visible, [field]: !visible[field] }));
  }

  function passwordVisibilityButton(field: keyof typeof visiblePasswords) {
    const visible = visiblePasswords[field];
    return (
      <button
        type="button"
        className="password-visibility-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => togglePasswordVisibility(field)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m4 4 16 16" />}
        </svg>
      </button>
    );
  }

  return (
    <section
      id="my-profile"
      className="my-bookings-section profile-section"
    >
      <h2>My Profile</h2>
      <p>Manage your personal details at The Grand Aurelia.</p>

      {profileLoading && <p>Loading your profile...</p>}

      <ToastMessage message={profileError} />

      {profileMessage && (
        <p className="auth-feedback" role="status">
          {profileMessage}
        </p>
      )}

      {profile && !profileLoading && (
        <>
          <div className="profile-summary">
            {profile.image ? (
              <img
                src={profile.image}
                alt="Profile"
                className="profile-avatar"
              />
            ) : (
              <div className="profile-avatar profile-avatar-placeholder">
                {(profile.name || profile.email).charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h3>{profile.name || "Guest"}</h3>
              <p>{profile.email}</p>
              <small>
                Member since{" "}
                {new Date(profile.createdAt).toLocaleDateString("en-ZA")}
              </small>
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSaveProfile}>
            <div className="profile-form-fields">
              <label className="auth-label">
                Title
                <select
                  value={profileTitle}
                  onChange={(event) => setProfileTitle(event.target.value)}
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
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>

              <label className="auth-label profile-email-field">
                Email address
                <input
                  type="email"
                  value={profile.email}
                  readOnly
                  disabled
                />
                
              </label>
            </div>

            <div className="profile-form-actions">
              <button
                type="submit"
                className="gold-button"
                disabled={profileSaving}
              >
                {profileSaving ? "Saving..." : "Save Profile"}
              </button>

              <button
                type="button"
                className="login-link sign-out-button"
                disabled={profileSaving}
                onClick={() => {
                  setProfileName(profile.name ?? "");
                  setProfileTitle(profile.title ?? "");
                  setProfileError("");
                  setProfileMessage("");
                }}
              >
                Reset Changes
              </button>
            </div>
          </form>

          <div className="profile-password-section">
            <h3>{profile.hasPassword ? "Change Password" : "Set a Password"}</h3>

            <p>
              {profile.hasPassword
                ? "Update your account password securely."
                : "You signed in with Google. You can also set a password to sign in using your email address."}
            </p>
            <p className="password-policy-hint">
              Use at least 8 characters, including an uppercase letter, a number, and a special character.
            </p>

            <ToastMessage message={passwordError} />

            {passwordMessage && (
              <p className="auth-feedback" role="status">
                {passwordMessage}
              </p>
            )}

            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="profile-form-fields">
                {profile.hasPassword && (
                  <label className="auth-label">
                    Current password
                    <div className="password-input-wrap">
                      <input
                        type={visiblePasswords.current ? "text" : "password"}
                        value={passwordCurrent}
                        onChange={(event) => setPasswordCurrent(event.target.value)}
                        autoComplete="current-password"
                        required
                      />
                      {passwordVisibilityButton("current")}
                    </div>
                  </label>
                )}

                <label className="auth-label">
                  New password
                  <div className="password-input-wrap">
                    <input
                      type={visiblePasswords.new ? "text" : "password"}
                      value={passwordNew}
                      onChange={(event) => setPasswordNew(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    {passwordVisibilityButton("new")}
                  </div>
                </label>

                <label className="auth-label">
                  Confirm new password
                  <div className="password-input-wrap">
                    <input
                      type={visiblePasswords.confirm ? "text" : "password"}
                      value={passwordConfirm}
                      onChange={(event) => setPasswordConfirm(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                    {passwordVisibilityButton("confirm")}
                  </div>
                </label>
              </div>

              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="gold-button"
                  disabled={passwordSaving}
                >
                  {passwordSaving
                    ? "Updating password..."
                    : profile.hasPassword
                      ? "Change Password"
                      : "Set Password"}
                </button>
              </div>
            </form>
          </div>

          {showShortcuts && <div className="profile-shortcuts">
            <button
              type="button"
              className="login-link sign-out-button"
              onClick={async () => {
                await handleLoadMyBookings();

                document.getElementById("my-bookings")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
            >
              View My Bookings
            </button>

            <button
              type="button"
              className="login-link sign-out-button"
              onClick={async () => {
                await handleLoadFavorites();

                window.requestAnimationFrame(() => {
                  document.getElementById("favorite-hotels")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                });
              }}
            >
              View My Favourites
            </button>
          </div>}
        </>
      )}
      <button
        type="button"
        className="profile-sign-out"
        onClick={onSignOut}
      >
        Sign out
      </button>
    </section>
  );
}
