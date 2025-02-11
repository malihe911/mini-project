// pdfSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

// اگر بخواهید عملیات بارگذاری PDF را به صورت غیرهمزمان انجام دهید:
export const loadPdfPages = createAsyncThunk(
  "pdf/loadPdfPages",
  async ({ file, isRtl }, thunkAPI) => {
    const pdf = await pdfjsLib.getDocument(file).promise;
    let pagesArray = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
      pagesArray.push(canvas.toDataURL());
    }
    if (isRtl) pagesArray.reverse();
    return { pages: pagesArray };
  }
);

const pdfSlice = createSlice({
  name: "pdf",
  initialState: {
    pdfPages: [],
    numPages: 0,
    currentPage: 1,
    loading: false,
    error: null,
  },
  reducers: {
    removePdf: (state) => {
      state.pdfPages = [];
      state.numPages = 0;
      state.currentPage = 1;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPdfPages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadPdfPages.fulfilled, (state, action) => {
        state.loading = false;
        state.pdfPages = action.payload.pages;
        state.numPages = action.payload.pages.length;
      })
      .addCase(loadPdfPages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { removePdf, setCurrentPage } = pdfSlice.actions;
export default pdfSlice.reducer;
