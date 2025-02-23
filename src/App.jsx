import React from "react";
import { ThemeProvider, createTheme } from "@mui/material";
import PdfFlipBook from "./components/PdfFlipBook";
import { Provider } from "react-redux";
import store, { persistor } from "./Redux/store";
import { PersistGate } from "redux-persist/integration/react";
import useWindowDimensions from "./utils";

// Custom theme for overriding default MUI font
const theme = createTheme({
  typography: {
    fontFamily: "Yekan, Arial, sans-serif",
  },
});

function App() {
  const { isPending } = useWindowDimensions();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider theme={theme}>
          {!isPending && <PdfFlipBook />}
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;
