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
});

export const persistor = persistStore(store);

export default store;
