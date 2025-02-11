// PdfFlipBook.jsx
import React, { useRef, useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bookRef = useRef(null);
  const fileInputRef = useRef(null); // اضافه کردن ریف برای کنترل input فایل

  // پخش صدای ورق زدن
  const playFlipSound = () => {
    const flipSound = new Audio("/flip-sound.mp3");
    flipSound.play();
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // راه‌اندازی turn.js زمانی که صفحات موجود شدند
  useEffect(() => {
    if (bookRef.current && pdfPages.length > 0) {
      if ($(bookRef.current).data("turn")) {
        $(bookRef.current).turn("destroy").remove();
      }
      setTimeout(() => {
        if (bookRef.current) {
          $(bookRef.current).turn({
            width: isMobile ? window.innerWidth - 40 : 800,
            height: isMobile ? window.innerHeight * 0.8 : 600,
            autoCenter: true,
            display: isMobile ? "single" : "double",
            direction: isRtl ? "rtl" : "ltr",
          });
          $(bookRef.current)
            .unbind("turning")
            .bind("turning", function () {
              playFlipSound();
            });
        }
      }, 100);
    }
  }, [pdfPages, isMobile, isRtl]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      dispatch(loadPdfPages({ file: fileUrl, isRtl }));
    }
  };

  const nextPage = () => {
    if (currentPage < numPages) {
      dispatch(setCurrentPage(currentPage + 1));
      $(bookRef.current).turn("page", currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      dispatch(setCurrentPage(currentPage - 1));
      $(bookRef.current).turn("page", currentPage - 1);
    }
  };

  const handlePageClick = (index) => {
    dispatch(setCurrentPage(index + 1));
    $(bookRef.current).turn("page", index + 1);
  };

  // دکمه حذف PDF: علاوه بر dispatch اکشن حذف، مقدار input فایل رو هم ریست می‌کنیم.
  const handleRemovePdf = () => {
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
          {pdfPages.map((page, index) => (
            <div
              key={index}
              className="page"
              onClick={() => handlePageClick(index)}
            >
              <img
                src={page}
                alt={`Page ${index + 1}`}
                draggable="false"
                onContextMenu={(e) => e.preventDefault()}
                onDoubleClick={(e) => e.preventDefault()}
                style={{
                  width: "100%",
                  height: isMobile ? "auto" : "100%",
                  userSelect: "none",
                  WebkitUserDrag: "none",
                  WebkitTouchCallout: "none",
                }}
              />
            </div>
          ))}
        </Box>
      )}
      {pdfPages.length > 0 && (
        <Box mt={2}>
          <Button
            onClick={isRtl ? nextPage : prevPage}
            disabled={currentPage === (isRtl ? numPages : 1)}
            variant="contained"
            sx={{ mx: 1 }}
          >
            {isRtl ? "صفحه بعدی" : "صفحه قبلی"}
          </Button>
          <span>
            صفحه {currentPage} از {numPages}
          </span>
          <Button
            onClick={isRtl ? prevPage : nextPage}
            disabled={currentPage === (isRtl ? 1 : numPages)}
            variant="contained"
            sx={{ mx: 1 }}
          >
            {isRtl ? "صفحه قبلی" : "صفحه بعدی"}
          </Button>
        </Box>
      )}
    </Container>
  );
};

export default PdfFlipBook;
