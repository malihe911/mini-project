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

const PdfFlipBook = ({ language = "en" }) => {
  // تعیین جهت بر اساس زبان
  const isRtl = language === "fa";
  const dispatch = useDispatch();
  const { pdfPages, numPages, currentPage, loading } = useSelector(
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
  // ref برای نگهداری به‌روز وضعیت صدای کتاب در callback‌های turn.js
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // تابع پخش صدای ورق زدن
  const playFlipSound = () => {
    if (!soundEnabledRef.current) return;
    const flipSound = new Audio("/flip-sound.mp3");
    flipSound
      .play()
      .catch((error) => console.warn("Audio playback prevented:", error));
  };

  // تعیین وضعیت loaded پس از گذشت ۵۰۰ میلی‌ثانیه
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // به‌روزرسانی اندازه کتاب در تغییر اندازه صفحه
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (bookRef.current && $(bookRef.current).data("turn")) {
        $(bookRef.current).turn(
          "size",
          mobile ? window.innerWidth - 40 : 800,
          mobile ? window.innerHeight * 0.8 : 600
        );
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // راه‌اندازی کتاب ورق‌خورده با turn.js
  const initializeFlipBook = () => {
    if (bookRef.current && pdfPages.length > 0) {
      if ($(bookRef.current).data("turn")) {
        $(bookRef.current).turn("destroy");
      }
      setTimeout(() => {
        $(bookRef.current).turn({
          width: isMobile ? window.innerWidth - 40 : 800,
          height: isMobile ? window.innerHeight * 0.8 : 600,
          autoCenter: true,
          display: "double",
          direction: isRtl ? "rtl" : "ltr",
          when: {
            turning: playFlipSound,
            turned: (event, page) => {
              const actualPage = isRtl ? numPages - page + 1 : page;
              dispatch(setCurrentPage(actualPage));
            },
          },
        });
        if (!isRtl) {
          $(bookRef.current).turn("page", 1);
          dispatch(setCurrentPage(1));
        } else {
          $(bookRef.current).turn("page", numPages);
          dispatch(setCurrentPage(numPages));
        }
      }, 200);
    }
  };

  // استفاده از useLayoutEffect جهت اطمینان از رندر کامل DOM قبل از راه‌اندازی turn.js
  useLayoutEffect(() => {
    initializeFlipBook();
    return () => {
      if (bookRef.current && $(bookRef.current).data("turn")) {
        $(bookRef.current).turn("destroy");
      }
    };
  }, [pdfPages, isMobile, isRtl, numPages, dispatch, loaded]);

  // مدیریت تغییر فایل PDF
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      const newUrl = URL.createObjectURL(e.target.files[0]);
      dispatch(loadPdfPages({ file: newUrl, isRtl }));
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

  // رویداد کلیک روی صفحه: تشخیص محل کلیک جهت تغییر صفحه
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
      {pdfPages.length > 0 && (
        <Box
          ref={bookRef}
          className="flipbook"
          sx={{
            width: isMobile ? "100%" : 800,
            height: isMobile ? "auto" : 600,
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
