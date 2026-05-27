import { useState, useEffect, useRef } from "react";

const CHUNK_SIZE = 30;

function useChunkedRender(items) {
  const [visibleCount, setVisibleCount] = useState(() => Math.min(CHUNK_SIZE, items?.length || 0));
  const rafRef = useRef(null);
  const lenRef = useRef(items?.length || 0);

  useEffect(() => {
    const total = items?.length || 0;
    if (total === lenRef.current) return;
    lenRef.current = total;

    setVisibleCount(Math.min(CHUNK_SIZE, total));
    if (total <= CHUNK_SIZE) return;

    let frame = 0;

    const step = () => {
      frame++;
      const next = Math.min(CHUNK_SIZE + frame * CHUNK_SIZE, total);
      setVisibleCount(next);
      if (next < total) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [items]);

  const visibleItems = items ? items.slice(0, visibleCount) : [];
  const totalCount = items?.length || 0;

  return { visibleItems, totalCount, visibleCount };
}

export default useChunkedRender;
