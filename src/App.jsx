import React, { useState, useRef, useEffect } from "react";
import { Container, Button, Box } from "@mui/material";
import $ from "jquery";
import "turn.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const App = ({ language = "en" }) => {
  const isRtl = language === "fa";
  const [numPages, setNumPages] = useState(0);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bookRef = useRef(null);
  const flipSoundRef = useRef(null); // مرجع برای صدای ورق خوردن

  useEffect(() => {
    flipSoundRef.current = new Audio("/flip-sound.mp3"); // مسیر فایل صوتی
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const loadPdf = async (file) => {
    try {
      const pdf = await pdfjsLib.getDocument(file).promise;
      setNumPages(pdf.numPages);

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

      setPages(pagesArray);
    } catch (error) {
      console.error("Error loading PDF:", error);
    }
  };

  useEffect(() => {
    if (bookRef.current && pages.length > 0) {
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
        }
      }, 100);
    }
  }, [pages, isMobile]);

  const playFlipSound = () => {
    if (flipSoundRef.current) {
      flipSoundRef.current.currentTime = 0; // تنظیم مجدد زمان پخش برای پخش سریع‌تر
      flipSoundRef.current.play();
    }
  };

  const nextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
      $(bookRef.current).turn("page", currentPage + 1);
      playFlipSound();
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      $(bookRef.current).turn("page", currentPage - 1);
      playFlipSound();
    }
  };

  const handlePageClick = (index) => {
    setCurrentPage(index + 1);
    $(bookRef.current).turn("page", index + 1);
    playFlipSound();
  };

  return (
    <Container
      maxWidth="md"
      sx={{ textAlign: "center", mt: 5, direction: isRtl ? "rtl" : "ltr" }}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => loadPdf(URL.createObjectURL(e.target.files[0]))}
      />
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
                width: "100%",
                height: isMobile ? "auto" : "100%",
              }}
            />
          </div>
        ))}
      </Box>

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
    </Container>
  );
};

export default App;
