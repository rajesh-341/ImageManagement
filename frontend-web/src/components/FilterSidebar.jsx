import React, { useState } from "react";
import Accordion from "./Accordion";
import RangeSlider from "./RangeSlider";
import ColorPicker, { COLORS } from "./ColorPicker";

const DECOR_TYPES = [
  "Name board",
  "Stage Ceiling",
  "Hall side Decoration",
  "Hall ceiling work",
  "Hall Entrance",
  "Receiption Area",
  "Pathway",
  "Main Entrance",
  "Orchestra Stage",
  "Car Decoration",
  "Selfie Area",
  "Bedroom Decoration",
  "Home Decoration",
  "Lighting work in Home",
  "Lighting work in Mahal",
  "Audio work",
];

const VENUES = ["Indoor", "Outdoor", "Ballroom", "Garden", "Historic", "Industrial"];
const SIZES = ["Small (1–50)", "Medium (51–200)", "Large (200+)", "Extra Large (500+)"];
const EVENT_TIMES = ["Morning", "Afternoon", "Evening/Night"];
const EVENT_TYPES = ["Wedding", "Corporate", "Birthday", "Gala", "Conference", "Social"];
const FLOWER_TYPES = ["Natural", "Artificial", "Both"];
const SIZE_UNITS = ["sq.ft", "feet", "inch", "cm", "m"];

function FilterSidebar({ onApply, onClear, filters, onFilterChange }) {
  const [selectedColors, setSelectedColors] = useState(filters?.colors || []);
  const [selectedVenues, setSelectedVenues] = useState(filters?.venues || []);
  const [selectedSizes, setSelectedSizes] = useState(filters?.sizes || []);
  const [selectedDecorTypes, setSelectedDecorTypes] = useState(filters?.decorTypes || []);
  const [selectedEventTimes, setSelectedEventTimes] = useState(filters?.eventTimes || []);
  const [selectedEventTypes, setSelectedEventTypes] = useState(filters?.eventTypes || []);
  const [selectedFlowerTypes, setSelectedFlowerTypes] = useState(filters?.flowerTypes || []);
  const [priceRange, setPriceRange] = useState(filters?.priceRange || [0, 10000]);
  const [sizeFilters, setSizeFilters] = useState(filters?.sizeFilters || { width: "", length: "", height: "", unit: "sq.ft" });
  const [venueFilter, setVenueFilter] = useState(filters?.venueFilter || "");
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
      venues: selectedVenues,
      venueFilter,
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
    setSelectedVenues([]);
    setSelectedSizes([]);
    setSelectedDecorTypes([]);
    setSelectedEventTimes([]);
    setSelectedEventTypes([]);
    setSelectedFlowerTypes([]);
    setPriceRange([0, 10000]);
    setSizeFilters({ width: "", length: "", height: "", unit: "sq.ft" });
    setVenueFilter("");
    setDecorTypeSearch("");
    onClear && onClear();
  };

  const filteredDecorTypes = DECOR_TYPES.filter((type) =>
    type.toLowerCase().includes(decorTypeSearch.toLowerCase())
  );

  return (
    <div className="filter-sidebar">
      <div className="filter-sidebar-header">
        <h2>Filters</h2>
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
            <div className="filter-select-wrapper">
              <select
                className="filter-select"
                value={filters?.designName || ""}
                onChange={(e) => onFilterChange?.({ ...filters, designName: e.target.value })}
              >
                <option value="">Select Design</option>
              </select>
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
                value={venueFilter.split("_")[0] || ""}
                onChange={(e) => {
                  const parts = venueFilter.split("_");
                  setVenueFilter(`${e.target.value.slice(0, 15)}_${parts[1] || ""}_${parts[2] || ""}`);
                }}
              />
              <input
                type="text"
                className="venue-input"
                placeholder="Venue (max 12)"
                maxLength={12}
                value={venueFilter.split("_")[1] || ""}
                onChange={(e) => {
                  const parts = venueFilter.split("_");
                  setVenueFilter(`${parts[0] || ""}_${e.target.value.slice(0, 12)}_${parts[2] || ""}`);
                }}
              />
              <input
                type="date"
                className="venue-input venue-date"
                value={venueFilter.split("_")[2] || ""}
                onChange={(e) => {
                  const parts = venueFilter.split("_");
                  setVenueFilter(`${parts[0] || ""}_${parts[1] || ""}_${e.target.value}`);
                }}
              />
            </div>
            <div className="checkbox-list" style={{ marginTop: "12px" }}>
              {VENUES.map((venue) => (
                <label key={venue} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedVenues.includes(venue)}
                    onChange={() => toggleCheckbox(venue, selectedVenues, setSelectedVenues)}
                  />
                  <span className="checkbox-label">{venue}</span>
                </label>
              ))}
            </div>
          </div>
        </Accordion>

        <Accordion title="Size (Capacity)">
          <div className="filter-section">
            <div className="checkbox-list">
              {SIZES.map((size) => (
                <label key={size} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size)}
                    onChange={() => toggleCheckbox(size, selectedSizes, setSelectedSizes)}
                  />
                  <span className="checkbox-label">{size}</span>
                </label>
              ))}
            </div>
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

        <Accordion title="Event Time">
          <div className="filter-section">
            <div className="checkbox-list">
              {EVENT_TIMES.map((time) => (
                <label key={time} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedEventTimes.includes(time)}
                    onChange={() => toggleCheckbox(time, selectedEventTimes, setSelectedEventTimes)}
                  />
                  <span className="checkbox-label">{time}</span>
                </label>
              ))}
            </div>
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