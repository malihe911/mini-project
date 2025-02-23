import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
import { Container, Button, Box, Typography } from "@mui/material";
import $ from "jquery";
import "turn.js";
import { useDispatch, useSelector } from "react-redux";
import {
  loadPdfPages,
  removePdf,
  setCurrentPage,
} from "../Redux/features/pdfSlice";
import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

const PdfFlipBook = ({ language = "en" }) => {
  // تعیین جهت بر اساس زبان
  // const isRtl = language === "fa";

  const dispatch = useDispatch();
  const { pdfPages, numPages, currentPage, loading, isRtl } = useSelector(
    (state) => state.pdf
  );
  const fileUrl = useSelector((state) => state.pdf.fileUrl);

  // وضعیت‌های محلی
  const [loaded, setLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // مراجع DOM
  const bookRef = useRef(null);
  const fileInputRef = useRef(null);

  // نگهداری وضعیت صدای کتاب در callback‌های turn.js
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // پیش‌بارگذاری صدا با استفاده از ref
  const flipSoundRef = useRef(null);
  useEffect(() => {
    flipSoundRef.current = new Audio("/flip-sound.mp3");
    flipSoundRef.current.preload = "auto";
  }, []);

  // تابع پخش صدای ورق زدن
  const playFlipSound = () => {
    if (!soundEnabledRef.current) return;
    if (flipSoundRef.current) {
      flipSoundRef.current.currentTime = 0;
      flipSoundRef.current
        .play()
        .catch((error) => console.warn("Audio playback prevented:", error));
    }
  };

  // تعیین وضعیت loaded پس از گذشت ۵۰۰ میلی‌ثانیه
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // به‌روزرسانی اندازه کتاب در تغییر اندازه صفحه (بدون تغییر حالت نمایش)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (bookRef.current && $(bookRef.current).data("turn")) {
        $(bookRef.current).turn(
          "size",
          mobile ? window.innerWidth - 40 : 800,
          mobile ? window.innerHeight * 0.95 : 600
        );
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // راه‌اندازی اولیه کتاب ورق‌خورده
  useLayoutEffect(() => {
    if (pdfPages.length > 0) {
      if (bookRef.current && $(bookRef.current).data("turn")) {
        $(bookRef.current).turn("destroy");
      }

      setTimeout(() => {
        $(bookRef.current).turn({
          width: isMobile ? window.innerWidth - 40 : 800,
          height: isMobile ? window.innerHeight * 0.95 : 600,
          autoCenter: true,
          display: isMobile ? "single" : "double",
          direction: isRtl ? "rtl" : "ltr", // Set direction dynamically
          when: {
            turning: (event, page) => {
              playFlipSound();
            },
            turned: (event, page) => {
              const actualPage = isRtl ? numPages - page + 1 : page;
              dispatch(setCurrentPage(actualPage));
            },
          },
        });

        // Set initial page based on RTL/LTR
        if (!isRtl) {
          $(bookRef.current).turn("page", 1);
          dispatch(setCurrentPage(1));
        } else {
          $(bookRef.current).turn("page", numPages);
          dispatch(setCurrentPage(numPages));
        }

        // Move to the currentPage once initialized
        if (currentPage) {
          const adjustedPage = isRtl ? numPages - currentPage + 1 : currentPage;
          $(bookRef.current).turn("page", adjustedPage);
        } else {
          $(bookRef.current).turn("page", isRtl ? numPages : 1);
          dispatch(setCurrentPage(isRtl ? numPages : 1));
        }
      }, 200);
    }
  }, [pdfPages, isRtl, numPages, dispatch, loaded, isMobile]);

  // به‌روزرسانی حالت نمایش (display) در مواقعی که حالت موبایل/دسکتاپ تغییر می‌کند
  useEffect(() => {
    if (
      pdfPages.length > 0 &&
      bookRef.current &&
      $(bookRef.current).data("turn")
    ) {
      const savedPage = currentPage;
      // کتاب را از بین می‌بریم
      $(bookRef.current).turn("destroy");
      setTimeout(() => {
        // راه‌اندازی مجدد کتاب با تنظیمات جدید
        $(bookRef.current).turn({
          width: isMobile ? window.innerWidth - 40 : 800,
          height: isMobile ? window.innerHeight * 0.95 : 600,
          autoCenter: true,
          display: isMobile ? "single" : "double",
          direction: isRtl ? "rtl" : "ltr",
          when: {
            turning: (event, page) => {
              playFlipSound();
            },
            turned: (event, page) => {
              const actualPage = isRtl ? numPages - page + 1 : page;
              dispatch(setCurrentPage(actualPage));
            },
          },
        });
        // بازیابی صفحه فعلی
        $(bookRef.current).turn(
          "page",
          isRtl ? numPages - savedPage + 1 : savedPage
        );
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  const detectRtlFromPdf = async (file) => {
    const rtlChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/; // Persian, Arabic, etc.
    try {
      const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;

      let detectedRtl = false;
      const numPagesToCheck = Math.min(3, pdf.numPages); // Check up to 3 pages

      for (let pageNum = 1; pageNum <= numPagesToCheck; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Extract plain text from the page
        const extractedText = textContent.items
          .map((item) => item.str)
          .join(" ");

        if (rtlChars.test(extractedText)) {
          detectedRtl = true;
          break; // Stop checking if RTL is found
        }
      }

      return detectedRtl;
    } catch (error) {
      console.error("Error detecting RTL in PDF:", error);
      return false; // Default to LTR if an error occurs
    }
  };

  // مدیریت تغییر فایل PDF
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      const file = e.target.files[0];
      const newUrl = URL.createObjectURL(file);

      const isRtl = await detectRtlFromPdf(file);
      console.log("isRtl", isRtl);
      // If no text was found, use a fallback (e.g., user selection)
      dispatch(loadPdfPages({ file: newUrl, isRtl: isRtl ?? false }));
    }
  };

  // رفتن به صفحه بعد
  const nextPage = () => {
    if (isRtl) {
      if (currentPage > 1) {
        const newPage = currentPage - 1;
        dispatch(setCurrentPage(newPage));
        $(bookRef.current).turn("page", numPages - newPage + 1);
      }
    } else {
      if (currentPage < numPages) {
        const newPage = currentPage + 1;
        dispatch(setCurrentPage(newPage));
        $(bookRef.current).turn("page", newPage);
      }
    }
  };

  // رفتن به صفحه قبلی
  const prevPage = () => {
    if (isRtl) {
      if (currentPage < numPages) {
        const newPage = currentPage + 1;
        dispatch(setCurrentPage(newPage));
        $(bookRef.current).turn("page", numPages - newPage + 1);
      }
    } else {
      if (currentPage > 1) {
        const newPage = currentPage - 1;
        dispatch(setCurrentPage(newPage));
        $(bookRef.current).turn("page", newPage);
      }
    }
  };

  // حذف PDF و پاکسازی کتاب
  const handleRemovePdf = () => {
    if (bookRef.current && $(bookRef.current).data("turn")) {
      $(bookRef.current).turn("destroy");
    }
    dispatch(removePdf());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // رویداد کلیک روی صفحه جهت تغییر صفحه
  const handlePageClick = (event) => {
    if (!bookRef.current) return;
    const rect = bookRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const containerWidth = rect.width;
    if (clickX > containerWidth / 2) {
      nextPage();
    } else {
      prevPage();
    }
  };

  return (
    <Container
      sx={{ textAlign: "center", mt: 5, direction: isRtl ? "rtl" : "ltr" }}
    >
      {/* انتخاب فایل PDF */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
      />

      {/* دکمه‌های حذف PDF و کنترل صدا */}
      <Button
        onClick={handleRemovePdf}
        variant="outlined"
        sx={{ mt: 2, mb: 2 }}
      >
        حذف PDF
      </Button>
      <Button
        onClick={() => setSoundEnabled((prev) => !prev)}
        variant="outlined"
        sx={{ mt: 2, mb: 2, ml: 2 }}
      >
        {soundEnabled ? "قطع صدا" : "وصل صدا"}
      </Button>

      {loading && <p>در حال بارگذاری PDF...</p>}

      {/* نمایش کتاب ورق‌خورده */}
      {loaded && pdfPages.length > 0 && (
        <Box
          ref={bookRef}
          className="flipbook"
          sx={{
            width: isMobile ? "100%" : 800,
            height: isMobile ? window.innerHeight * 0.95 : 600,
            margin: "auto",
            boxShadow: 3,
          }}
        >
          {(isRtl ? [...pdfPages].reverse() : pdfPages).map((page, index) => (
            <div
              key={index}
              className="page"
              onClick={handlePageClick}
              style={{ cursor: "pointer" }}
            >
              <img
                src={page}
                alt={`صفحه ${isRtl ? numPages - index : index + 1}`}
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  width: "100%",
                  height: isMobile ? "auto" : "100%",
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            </div>
          ))}
        </Box>
      )}

      {/* دکمه‌های ناوبری همراه با نمایش شماره صفحه */}
      {pdfPages.length > 0 && (
        <Box
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button onClick={prevPage} variant="contained" sx={{ mr: 1 }}>
            صفحه قبلی
          </Button>
          <Typography variant="h6" sx={{ mx: 2 }}>
            صفحه {currentPage} از {numPages}
          </Typography>
          <Button onClick={nextPage} variant="contained">
            صفحه بعدی
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default PdfFlipBook;
