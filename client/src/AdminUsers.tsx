
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "./api";

type ManagedUser = {
  id: string;
  name: string | null;
  title: string | null;
  email: string;
  role: "ADMIN" | "GUEST";
  createdAt: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export default function AdminUsers({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    const token = sessionStorage.getItem("hotelAuthToken");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/users/admin`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result: ApiResponse<ManagedUser[]> = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || "Unable to load users.");
      }

      setUsers(result.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load users.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleRoleChange(user: ManagedUser) {
    const nextRole = user.role === "ADMIN" ? "GUEST" : "ADMIN";
    const action = nextRole === "ADMIN" ? "promote" : "remove administrator access from";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${user.name || user.email}?`,
      )
    ) {
      return;
    }

    const token = sessionStorage.getItem("hotelAuthToken");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setSavingUserId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${user.id}/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: nextRole }),
        },
      );

      const result: ApiResponse<ManagedUser> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to update user role.");
      }

      setMessage(
        `${user.name || user.email} is now ${nextRole === "ADMIN" ? "an administrator" : "a guest"}.`,
      );

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update user role.",
      );
    } finally {
      setSavingUserId(null);
    }
  }

  const administratorCount = users.filter(
    (user) => user.role === "ADMIN",
  ).length;

  return (
    <section id="admin-users" className="my-bookings-section">
      <h2>Manage Users</h2>
      <p>View registered accounts and manage administrator access.</p>

      <button
        type="button"
        className="login-link sign-out-button"
        onClick={() => void loadUsers()}
        disabled={loading}
      >
        {loading ? "Loading users..." : "Refresh Users"}
      </button>

      {error && (
        <p className="auth-feedback auth-feedback-error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="auth-feedback" role="status">
          {message}
        </p>
      )}

      {!loading && !error && (
        <p>
          {users.length} registered {users.length === 1 ? "user" : "users"}
          {" · "}
          {administratorCount} {administratorCount === 1 ? "administrator" : "administrators"}
        </p>
      )}

      {loading && <p>Loading registered users...</p>}

      {!loading && !error && users.length === 0 && (
        <p>No registered users found.</p>
      )}

      {!loading &&
        users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          const isLastAdministrator =
            user.role === "ADMIN" && administratorCount <= 1;

          return (
            <article className="my-booking-card" key={user.id}>
              <h3>{user.name || "Name not provided"}</h3>

              {user.title && <p>Title: {user.title}</p>}

              <p>Email: {user.email}</p>

              <p>
                Registered:{" "}
                {new Date(user.createdAt).toLocaleDateString("en-ZA")}
              </p>

              <p>
                Role: <strong>{user.role === "ADMIN" ? "Administrator" : "Guest"}</strong>
              </p>

              {isCurrentUser && (
                <p>This is your account. You cannot change your own role.</p>
              )}

              {isLastAdministrator && !isCurrentUser && (
                <p>This is the last administrator and cannot be demoted.</p>
              )}

              <button
                type="button"
                className="login-link sign-out-button"
                disabled={
                  isCurrentUser ||
                  isLastAdministrator ||
                  savingUserId === user.id
                }
                onClick={() => void handleRoleChange(user)}
              >
                {savingUserId === user.id
                  ? "Updating..."
                  : user.role === "ADMIN"
                    ? "Remove Admin Access"
                    : "Make Administrator"}
              </button>
            </article>
          );
        })}
    </section>
  );
}
