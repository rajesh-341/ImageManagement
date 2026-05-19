import React, { useState } from "react";
import Accordion from "./Accordion";
import RangeSlider from "./RangeSlider";
import ColorPicker from "./ColorPicker";
import { DECOR_TYPES, EVENT_TYPES, FLOWER_TYPES, SIZE_UNITS } from "../constants";

function FilterSidebar({ onApply, onClear, filters, onFilterChange, onClose }) {
  const [selectedColors, setSelectedColors] = useState(filters?.colors || []);
  const [selectedSizes, setSelectedSizes] = useState(filters?.sizes || []);
  const [selectedDecorTypes, setSelectedDecorTypes] = useState(filters?.decorTypes || []);
  const [selectedEventTimes, setSelectedEventTimes] = useState(filters?.eventTimes || []);
  const [selectedEventTypes, setSelectedEventTypes] = useState(filters?.eventTypes || []);
  const [selectedFlowerTypes, setSelectedFlowerTypes] = useState(filters?.flowerTypes || []);
  const [priceRange, setPriceRange] = useState(filters?.priceRange || [0, 10000]);
  const [sizeFilters, setSizeFilters] = useState(filters?.sizeFilters || { width: "", length: "", height: "", unit: "sq.ft" });
  const [venueCustomer, setVenueCustomer] = useState(filters?.venueCustomer || "");
  const [venueName, setVenueName] = useState(filters?.venueName || "");
  const [venueDate, setVenueDate] = useState(filters?.venueDate || "");
  const [decorTypeSearch, setDecorTypeSearch] = useState("");

  const toggleCheckbox = (value, selected, setSelected) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleDecorType = (type) => {
    setSelectedDecorTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleApply = () => {
    const allFilters = {
      searchText: filters?.searchText || "",
      designName: filters?.designName || "",
      colors: selectedColors,
      venueCustomer,
      venueName,
      venueDate,
      sizes: selectedSizes,
      sizeFilters,
      decorTypes: selectedDecorTypes,
      priceRange,
      eventTimes: selectedEventTimes,
      eventTypes: selectedEventTypes,
      flowerTypes: selectedFlowerTypes,
    };
    onApply && onApply(allFilters);
  };

  const handleClear = () => {
    setSelectedColors([]);
    setSelectedSizes([]);
    setSelectedDecorTypes([]);
    setSelectedEventTimes([]);
    setSelectedEventTypes([]);
    setSelectedFlowerTypes([]);
    setPriceRange([0, 10000]);
    setSizeFilters({ width: "", length: "", height: "", unit: "sq.ft" });
    setVenueCustomer("");
    setVenueName("");
    setVenueDate("");
    setDecorTypeSearch("");
    onClear && onClear();
  };

  const filteredDecorTypes = DECOR_TYPES.filter((type) =>
    type.toLowerCase().includes(decorTypeSearch.toLowerCase())
  );

  const buildSizeDisplay = () => {
    const w = sizeFilters.width;
    const l = sizeFilters.length;
    const h = sizeFilters.height;
    const u = sizeFilters.unit;
    const parts = [];
    if (w) parts.push(w);
    if (l) parts.push(l);
    if (h) parts.push(h);
    if (parts.length === 0) return "";
    return parts.join("x") + (u ? ` ${u}` : "");
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-sidebar-header">
        <h2>Filters</h2>
        <button className="filter-close-btn" onClick={onClose}>×</button>
      </div>

      <div className="filter-sidebar-content">
        <Accordion title="Search & Design Name" defaultOpen={true}>
          <div className="filter-section">
            <div className="search-input-wrapper">
              <svg
                className="search-icon"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="filter-search-input"
                placeholder="Search for design, vendor..."
                value={filters?.searchText || ""}
                onChange={(e) => onFilterChange?.({ ...filters, searchText: e.target.value })}
              />
            </div>
          </div>
        </Accordion>

        <Accordion title="Event Type">
          <div className="filter-section">
            <div className="checkbox-list">
              {EVENT_TYPES.map((type) => (
                <label key={type} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedEventTypes.includes(type)}
                    onChange={() => toggleCheckbox(type, selectedEventTypes, setSelectedEventTypes)}
                  />
                  <span className="checkbox-label">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </Accordion>

        <Accordion title="Decoration Type">
          <div className="filter-section">
            <input
              type="text"
              className="filter-input"
              placeholder="Search decoration type..."
              value={decorTypeSearch}
              onChange={(e) => setDecorTypeSearch(e.target.value)}
            />
            <div className="decor-type-list">
              {filteredDecorTypes.map((type) => (
                <label key={type} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDecorTypes.includes(type)}
                    onChange={() => toggleDecorType(type)}
                  />
                  <span className="checkbox-label">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </Accordion>

        <Accordion title="Venue">
          <div className="filter-section">
            <div className="venue-input-group">
              <input
                type="text"
                className="venue-input"
                placeholder="Customer Name (max 15)"
                maxLength={15}
                value={venueCustomer}
                onChange={(e) => setVenueCustomer(e.target.value.slice(0, 15))}
              />
              <input
                type="text"
                className="venue-input"
                placeholder="Venue (max 12)"
                maxLength={12}
                value={venueName}
                onChange={(e) => setVenueName(e.target.value.slice(0, 12))}
              />
              <input
                type="date"
                className="venue-input venue-date"
                value={venueDate}
                onChange={(e) => setVenueDate(e.target.value)}
              />
            </div>
            <p className="venue-filter-hint">Filter by any one or more fields</p>
          </div>
        </Accordion>

        <Accordion title="Size">
          <div className="filter-section">
            <div className="size-input-group">
              <div className="size-input-row">
                <input
                  type="number"
                  className="filter-input size-input"
                  placeholder="Width"
                  value={sizeFilters.width}
                  min="0"
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => setSizeFilters({ ...sizeFilters, width: e.target.value })}
                />
                <span className="size-label">x</span>
                <input
                  type="number"
                  className="filter-input size-input"
                  placeholder="Length"
                  value={sizeFilters.length}
                  min="0"
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => setSizeFilters({ ...sizeFilters, length: e.target.value })}
                />
                <span className="size-label">x</span>
                <input
                  type="number"
                  className="filter-input size-input"
                  placeholder="Height"
                  value={sizeFilters.height}
                  min="0"
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => setSizeFilters({ ...sizeFilters, height: e.target.value })}
                />
              </div>
              <select
                className="filter-select size-unit-select"
                value={sizeFilters.unit}
                onChange={(e) => setSizeFilters({ ...sizeFilters, unit: e.target.value })}
              >
                {SIZE_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            {buildSizeDisplay() && (
              <div className="size-display-preview">
                <span className="size-preview-label">Size: </span>
                <span className="size-preview-value">{buildSizeDisplay()}</span>
              </div>
            )}
          </div>
        </Accordion>

        <Accordion title="Colour">
          <div className="filter-section">
            <ColorPicker
              selectedColors={selectedColors}
              onChange={setSelectedColors}
            />
          </div>
        </Accordion>

        <Accordion title="Flower Type">
          <div className="filter-section">
            <div className="checkbox-list">
              {FLOWER_TYPES.map((type) => (
                <label key={type} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedFlowerTypes.includes(type)}
                    onChange={() => toggleCheckbox(type, selectedFlowerTypes, setSelectedFlowerTypes)}
                  />
                  <span className="checkbox-label">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </Accordion>

        <Accordion title="Price Range">
          <div className="filter-section">
            <RangeSlider
              min={0}
              max={10000}
              step={50}
              value={priceRange}
              onChange={setPriceRange}
            />
          </div>
        </Accordion>
      </div>

      <div className="filter-sidebar-footer">
        <button className="btn-apply-filters" onClick={handleApply}>
          Apply Filters
        </button>
        <button className="btn-clear-all" onClick={handleClear}>
          Clear All
        </button>
      </div>
    </div>
  );
}

export default FilterSidebar;
export { DECOR_TYPES };
