import React, { useState } from 'react';
import { SlidersHorizontal, X, Check, Calendar, MapPin, Trophy, Navigation } from 'lucide-react';
import { FilterState } from './HomeClient';
import './FilterWidget.css';

interface FilterWidgetProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export const FilterWidget: React.FC<FilterWidgetProps> = ({ filters, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const months = [
    'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν',
    'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'
  ];

  const distanceRanges = [
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

  const toggleDistance = (id: string) => {
    const newDistances = filters.distanceRange.includes(id)
      ? filters.distanceRange.filter(d => d !== id)
      : [...filters.distanceRange, id];
    onChange({ ...filters, distanceRange: newDistances });
  };

  const toggleMonth = (index: number) => {
    const newMonths = filters.months.includes(index)
      ? filters.months.filter(m => m !== index)
      : [...filters.months, index];
    onChange({ ...filters, months: newMonths });
  };

  const hasActiveFilters = filters.distanceRange.length > 0 ||
    filters.months.length > 0 ||
    filters.type !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.regions.length > 0 ||
    filters.hasGpxOnly ||
    !filters.upcomingOnly;

  return (
    <div className="filter-widget-container">
      <button
        className={`filter-trigger-btn glass-panel ${hasActiveFilters ? 'has-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
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
            <button className="close-panel-btn" onClick={() => setIsOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="panel-content">
            <div className="filter-section">
              <div className="section-header">
                <Calendar size={14} />
                <label>Χρονική Περίοδος</label>
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
              <div className="toggle-row">
                <span>Με Διαδρομή (GPX)</span>
                <button
                  className={`toggle-switch ${filters.hasGpxOnly ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, hasGpxOnly: !filters.hasGpxOnly })}
                >
                  <div className="switch-knob"></div>
                </button>
              </div>
              <div className="filter-options-grid three-cols">
                <button
                  className={`option-btn small ${filters.dateRange === 'all' ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, dateRange: 'all' })}
                >Όλοι</button>
                <button
                  className={`option-btn small ${filters.dateRange === '3months' ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, dateRange: '3months' })}
                >3 Μήνες</button>
                <button
                  className={`option-btn small ${filters.dateRange === '6months' ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, dateRange: '6months' })}
                >6 Μήνες</button>
                <button
                  className={`option-btn small ${filters.dateRange === 'custom' ? 'active' : ''}`}
                  onClick={() => onChange({ ...filters, dateRange: 'custom' })}
                >Εύρος</button>
              </div>

              {filters.dateRange === 'custom' && (
                <div className="custom-date-inputs animation-slide-down">
                  <div className="date-input-group">
                    <span>Από:</span>
                    <input
                      type="date"
                      value={filters.customDateStart || ''}
                      onChange={(e) => onChange({ ...filters, customDateStart: e.target.value })}
                    />
                  </div>
                  <div className="date-input-group">
                    <span>Έως:</span>
                    <input
                      type="date"
                      value={filters.customDateEnd || ''}
                      onChange={(e) => onChange({ ...filters, customDateEnd: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="filter-section">
              <div className="section-header">
                <Navigation size={14} />
                <label>Τύπος Διαδρομής</label>
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
                <MapPin size={14} />
                <label>Περιφέρεια</label>
              </div>
              <div className="filter-options-grid regions-grid">
                {REGIONS.map(region => (
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
                <Calendar size={14} />
                <label>Μήνες Διεξαγωγής</label>
              </div>
              <div className="months-grid">
                {months.map((m, i) => (
                  <button
                    key={m}
                    className={`month-pill ${filters.months.includes(i) ? 'active' : ''}`}
                    onClick={() => toggleMonth(i)}
                  >{m}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="panel-footer">
            <button
              className="clear-all-btn"
              onClick={() => onChange({
                type: 'all',
                distanceRange: [],
                months: [],
                upcomingOnly: true,
                dateRange: 'all',
                regions: [],
                hasGpxOnly: false
              })}
            >
              Επαναφορά
            </button>
            <button className="apply-btn" onClick={() => setIsOpen(false)}>
              Εφαρμογή
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
