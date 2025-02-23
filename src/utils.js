import { useEffect, useState, useTransition } from "react";

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}
export default function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(
    getWindowDimensions()
  );

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function handleResize() {
      startTransition(() => {
        setWindowDimensions(getWindowDimensions());
      });
    }

    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { ...windowDimensions, isPending };
}
