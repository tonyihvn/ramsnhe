/**
 * Column Resizing Utility for Tables
 * Provides Excel-like column resizing functionality with mouse drag
 */

export interface ColumnWidth {
  [columnKey: string]: number;
}

export const INITIAL_COLUMN_WIDTH = 150; // Default column width in pixels
export const MIN_COLUMN_WIDTH = 50;      // Minimum allowed column width
export const MAX_COLUMN_WIDTH = 600;     // Maximum allowed column width

/**
 * Start column resize operation
 * @param e Mouse event from column header resize handle
 * @param columnKey The column identifier
 * @param onResize Callback with (columnKey, newWidth)
 */
export const startColumnResize = (
  e: React.MouseEvent<HTMLDivElement>,
  columnKey: string,
  onResize: (columnKey: string, newWidth: number) => void
) => {
  e.preventDefault();
  
  const startX = e.clientX;
  const header = e.currentTarget.closest('th') as HTMLTableCellElement;
  if (!header) return;

  const startWidth = header.offsetWidth;

  const handleMouseMove = (moveEvent: MouseEvent) => {
    const diff = moveEvent.clientX - startX;
    const newWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, startWidth + diff));
    onResize(columnKey, newWidth);
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

/**
 * Apply column widths to a table
 */
export const applyColumnWidths = (
  columnWidths: ColumnWidth,
  tableElement: HTMLTableElement | null
) => {
  if (!tableElement) return;

  const headers = tableElement.querySelectorAll('th');
  headers.forEach((header, idx) => {
    const columnKey = header.getAttribute('data-column-key');
    if (columnKey && columnWidths[columnKey]) {
      header.style.width = `${columnWidths[columnKey]}px`;
      header.style.minWidth = `${columnWidths[columnKey]}px`;
      header.style.maxWidth = `${columnWidths[columnKey]}px`;
    }
  });

  // Also apply to body cells
  const rows = tableElement.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    cells.forEach((cell, idx) => {
      const header = tableElement.querySelectorAll('th')[idx];
      if (header) {
        const columnKey = header.getAttribute('data-column-key');
        if (columnKey && columnWidths[columnKey]) {
          cell.style.width = `${columnWidths[columnKey]}px`;
          cell.style.minWidth = `${columnWidths[columnKey]}px`;
          cell.style.maxWidth = `${columnWidths[columnKey]}px`;
          cell.style.overflow = 'hidden';
          cell.style.textOverflow = 'ellipsis';
          cell.style.whiteSpace = 'nowrap';
        }
      }
    });
  });
};

/**
 * Get initial column widths based on content
 */
export const getInitialColumnWidths = (
  columnKeys: string[],
  defaultWidth: number = INITIAL_COLUMN_WIDTH
): ColumnWidth => {
  const widths: ColumnWidth = {};
  columnKeys.forEach(key => {
    widths[key] = defaultWidth;
  });
  return widths;
};

/**
 * Persist column widths to localStorage
 */
export const saveColumnWidths = (
  key: string,
  columnWidths: ColumnWidth
) => {
  try {
    localStorage.setItem(`column-widths-${key}`, JSON.stringify(columnWidths));
  } catch (e) {
    console.warn('Failed to save column widths:', e);
  }
};

/**
 * Load column widths from localStorage
 */
export const loadColumnWidths = (key: string): ColumnWidth | null => {
  try {
    const stored = localStorage.getItem(`column-widths-${key}`);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn('Failed to load column widths:', e);
    return null;
  }
};

/**
 * Reset column widths to default
 */
export const resetColumnWidths = (
  columnKeys: string[],
  defaultWidth: number = INITIAL_COLUMN_WIDTH
): ColumnWidth => {
  const widths: ColumnWidth = {};
  columnKeys.forEach(key => {
    widths[key] = defaultWidth;
  });
  return widths;
};
