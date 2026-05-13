import React, { useState, useEffect, useRef } from "react";

function LazyImage({ src, alt, className, onError, style, placeholder }) {
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={imgRef} style={{ width: "100%", height: "100%", ...style }}>
      {inView ? (
        <img
          src={src}
          alt={alt || ""}
          className={className}
          loading="lazy"
          onError={onError}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", fontSize: "12px" }}>
          {placeholder || ""}
        </div>
      )}
    </div>
  );
}

export default React.memo(LazyImage);
