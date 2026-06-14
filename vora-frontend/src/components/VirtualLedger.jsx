import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronUp, ChevronDown, MoreHorizontal, AlertCircle, Sparkles } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

/**
 * High-performance Virtualized Ledger conforming to the "5/10 Awwwards" standard.
 * Features:
 *  - Virtualized DOM rendering using viewport-scrollTop math + overscan buffers.
 *  - Sticky soft-glass column headers with inline sorting states.
 *  - Custom CSS grid alignment across cells.
 *  - Group hover action reveals with absolutely positioned custom context menus.
 *  - Draconian responsive card collapse on mobile viewports.
 *  - Shimmering loading skeletons and elegant empty states.
 */
export default function VirtualLedger({
  data = [],
  columns = [],
  rowHeight = 52,
  isLoading = false,
  enableSelection = false,
  selectedIds = [],
  onToggleRowSelection = () => {},
  onToggleAllSelection = () => {},
  getRowActions = () => [],
  emptyStateTitle = "No records found",
  emptyStateDescription = "Adjust your filters or try a different search query."
}) {
  const containerRef = useRef(null);
  
  // Virtualization calculations state
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(500);

  // Sorting configurations
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Context Menu state
  const [activeMenu, setActiveMenu] = useState(null); // { rowId, x, y, actions }
  const menuRef = useRef(null);

  // Track size changes dynamically
  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight || 500);
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setContainerHeight(entry.contentRect.height || 500);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Handle outside clicks to close the context menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    }
    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenu]);

  // Handle scroll events
  const handleScroll = (e) => {
    setScrollTop(e.currentTarget.scrollTop);
    if (activeMenu) {
      setActiveMenu(null); // Close active dropdowns on scroll to prevent detached menus
    }
  };

  // Sort logic mapping
  const handleSort = (column) => {
    if (!column.sortable) return;
    let direction = 'asc';
    if (sortConfig.key === column.key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: column.key, direction });
  };

  // Sort data array based on current configuration
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const column = columns.find(col => col.key === sortConfig.key);
    const selector = column?.sortSelector || ((row) => row[sortConfig.key]);

    return [...data].sort((a, b) => {
      const valA = selector(a);
      const valB = selector(b);

      if (valA === valB) return 0;
      if (valA == null || valA === '') return 1;
      if (valB == null || valB === '') return -1;

      // Handle numerical vs alphanumeric sorting
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      const compare = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? compare : -compare;
    });
  }, [data, sortConfig, columns]);

  // Math for viewport index boundaries
  const overscan = 8;
  const headerHeight = 48; // fixed sticky header height

  const startIndex = Math.max(
    0, 
    Math.floor(scrollTop / rowHeight) - overscan
  );
  
  const endIndex = Math.min(
    sortedData.length - 1,
    Math.floor((scrollTop + containerHeight) / rowHeight) + overscan
  );

  // Slices items strictly rendering viewport contents
  const visibleRows = useMemo(() => {
    if (sortedData.length === 0) return [];
    return sortedData.slice(startIndex, endIndex + 1).map((item, idx) => ({
      item,
      originalIdx: startIndex + idx
    }));
  }, [sortedData, startIndex, endIndex]);

  const phantomHeight = sortedData.length * rowHeight;

  // Grid Template layout configuration
  const gridTemplate = useMemo(() => {
    const widths = columns.map(col => col.width || '1fr');
    if (enableSelection) {
      widths.unshift('44px'); // checkbox width allocation
    }
    widths.push('64px'); // actions trigger column
    return widths.join(' ');
  }, [columns, enableSelection]);

  const handleMenuTrigger = (e, rowId, actions) => {
    e.stopPropagation();
    if (activeMenu?.rowId === rowId) {
      setActiveMenu(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = containerRef.current.getBoundingClientRect();
    
    // Position menu relative to the scrolling viewport container boundaries
    const top = rect.top - parentRect.top + containerRef.current.scrollTop + rect.height + 4;
    const right = parentRect.right - rect.right;

    setActiveMenu({
      rowId,
      top,
      right,
      actions
    });
  };

  return (
    <div className="relative flex flex-col h-full min-h-0 w-full select-none">
      
      {/* Dynamic CSS Grid configurations for ledger rows */}
      <style>{`
        .ledger-grid-row {
          display: grid;
          grid-template-columns: ${gridTemplate};
          align-items: center;
        }
      `}</style>

      {/* DESKTOP VIEWPORT: SCROLL LEDGER */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="hidden md:block w-full overflow-y-auto overflow-x-auto relative flex-grow bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl h-[550px] custom-scrollbar min-h-0"
      >
        
        {/* Sticky Soft Glass Header Row */}
        <div 
          className="sticky top-0 z-30 ledger-grid-row bg-zinc-900/90 backdrop-blur-md border-b border-white/5 h-[48px] px-6 text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none shrink-0"
          style={{ width: '100%', minWidth: '900px' }}
        >
          {enableSelection && (
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={data.length > 0 && selectedIds.length === data.length}
                onChange={onToggleAllSelection}
                className="rounded border-white/10 bg-black/40 text-primary-500 focus:ring-primary-500 cursor-pointer w-4 h-4"
              />
            </div>
          )}

          {columns.map((col) => (
            <div 
              key={col.key}
              onClick={() => handleSort(col)}
              className={`flex items-center space-x-1.5 transition-colors duration-200 select-none ${col.sortable ? 'cursor-pointer hover:text-zinc-300' : ''} ${sortConfig.key === col.key ? 'text-white' : ''}`}
            >
              <span>{col.header}</span>
              {col.sortable && sortConfig.key === col.key && (
                sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </div>
          ))}

          <div className="text-right pr-2">Actions</div>
        </div>

        {/* Outer body wrapper containing rows */}
        {isLoading ? (
          /* Loading Skeleton Skeletons matrix */
          <div className="divide-y divide-white/5 px-6" style={{ minWidth: '900px' }}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="ledger-grid-row py-3.5">
                {enableSelection && <div className="w-4 h-4 bg-zinc-800/40 rounded animate-pulse" />}
                {columns.map((col, colIdx) => (
                  <div key={colIdx} className="pr-4">
                    <div 
                      className="h-4 bg-zinc-800/40 rounded animate-pulse" 
                      style={{ width: `${60 + (colIdx % 3) * 15}%` }} 
                    />
                  </div>
                ))}
                <div className="h-4 w-8 bg-zinc-800/40 rounded ml-auto animate-pulse" />
              </div>
            ))}
          </div>
        ) : sortedData.length === 0 ? (
          /* Empty state view */
          <div className="flex flex-col items-center justify-center py-28 space-y-4 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-zinc-400">
              <AlertCircle className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-semibold text-white text-sm tracking-wide">{emptyStateTitle}</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">{emptyStateDescription}</p>
            </div>
          </div>
        ) : (
          /* Virtualized absolute positioned rows mapping */
          <div 
            className="relative w-full"
            style={{ 
              height: `${phantomHeight}px`,
              minWidth: '900px'
            }}
          >
            {visibleRows.map(({ item, originalIdx }) => {
              const isSelected = selectedIds.includes(item.id);
              const top = originalIdx * rowHeight;
              const rowActions = getRowActions(item);

              return (
                <div 
                  key={item.id || originalIdx}
                  className={`ledger-grid-row absolute left-0 right-0 px-6 border-b border-white/5 hover:bg-zinc-800/30 transition-colors duration-200 group`}
                  style={{ 
                    top: `${top}px`, 
                    height: `${rowHeight}px`
                  }}
                >
                  {enableSelection && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleRowSelection(item.id)}
                        className="rounded border-white/10 bg-black/40 text-primary-500 focus:ring-primary-500 cursor-pointer w-4 h-4"
                      />
                    </div>
                  )}

                  {columns.map((col) => (
                    <div key={col.key} className="pr-4 truncate text-sm">
                      {col.render ? col.render(item) : <span className="text-zinc-300">{item[col.key]}</span>}
                    </div>
                  ))}

                  {/* Actions Column */}
                  <div className="text-right flex items-center justify-end">
                    {rowActions.length > 0 && (
                      <button
                        onClick={(e) => handleMenuTrigger(e, item.id, rowActions)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-200"
                        aria-label="More actions"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Absolutely Positioned Context Menu Dropdown */}
        {activeMenu && (
          <div 
            ref={menuRef}
            className="absolute z-50 bg-zinc-900/95 border border-white/10 rounded-xl shadow-2xl py-1 w-48 backdrop-blur-md"
            style={{ 
              top: `${activeMenu.top}px`,
              right: `${activeMenu.right}px`
            }}
          >
            <div className="absolute left-0 right-0 top-0 h-[0.5px] bg-gradient-to-r from-primary-500/10 to-transparent" />
            {activeMenu.actions.map((act, actIdx) => {
              const ActionIcon = act.icon;
              return (
                <button
                  key={actIdx}
                  onClick={() => {
                    act.onClick();
                    setActiveMenu(null);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center space-x-2 transition-colors cursor-pointer ${
                    act.isDestructive 
                      ? 'text-red-400/80 hover:text-red-400 hover:bg-red-500/10' 
                      : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  {ActionIcon && <ActionIcon className="w-3.5 h-3.5 shrink-0" />}
                  <span>{act.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MOBILE COLLAPSED CARD CONTAINER VIEWPORT */}
      <div className="md:hidden flex-grow space-y-4 overflow-y-auto pr-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-3.5 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 w-28 bg-zinc-800/50 rounded" />
                <div className="h-6 w-16 bg-zinc-800/50 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-zinc-800/50 rounded" />
                <div className="h-3 w-4/5 bg-zinc-800/50 rounded" />
              </div>
            </div>
          ))
        ) : sortedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-zinc-500">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-xs">{emptyStateTitle}</h4>
              <p className="text-zinc-500 text-[10px] mt-1">{emptyStateDescription}</p>
            </div>
          </div>
        ) : (
          sortedData.map((item) => {
            const isCardSelected = selectedIds.includes(item.id);
            const rowActions = getRowActions(item);

            return (
              <div 
                key={item.id}
                className={`p-4 bg-zinc-900/40 border rounded-2xl flex flex-col space-y-3.5 transition-all duration-200 ${
                  isCardSelected ? 'border-primary-500/40 bg-primary-500/5' : 'border-white/5'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2.5">
                    {enableSelection && (
                      <input 
                        type="checkbox"
                        checked={isCardSelected}
                        onChange={() => onToggleRowSelection(item.id)}
                        className="rounded border-white/10 bg-black/40 text-primary-500 focus:ring-primary-500 cursor-pointer w-4 h-4 shrink-0"
                      />
                    )}
                    
                    {/* Render primary key details or default title identifier */}
                    <div>
                      {columns[0]?.render ? (
                        columns[0].render(item)
                      ) : (
                        <h4 className="text-sm font-semibold text-white">
                          {item[columns[0]?.key] || 'Record'}
                        </h4>
                      )}
                    </div>
                  </div>

                  {/* Top-right aligned status identifier */}
                  {item.registration_status && (
                    <div className="shrink-0 scale-90 origin-top-right">
                      {item.has_checked_in !== undefined ? (
                        <StatusBadge 
                          status={item.registration_status} 
                          hasCheckedIn={item.has_checked_in} 
                        />
                      ) : (
                        <StatusBadge status={item.status} />
                      )}
                    </div>
                  )}
                </div>

                {/* Body details for secondary items */}
                <div className="bg-black/20 p-3 rounded-xl space-y-2 text-xs">
                  {columns.slice(1).map((col) => (
                    <div key={col.key} className="flex justify-between items-baseline gap-4">
                      <span className="text-zinc-500 text-[10px] font-mono tracking-wider uppercase shrink-0">
                        {col.header}:
                      </span>
                      <span className="text-zinc-300 text-right truncate max-w-[200px]">
                        {col.render ? col.render(item) : item[col.key] || '—'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mobile action bar */}
                {rowActions.length > 0 && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                    {rowActions.map((act, actIdx) => {
                      const Icon = act.icon;
                      return (
                        <button
                          key={actIdx}
                          onClick={act.onClick}
                          className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wide flex items-center space-x-1.5 transition ${
                            act.isDestructive
                              ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'
                              : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {Icon && <Icon className="w-3 h-3" />}
                          <span>{act.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
