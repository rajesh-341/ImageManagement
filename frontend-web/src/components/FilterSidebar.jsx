import React, { useState, useEffect, useRef, useCallback } from "react";
import Accordion from "./Accordion";
import RangeSlider from "./RangeSlider";
import ColorPicker from "./ColorPicker";
import { DECOR_TYPES, EVENT_TYPES, FLOWER_TYPES, SIZE_UNITS } from "../constants";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const fetchSuggestions = async (field, query) => {
  if (!query.trim()) return [];
  try {
    const token = document.cookie.replace(/(?:(?:^|.*;\s*)auth_token\s*=\s*([^;]*).*$)|^.*$/, "$1");
    const params = new URLSearchParams({ field, query });
    const res = await fetch(`${API_BASE_URL}/images/suggestions?${params}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

function FilterSidebar({ onApply, onClear, filters, onFilterChange, onClose, customEventTypes = [], customDecorTypes = [], hiddenEventTypes = [], hiddenDecorTypes = [] }) {
  const [selectedColors, setSelectedColors] = useState(filters?.colors || []);
  const [selectedDecorTypes, setSelectedDecorTypes] = useState(filters?.decorTypes || []);
  const [selectedEventTypes, setSelectedEventTypes] = useState(filters?.eventTypes || []);
  const [selectedFlowerTypes, setSelectedFlowerTypes] = useState(filters?.flowerTypes || []);
  const [priceRange, setPriceRange] = useState(filters?.priceRange || [0, 10000]);
  const [sizeFilters, setSizeFilters] = useState(filters?.sizeFilters || { width: "", length: "", height: "", unit: "sq.ft" });
  const [venueName, setVenueName] = useState(filters?.venueName || "");
  const [folderName, setFolderName] = useState(filters?.folderName || "");
  const [collectedByFilter, setCollectedByFilter] = useState(filters?.collectedBy || "");
  const [decorTypeSearch, setDecorTypeSearch] = useState("");
  const [eventTypeSearch, setEventTypeSearch] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [venueSuggestions, setVenueSuggestions] = useState([]);
  const [folderNameSuggestions, setFolderNameSuggestions] = useState([]);
  const [collectedBySuggestions, setCollectedBySuggestions] = useState([]);
  const [eventTypeSuggestions, setEventTypeSuggestions] = useState([]);
  const [decorTypeSuggestions, setDecorTypeSuggestions] = useState([]);
  const [showSearchSugs, setShowSearchSugs] = useState(false);
  const [showVenueSugs, setShowVenueSugs] = useState(false);
  const [showFolderNameSugs, setShowFolderNameSugs] = useState(false);
  const [showCollectedBySugs, setShowCollectedBySugs] = useState(false);
  const [showEventTypeSugs, setShowEventTypeSugs] = useState(false);
  const [showDecorTypeSugs, setShowDecorTypeSugs] = useState(false);
  const autoApplyTimer = useRef(null);
  const searchSugTimer = useRef(null);
  const venueSugTimer = useRef(null);
  const folderNameSugTimer = useRef(null);
  const collectedBySugTimer = useRef(null);
  const eventTypeSugTimer = useRef(null);
  const decorTypeSugTimer = useRef(null);
  const searchWrapRef = useRef(null);
  const venueWrapRef = useRef(null);
  const folderNameWrapRef = useRef(null);
  const collectedByWrapRef = useRef(null);
  const eventTypeWrapRef = useRef(null);
  const decorTypeWrapRef = useRef(null);

  const AUTO_APPLY_DELAY = 500;
  const SUGGESTION_DELAY = 250;
  const buildAndApplyRef = useRef(null);

  useEffect(() => {
    return () => {
      if (autoApplyTimer.current) clearTimeout(autoApplyTimer.current);
      if (searchSugTimer.current) clearTimeout(searchSugTimer.current);
      if (venueSugTimer.current) clearTimeout(venueSugTimer.current);
      if (folderNameSugTimer.current) clearTimeout(folderNameSugTimer.current);
      if (collectedBySugTimer.current) clearTimeout(collectedBySugTimer.current);
      if (eventTypeSugTimer.current) clearTimeout(eventTypeSugTimer.current);
      if (decorTypeSugTimer.current) clearTimeout(decorTypeSugTimer.current);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) setShowSearchSugs(false);
      if (venueWrapRef.current && !venueWrapRef.current.contains(e.target)) setShowVenueSugs(false);
      if (folderNameWrapRef.current && !folderNameWrapRef.current.contains(e.target)) setShowFolderNameSugs(false);
      if (collectedByWrapRef.current && !collectedByWrapRef.current.contains(e.target)) setShowCollectedBySugs(false);
      if (eventTypeWrapRef.current && !eventTypeWrapRef.current.contains(e.target)) setShowEventTypeSugs(false);
      if (decorTypeWrapRef.current && !decorTypeWrapRef.current.contains(e.target)) setShowDecorTypeSugs(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const buildAndApply = useCallback(() => {
    const allFilters = {
      searchText: filters?.searchText || "",
      designName: filters?.designName || "",
      colors: selectedColors,
      sizes: [],
      sizeFilters,
      decorTypes: selectedDecorTypes,
      priceRange,
      eventTypes: selectedEventTypes,
      flowerTypes: selectedFlowerTypes,
    };
    if (venueName) allFilters.placeOfEvent = venueName;
    if (folderName) allFilters.folderName = folderName;
    if (collectedByFilter) allFilters.collectedBy = collectedByFilter;
    onApply && onApply(allFilters);
  }, [selectedColors, selectedDecorTypes, selectedEventTypes, selectedFlowerTypes, priceRange, sizeFilters, venueName, folderName, collectedByFilter, filters, onApply]);

  buildAndApplyRef.current = buildAndApply;

  const triggerAutoApply = () => {
    if (autoApplyTimer.current) clearTimeout(autoApplyTimer.current);
    autoApplyTimer.current = setTimeout(() => buildAndApplyRef.current(), AUTO_APPLY_DELAY);
  };

  const toggleCheckbox = (value, selected, setSelected) => {
    setSelected((prev) => {
      const next = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      setTimeout(triggerAutoApply, 0);
      return next;
    });
  };

  const handleSearchTextChange = (val) => {
    onFilterChange?.({ ...filters, searchText: val });
    if (searchSugTimer.current) clearTimeout(searchSugTimer.current);
    if (val.trim()) {
      searchSugTimer.current = setTimeout(async () => {
        const results = await fetchSuggestions("designName", val);
        setSearchSuggestions(results);
        setShowSearchSugs(true);
      }, SUGGESTION_DELAY);
    } else {
      setSearchSuggestions([]);
      setShowSearchSugs(false);
    }
  };

  const handleVenueChange = (val) => {
    setVenueName(val);
    triggerAutoApply();
    if (venueSugTimer.current) clearTimeout(venueSugTimer.current);
    if (val.trim()) {
      venueSugTimer.current = setTimeout(async () => {
        const results = await fetchSuggestions("venueName", val);
        setVenueSuggestions(results);
        setShowVenueSugs(true);
      }, SUGGESTION_DELAY);
    } else {
      setVenueSuggestions([]);
      setShowVenueSugs(false);
    }
  };

  const handleFolderNameChange = (val) => {
    setFolderName(val);
    triggerAutoApply();
    if (folderNameSugTimer.current) clearTimeout(folderNameSugTimer.current);
    if (val.trim()) {
      folderNameSugTimer.current = setTimeout(async () => {
        const results = await fetchSuggestions("folderName", val);
        setFolderNameSuggestions(results);
        setShowFolderNameSugs(true);
      }, SUGGESTION_DELAY);
    } else {
      setFolderNameSuggestions([]);
      setShowFolderNameSugs(false);
    }
  };

  const handleCollectedByChange = (val) => {
    setCollectedByFilter(val);
    triggerAutoApply();
    if (collectedBySugTimer.current) clearTimeout(collectedBySugTimer.current);
    if (val.trim()) {
      collectedBySugTimer.current = setTimeout(async () => {
        const results = await fetchSuggestions("collectedBy", val);
        setCollectedBySuggestions(results);
        setShowCollectedBySugs(true);
      }, SUGGESTION_DELAY);
    } else {
      setCollectedBySuggestions([]);
      setShowCollectedBySugs(false);
    }
  };

  const handleEventTypeChange = (val) => {
    setEventTypeSearch(val);
    if (eventTypeSugTimer.current) clearTimeout(eventTypeSugTimer.current);
    if (val.trim()) {
      eventTypeSugTimer.current = setTimeout(async () => {
        const results = await fetchSuggestions("eventType", val);
        setEventTypeSuggestions(results);
        setShowEventTypeSugs(true);
      }, SUGGESTION_DELAY);
    } else {
      setEventTypeSuggestions([]);
      setShowEventTypeSugs(false);
    }
  };

  const handleDecorTypeChange = (val) => {
    setDecorTypeSearch(val);
    if (decorTypeSugTimer.current) clearTimeout(decorTypeSugTimer.current);
    if (val.trim()) {
      decorTypeSugTimer.current = setTimeout(async () => {
        const results = await fetchSuggestions("decorType", val);
        setDecorTypeSuggestions(results);
        setShowDecorTypeSugs(true);
      }, SUGGESTION_DELAY);
    } else {
      setDecorTypeSuggestions([]);
      setShowDecorTypeSugs(false);
    }
  };

  const allEventTypes = [...EVENT_TYPES, ...customEventTypes.filter(t => !EVENT_TYPES.includes(t))].filter(t => !hiddenEventTypes.includes(t));
  const allDecorTypes = [...DECOR_TYPES, ...customDecorTypes.filter(t => !DECOR_TYPES.includes(t))].filter(t => !hiddenDecorTypes.includes(t));

  const filteredDecorTypes = allDecorTypes.filter((type) =>
    type.toLowerCase().includes(decorTypeSearch.toLowerCase())
  );

  const filteredEventTypes = allEventTypes.filter((type) =>
    type.toLowerCase().includes(eventTypeSearch.toLowerCase())
  );

  const buildSizeDisplay = () => {
    const parts = [];
    if (sizeFilters.width) parts.push(`${sizeFilters.width} W`);
    if (sizeFilters.length) parts.push(`${sizeFilters.length} L`);
    if (sizeFilters.height) parts.push(`${sizeFilters.height} H`);
    if (parts.length === 0) return "";
    return parts.join(" x ") + (sizeFilters.unit ? ` ${sizeFilters.unit}` : "");
  };

  const handleApply = () => {
    if (autoApplyTimer.current) clearTimeout(autoApplyTimer.current);
    buildAndApply();
  };

  const handleClear = () => {
    if (autoApplyTimer.current) clearTimeout(autoApplyTimer.current);
    setSelectedColors([]);
    setSelectedDecorTypes([]);
    setSelectedEventTypes([]);
    setSelectedFlowerTypes([]);
    setPriceRange([0, 10000]);
    setSizeFilters({ width: "", length: "", height: "", unit: "sq.ft" });
    setVenueName("");
    setFolderName("");
    setCollectedByFilter("");
    setDecorTypeSearch("");
    setEventTypeSearch("");
    setSearchSuggestions([]);
    setVenueSuggestions([]);
    setFolderNameSuggestions([]);
    setCollectedBySuggestions([]);
    setEventTypeSuggestions([]);
    setDecorTypeSuggestions([]);
    setShowFolderNameSugs(false);
    setShowCollectedBySugs(false);
    setShowEventTypeSugs(false);
    setShowDecorTypeSugs(false);
    onClear && onClear();
  };

  return (
    <div className="filter-sidebar">
      <div className="filter-sidebar-header">
        <h2>Filters</h2>
        <button className="filter-close-btn" onClick={onClose}>×</button>
      </div>

      <div className="filter-sidebar-content">
        <Accordion title="Search & Design Name" defaultOpen={true}>
          <div className="filter-section" ref={searchWrapRef}>
            <div className="search-input-wrapper filter-suggest-wrap">
              <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                className="filter-search-input"
                placeholder="Search for design, vendor..."
                value={filters?.searchText || ""}
                onChange={(e) => handleSearchTextChange(e.target.value)}
                onFocus={() => { if (searchSuggestions.length > 0) setShowSearchSugs(true); }}
              />
              {showSearchSugs && searchSuggestions.length > 0 && (
                <ul className="filter-suggestions-list">
                  {searchSuggestions.map((s, i) => (
                    <li key={i} className="filter-suggestion-item"
                      onMouseDown={() => { onFilterChange?.({ ...filters, searchText: s, designName: s }); setShowSearchSugs(false); setSearchSuggestions([]); }}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Accordion>

        <Accordion title="Venue">
          <div className="filter-section" ref={venueWrapRef}>
            <div className="filter-suggest-wrap">
              <input
                type="text"
                className="filter-input"
                placeholder="Search venue..."
                value={venueName}
                onChange={(e) => handleVenueChange(e.target.value)}
                onFocus={() => { if (venueSuggestions.length > 0) setShowVenueSugs(true); }}
              />
              {showVenueSugs && venueSuggestions.length > 0 && (
                <ul className="filter-suggestions-list">
                  {venueSuggestions.map((s, i) => (
                    <li key={i} className="filter-suggestion-item"
                      onMouseDown={() => { setVenueName(s); setShowVenueSugs(false); setVenueSuggestions([]); triggerAutoApply(); }}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Accordion>

        <Accordion title="Folder Name">
          <div className="filter-section" ref={folderNameWrapRef}>
            <div className="filter-suggest-wrap">
              <input
                type="text"
                className="filter-input"
                placeholder="Search folder name..."
                value={folderName}
                onChange={(e) => handleFolderNameChange(e.target.value)}
                onFocus={() => { if (folderNameSuggestions.length > 0) setShowFolderNameSugs(true); }}
              />
              {showFolderNameSugs && folderNameSuggestions.length > 0 && (
                <ul className="filter-suggestions-list">
                  {folderNameSuggestions.map((s, i) => (
                    <li key={i} className="filter-suggestion-item"
                      onMouseDown={() => { setFolderName(s); setShowFolderNameSugs(false); setFolderNameSuggestions([]); triggerAutoApply(); }}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Accordion>

        <Accordion title="Collected By">
          <div className="filter-section" ref={collectedByWrapRef}>
            <div className="filter-suggest-wrap">
              <input
                type="text"
                className="filter-input"
                placeholder="Search collected by..."
                value={collectedByFilter}
                onChange={(e) => handleCollectedByChange(e.target.value)}
                onFocus={() => { if (collectedBySuggestions.length > 0) setShowCollectedBySugs(true); }}
              />
              {showCollectedBySugs && collectedBySuggestions.length > 0 && (
                <ul className="filter-suggestions-list">
                  {collectedBySuggestions.map((s, i) => (
                    <li key={i} className="filter-suggestion-item"
                      onMouseDown={() => { setCollectedByFilter(s); setShowCollectedBySugs(false); setCollectedBySuggestions([]); triggerAutoApply(); }}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Accordion>

        <Accordion title="Event Type">
          <div className="filter-section" ref={eventTypeWrapRef}>
            <div className="filter-suggest-wrap">
              <input
                type="text"
                className="filter-input"
                placeholder="Search event type..."
                value={eventTypeSearch}
                onChange={(e) => handleEventTypeChange(e.target.value)}
                onFocus={() => { if (eventTypeSuggestions.length > 0) setShowEventTypeSugs(true); }}
              />
              {showEventTypeSugs && eventTypeSuggestions.length > 0 && (
                <ul className="filter-suggestions-list">
                  {eventTypeSuggestions.map((s, i) => (
                    <li key={i} className="filter-suggestion-item"
                      onMouseDown={() => { setEventTypeSearch(s); setShowEventTypeSugs(false); setEventTypeSuggestions([]); }}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="decor-type-list">
              {filteredEventTypes.map((type) => (
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
          <div className="filter-section" ref={decorTypeWrapRef}>
            <div className="filter-suggest-wrap">
              <input
                type="text"
                className="filter-input"
                placeholder="Search decoration type..."
                value={decorTypeSearch}
                onChange={(e) => handleDecorTypeChange(e.target.value)}
                onFocus={() => { if (decorTypeSuggestions.length > 0) setShowDecorTypeSugs(true); }}
              />
              {showDecorTypeSugs && decorTypeSuggestions.length > 0 && (
                <ul className="filter-suggestions-list">
                  {decorTypeSuggestions.map((s, i) => (
                    <li key={i} className="filter-suggestion-item"
                      onMouseDown={() => { setDecorTypeSearch(s); setShowDecorTypeSugs(false); setDecorTypeSuggestions([]); }}>
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="decor-type-list">
              {filteredDecorTypes.map((type) => (
                <label key={type} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedDecorTypes.includes(type)}
                    onChange={() => toggleCheckbox(type, selectedDecorTypes, setSelectedDecorTypes)}
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
              onChange={(val) => { setPriceRange(val); triggerAutoApply(); }}
            />
          </div>
        </Accordion>

        <Accordion title="Size">
          <div className="filter-section">
            <div className="size-input-group">
              <div className="size-input-row">
                <input type="number" className="filter-input size-input" placeholder="Width" value={sizeFilters.width} min="0"
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => { setSizeFilters({ ...sizeFilters, width: e.target.value }); triggerAutoApply(); }} />
                <span className="size-label">x</span>
                <input type="number" className="filter-input size-input" placeholder="Length" value={sizeFilters.length} min="0"
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => { setSizeFilters({ ...sizeFilters, length: e.target.value }); triggerAutoApply(); }} />
                <span className="size-label">x</span>
                <input type="number" className="filter-input size-input" placeholder="Height" value={sizeFilters.height} min="0"
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) => { setSizeFilters({ ...sizeFilters, height: e.target.value }); triggerAutoApply(); }} />
              </div>
              <select className="filter-select size-unit-select" value={sizeFilters.unit}
                onChange={(e) => { setSizeFilters({ ...sizeFilters, unit: e.target.value }); triggerAutoApply(); }}>
                {SIZE_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
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
              onChange={(colors) => { setSelectedColors(colors); triggerAutoApply(); }}
            />
          </div>
        </Accordion>

        <Accordion title="Flower Type">
          <div className="filter-section">
            <div className="checkbox-list">
              {FLOWER_TYPES.map((type) => (
                <label key={type} className="checkbox-item">
                  <input type="checkbox" checked={selectedFlowerTypes.includes(type)}
                    onChange={() => toggleCheckbox(type, selectedFlowerTypes, setSelectedFlowerTypes)} />
                  <span className="checkbox-label">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </Accordion>
      </div>

      <div className="filter-sidebar-footer">
        <button className="btn-apply-filters" onClick={handleApply}>Apply Filters</button>
        <button className="btn-clear-all" onClick={handleClear}>Clear All</button>
      </div>
    </div>
  );
}

export default FilterSidebar;
export { DECOR_TYPES };