import React, { useState, useRef, useEffect } from "react";

function Accordion({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [height, setHeight] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen, children]);

  return (
    <div className={`accordion ${isOpen ? "open" : ""}`}>
      <button className="accordion-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="accordion-title">{title}</span>
        <svg
          className="accordion-chevron"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="accordion-content" style={{ height: `${height}px` }}>
        <div ref={contentRef} className="accordion-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Accordion;