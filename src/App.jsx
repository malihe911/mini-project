import React, { useState, useRef, useEffect } from "react";
import { Container, Button, Box } from "@mui/material";
import $ from "jquery";
import "turn.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const App = ({ language = "en" }) => {
  const [numPages, setNumPages] = useState(0);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bookRef = useRef(null);

  // تشخیص تغییر حالت موبایل / دسکتاپ
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // بارگذاری PDF و تبدیل آن به تصاویر
  const loadPdf = async (file) => {
    try {
      const pdf = await pdfjsLib.getDocument(file).promise;
      setNumPages(pdf.numPages);

      const pagesArray = [];
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
      setPages(pagesArray);
    } catch (error) {
      console.error("Error loading PDF:", error);
    }
  };

  useEffect(() => {
    if (bookRef.current && pages.length > 0) {
      // اول بررسی کنیم که آیا turn.js قبلاً مقداردهی شده
      if ($(bookRef.current).data("turn")) {
        $(bookRef.current).turn("destroy").remove(); // حذف کامل
      }

      // یک تاخیر کوتاه برای اطمینان از حذف کامل
      setTimeout(() => {
        if (bookRef.current) {
          $(bookRef.current).turn({
            width: isMobile ? window.innerWidth - 40 : 800,
            height: isMobile ? window.innerHeight * 0.8 : 600,
            autoCenter: true,
            display: isMobile ? "single" : "double",
          });
        }
      }, 100); // تاخیر 100 میلی‌ثانیه‌ای برای جلوگیری از تداخل
    }
  }, [pages, isMobile]);

  // رفتن به صفحه بعدی
  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
    $(bookRef.current).turn("page", currentPage + 1);
  };

  // رفتن به صفحه قبلی
  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    $(bookRef.current).turn("page", currentPage - 1);
  };

  // تغییر صفحه با کلیک روی تصاویر
  const handlePageClick = (index) => {
    setCurrentPage(index + 1); // شماره صفحه به ترتیب صفحه‌ها است
    $(bookRef.current).turn("page", index + 1);
  };

  return (
    <Container maxWidth="md" sx={{ textAlign: "center", mt: 5 }}>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => loadPdf(URL.createObjectURL(e.target.files[0]))}
      />
      <Box
        ref={bookRef}
        className="flipbook"
        sx={{
          width: isMobile ? "100%" : 800, // در موبایل تمام عرض صفحه را بگیرد
          height: isMobile ? "auto" : 600, // ارتفاع را بر اساس عرض تنظیم کند
          margin: "auto",
          boxShadow: 3,
        }}
      >
        {pages.map((page, index) => (
          <div
            key={index}
            className="page"
            onClick={() => handlePageClick(index)}
          >
            <img
              src={page}
              alt={`Page ${index + 1}`}
              style={{
                width: "100%", // در موبایل کل عرض صفحه را پر کند
                height: isMobile ? "auto" : "100%", // ارتفاع متناسب با عرض تنظیم شود
              }}
            />
          </div>
        ))}
      </Box>

      <Box mt={2}>
        <Button
          onClick={prevPage}
          disabled={currentPage === 1}
          variant="contained"
          sx={{ mx: 1 }}
        >
          صفحه قبلی
        </Button>
        <span>
          صفحه {currentPage} از {numPages}
        </span>
        <Button
          onClick={nextPage}
          disabled={currentPage === numPages}
          variant="contained"
          sx={{ mx: 1 }}
        >
          صفحه بعدی
        </Button>
      </Box>
    </Container>
  );
};

export default App;
