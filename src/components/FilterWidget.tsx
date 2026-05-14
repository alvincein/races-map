import React, { useState } from 'react';
import { SlidersHorizontal, X, Calendar, MapPin, Trophy, Navigation, Bookmark } from 'lucide-react';
import { FilterState, DEFAULT_FILTERS, DistanceBucket } from '../types/filters';
import './FilterWidget.css';
import { RangeCalendar } from './Calendar/RangeCalendar';

interface FilterWidgetProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export const FilterWidget: React.FC<FilterWidgetProps> = ({ filters, onChange, isOpen, onToggle }) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showAllRegions, setShowAllRegions] = useState(false);



  const distanceRanges: { id: DistanceBucket; label: string }[] = [
    { id: '5k', label: '5χλμ - 10χλμ' },
    { id: '10k', label: '10χλμ - 20χλμ' },
    { id: '21k', label: 'Ημιμαραθώνιος' },
    { id: '42k', label: 'Μαραθώνιος' },
    { id: 'ultra', label: 'Ultra' },
  ];

  const REGIONS = [
    { id: 'Attiki', label: 'Αττική' },
    { id: 'Kentriki Makedonia', label: 'Κεντρική Μακεδονία' },
    { id: 'Thessalia', label: 'Θεσσαλία' },
    { id: 'Dytiki Ellada', label: 'Δυτική Ελλάδα' },
    { id: 'Peloponnisos', label: 'Πελοπόννησος' },
    { id: 'Kriti', label: 'Κρήτη' },
    { id: 'Anatoliki Makedonia kai Thraki', label: 'Αν. Μακεδονία & Θράκη' },
    { id: 'Ipeiros', label: 'Ήπειρος' },
    { id: 'Sterea Ellada', label: 'Στερεά Ελλάδα' },
    { id: 'Notio Aigaio', label: 'Νότιο Αιγαίο' },
    { id: 'Dytiki Makedonia', label: 'Δυτική Μακεδονία' },
    { id: 'Ionia Nisia', label: 'Ιόνια Νησιά' },
    { id: 'Voreio Aigaio', label: 'Βόρειο Αιγαίο' },
  ];

  const sortedRegions = React.useMemo(() => {
    return [...REGIONS].sort((a, b) => {
      const aSelected = filters.regions.includes(a.id);
      const bSelected = filters.regions.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [filters.regions]);

  const visibleRegions = showAllRegions
    ? sortedRegions
    : sortedRegions.filter((r, idx) => idx < 4 || filters.regions.includes(r.id));

  const toggleDistance = (id: DistanceBucket) => {
    const newDistances = filters.distanceRange.includes(id)
      ? filters.distanceRange.filter(d => d !== id)
      : [...filters.distanceRange, id];
    onChange({ ...filters, distanceRange: newDistances });
  };



  const hasActiveFilters = filters.distanceRange.length > 0 ||
    filters.type !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.regions.length > 0 ||
    filters.hasGpxOnly ||
    filters.favoritesOnly ||
    !filters.upcomingOnly;

  return (
    <div className="filter-widget-container">
      <button
        className={`filter-trigger-btn glass-panel ${hasActiveFilters ? 'has-active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(!isOpen);
        }}
        title="Φίλτρα Αναζήτησης"
      >
        <SlidersHorizontal size={20} />
        {hasActiveFilters && <span className="filter-badge"></span>}
        <span className="btn-label">Φίλτρα</span>
      </button>

      {isOpen && (
        <div className="filter-dropdown-panel glass-panel animation-slide-up">
          <div className="panel-header">
            <h3>Φίλτρα Αγώνων</h3>
            <button className="close-panel-btn" onClick={() => onToggle(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="panel-content">
            <div className="filter-section">
              <div className="section-header">
                <Bookmark size={14} />
                <label>Προτιμήσεις</label>
              </div>
              <div className="toggle-row">
                <span>Με Διαδρομή (GPX)</span>
                <button
                  className={`toggle-switch ${filters.hasGpxOnly ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, hasGpxOnly: !filters.hasGpxOnly })}
                >
                  <div className="switch-knob"></div>
                </button>
              </div>
              <div className="toggle-row">
                <span>Αγαπημένα</span>
                <button
                  className={`toggle-switch ${filters.favoritesOnly ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
                >
                  <div className="switch-knob"></div>
                </button>
              </div>
            </div>

            <div className="filter-section">
              <div className="section-header">
                <Calendar size={14} />
                <label>Χρονικη Περιοδος</label>
              </div>
              <div className="toggle-row">
                <span>Μόνο Μελλοντικοί</span>
                <button
                  className={`toggle-switch ${filters.upcomingOnly ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, upcomingOnly: !filters.upcomingOnly })}
                >
                  <div className="switch-knob"></div>
                </button>
              </div>
              
              <div className="filter-sub-label">Συγκεκριμένο Διάστημα</div>
              <div className={`airbnb-date-container ${isCalendarOpen ? 'active' : ''}`} onClick={() => setIsCalendarOpen(!isCalendarOpen)}>
                  <div className="date-field">
                    <label>ΑΠΟ</label>
                    <div className="date-display-val">
                      {filters.customDateStart ? new Date(filters.customDateStart).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Επιλογή'}
                    </div>
                  </div>
                  <div className="date-divider"></div>
                  <div className="date-field">
                    <label>ΕΩΣ</label>
                    <div className="date-display-val">
                      {filters.customDateEnd ? new Date(filters.customDateEnd).toLocaleDateString('el-GR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Επιλογή'}
                    </div>
                  </div>
              </div>

              {isCalendarOpen && (
                <div className="calendar-popover animation-slide-down">
                  <RangeCalendar
                    startDate={filters.customDateStart || null}
                    endDate={filters.customDateEnd || null}
                    onChange={(start, end) => {
                      onChange({ ...filters, customDateStart: start, customDateEnd: end, dateRange: 'custom' });
                      if (start && end) setIsCalendarOpen(false);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="filter-section">
              <div className="section-header">
                <Navigation size={14} />
                <label>Τυπος Διαδρομης</label>
              </div>
              <div className="filter-options-grid three-cols">
                <button
                  className={`option-btn ${filters.type === 'all' ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, type: 'all' })}
                >Όλοι</button>
                <button
                  className={`option-btn ${filters.type === 'road' ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, type: 'road' })}
                >Δρόμος</button>
                <button
                  className={`option-btn ${filters.type === 'trail' ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, type: 'trail' })}
                >Βουνό</button>
              </div>
            </div>

            <div className="filter-section">
              <div className="section-header">
                <Trophy size={14} />
                <label>Αποστάσεις</label>
              </div>
              <div className="filter-options-grid">
                {distanceRanges.map(range => (
                  <button
                    key={range.id}
                    className={`option-btn small ${filters.distanceRange.includes(range.id) ? 'active' : ''}`}
                    onClick={() => toggleDistance(range.id)}
                  >{range.label}</button>
                ))}
              </div>
            </div>

            <div className="filter-section">
              <div className="section-header">
                <MapPin size={14} />
                <label>Περιφερεια</label>
              </div>
              <div className="filter-options-grid regions-grid">
                {visibleRegions.map(region => (
                  <button
                    key={region.id}
                    className={`option-btn small ${filters.regions.includes(region.id) ? 'active' : ''}`}
                    onClick={() => {
                      const newRegions = filters.regions.includes(region.id)
                        ? filters.regions.filter(r => r !== region.id)
                        : [...filters.regions, region.id];
                      onChange({ ...filters, regions: newRegions });
                    }}
                  >{region.label}</button>
                ))}
              </div>
              {REGIONS.length > 4 && (
                <button 
                  className="show-more-btn" 
                  onClick={() => setShowAllRegions(!showAllRegions)}
                >
                  {showAllRegions ? 'Λιγότερα' : `Περισσότερα (${REGIONS.length - 4})`}
                </button>
              )}
            </div>


          </div>

          <div className="panel-footer">
            <button
              className="clear-all-btn"
              onClick={() => onChange(DEFAULT_FILTERS)}
            >
              Επαναφορά
            </button>
            <button className="apply-btn" onClick={() => onToggle(false)}>
              Εφαρμογή
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
