import React, { useRef, useState, useLayoutEffect, useEffect } from "react";
import { Container, Button, Box } from "@mui/material";
import $ from "jquery";
import "turn.js";
import { useDispatch, useSelector } from "react-redux";
import {
  loadPdfPages,
  removePdf,
  setCurrentPage,
} from "../Redux/features/pdfSlice";

const PdfFlipBook = ({ language = "en" }) => {
  const isRtl = language === "fa";
  const dispatch = useDispatch();
  const { pdfPages, numPages, currentPage, loading } = useSelector(
    (state) => state.pdf
  );
  const [loaded, setLoaded] = useState(false);

  const fileUrl = useSelector((state) => state.pdf.fileUrl);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bookRef = useRef(null);
  const fileInputRef = useRef(null);

  // صدای ورق زدن
  const playFlipSound = () => {
    const flipSound = new Audio("/flip-sound.mp3");
    flipSound
      .play()
      .catch((error) => console.warn("Audio playback prevented:", error));
  };
  useEffect(() => {
    setTimeout(() => {
      setLoaded(true);
    }, 500);
  }, []);

  // بروزرسانی اندازه کتاب در هنگام تغییر اندازه صفحه
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

  // تابع راه‌اندازی کتاب ورق‌خورده
  const initializeFlipBook = () => {
    if (bookRef.current && pdfPages.length > 0) {
      // از بین بردن نمونه قبلی در صورت وجود
      if ($(bookRef.current).data("turn")) {
        $(bookRef.current).turn("destroy");
      }
      // استفاده از تاخیر افزایش یافته جهت اطمینان از رندر کامل تصاویر
      setTimeout(() => {
        $(bookRef.current).turn({
          width: isMobile ? window.innerWidth - 40 : 800,
          height: isMobile ? window.innerHeight * 0.8 : 600,
          autoCenter: true,
          display: "double", // نمایش دو صفحه‌ای برای موبایل و دسکتاپ
          direction: isRtl ? "rtl" : "ltr",
          when: {
            turning: playFlipSound,
            turned: (event, page) => {
              // محاسبه شماره واقعی صفحه با توجه به جهت
              const actualPage = isRtl ? numPages - page + 1 : page;
              dispatch(setCurrentPage(actualPage));
            },
          },
        });
        // تنظیم صفحه شروع
        if (!isRtl) {
          $(bookRef.current).turn("page", 1);
          dispatch(setCurrentPage(1));
        } else {
          $(bookRef.current).turn("page", numPages);
          dispatch(setCurrentPage(numPages));
        }
      }, 200); // افزایش تاخیر از 100 به 200 میلی‌ثانیه
    }
  };

  // استفاده از useLayoutEffect جهت اطمینان از به‌روز بودن DOM قبل از راه‌اندازی turn.js
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

  // رفتن به صفحه بعد (با در نظر گرفتن جهت)
  const nextPage = () => {
    if (isRtl) {
      if (currentPage > 1) {
        const newPage = currentPage - 1;
        dispatch(setCurrentPage(newPage));
        // تبدیل شماره صفحه منطقی به شماره صفحه turn.js
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

  // رفتن به صفحه قبلی (با در نظر گرفتن جهت)
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

  return (
    <Container
      sx={{ textAlign: "center", mt: 5, direction: isRtl ? "rtl" : "ltr" }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
      />
      <Button
        onClick={handleRemovePdf}
        variant="outlined"
        sx={{ mt: 2, mb: 2 }}
      >
        حذف PDF
      </Button>
      {loading && <p>در حال بارگذاری PDF...</p>}
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
            <div key={index} className="page">
              <img
                src={page}
                alt={`صفحه ${isRtl ? numPages - index : index + 1}`}
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
                style={{
                  width: "100%",
                  height: isMobile ? "auto" : "100%",
                  userSelect: "none",
                }}
              />
            </div>
          ))}
        </Box>
      )}
      {/* دکمه‌های ناوبری اختیاری */}
      {pdfPages.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Button onClick={prevPage} variant="contained" sx={{ mr: 1 }}>
            صفحه قبلی
          </Button>
          <Button onClick={nextPage} variant="contained">
            صفحه بعدی
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default PdfFlipBook;
