// store.js
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import pdfReducer from "./features/pdfSlice";
import { persistReducer, persistStore } from "redux-persist";
import storage from "redux-persist/lib/storage"; // استفاده از localStorage برای وب

// تنظیمات persist: در این مثال، فقط slice مربوط به pdf ذخیره می‌شود.
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["pdf"],
};

const rootReducer = combineReducers({
  pdf: pdfReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // اکشن‌های مربوط به redux-persist را نادیده بگیرید تا هشدار غیرقابل سریال‌سازی ایجاد نشود
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/PAUSE",
          "persist/FLUSH",
          "persist/PURGE",
          "persist/REGISTER",
        ],
      },
    }),
});

export const persistor = persistStore(store);

export default store;
