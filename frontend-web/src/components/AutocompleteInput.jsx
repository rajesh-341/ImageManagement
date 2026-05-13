import React, { useState, useRef, useEffect } from "react";

function AutocompleteInput({ options = [], value, onChange, placeholder = "", required = false, className = "" }) {
  const [input, setInput] = useState(value || "");
  const [show, setShow] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);

  const filtered = input.trim()
    ? options.filter((o) => o.toLowerCase().includes(input.toLowerCase()))
    : options;

  useEffect(() => {
    setInput(value || "");
  }, [value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = (option) => {
    setInput(option);
    onChange(option);
    setShow(false);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e) => {
    if (!show) {
      if (e.key === "ArrowDown") { setShow(true); setActiveIdx(0); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((prev) => (prev < filtered.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
      default:
        e.preventDefault();
        if (activeIdx >= 0 && filtered[activeIdx]) {
          select(filtered[activeIdx]);
        }
        break;
      case "Escape":
        setShow(false);
        setActiveIdx(-1);
        break;
    }
  };

  return (
    <div className="autocomplete-wrap" ref={ref}>
      <input
        type="text"
        className={`input ${className}`}
        value={input}
        onChange={(e) => { setInput(e.target.value); setShow(true); setActiveIdx(-1); onChange(e.target.value); }}
        onFocus={() => setShow(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
      />
      {show && filtered.length > 0 && (
        <ul className="autocomplete-list" ref={listRef}>
          {filtered.map((option, idx) => (
            <li
              key={option}
              className={`autocomplete-item ${idx === activeIdx ? "active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); select(option); }}
              onMouseEnter={() => setActiveIdx(idx)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AutocompleteInput;
