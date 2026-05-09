import React, { useState, useEffect, useRef } from "react";

function RangeSlider({ min = 0, max = 10000, step = 50, value = [0, 10000], onChange }) {
  const [localValue, setLocalValue] = useState(value);
  const rangeRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleMinChange = (e) => {
    const newMin = Math.min(Number(e.target.value), localValue[1] - step);
    const newValue = [newMin, localValue[1]];
    setLocalValue(newValue);
    onChange && onChange(newValue);
  };

  const handleMaxChange = (e) => {
    const newMax = Math.max(Number(e.target.value), localValue[0] + step);
    const newValue = [localValue[0], newMax];
    setLocalValue(newValue);
    onChange && onChange(newValue);
  };

  const getPercent = (value) => ((value - min) / (max - min)) * 100;

  const minPercent = getPercent(localValue[0]);
  const maxPercent = getPercent(localValue[1]);

  const formatPrice = (val) => {
    if (val >= max) return `$${max.toLocaleString()}+`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="range-slider">
      <div className="range-slider-track">
        <div
          className="range-slider-range"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`
          }}
        />
      </div>
      <div className="range-slider-inputs">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={handleMinChange}
          className="range-slider-thumb range-slider-thumb-min"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="range-slider-thumb range-slider-thumb-max"
        />
      </div>
      <div className="range-slider-labels">
        <span>$0</span>
        <span>$10,000+</span>
      </div>
      <div className="range-slider-value">
        {formatPrice(localValue[0])} — {formatPrice(localValue[1])}
      </div>
    </div>
  );
}

export default RangeSlider;