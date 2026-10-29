
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../api";

type AuthState = {
  user: AuthUser | null;
};

function getInitialUser(): AuthUser | null {
  const savedUser = sessionStorage.getItem("hotelAuthUser");

  if (!savedUser) return null;

  try {
    const parsed: unknown = JSON.parse(savedUser);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "email" in parsed &&
      "role" in parsed &&
      typeof parsed.id === "string" &&
      typeof parsed.email === "string" &&
      typeof parsed.role === "string"
    ) {
      return parsed as AuthUser;
    }
  } catch {
    // Ignore malformed saved user data.
  }

  sessionStorage.removeItem("hotelAuthUser");
  sessionStorage.removeItem("hotelAuthToken");
  return null;
}

const initialState: AuthState = {
  user: getInitialUser(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    clearUser(state) {
      state.user = null;
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
