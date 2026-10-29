
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import bookingsReducer from "./bookingSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bookings: bookingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
