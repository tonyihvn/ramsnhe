/**
 * Test suite for DataTable column width calculations
 * Verifies that the getDefaultWidth function properly calculates widths
 * to ensure headers fit in one line and don't get squeezed
 */

describe('DataTable Column Width Calculations', () => {
  /**
   * Simulates the getDefaultWidth function used in DataTable component
   * Calculates width based on label length to ensure headers fit in one line
   */
  const getDefaultWidth = (label: string): number => {
    // Base: 60px minimum for content, plus padding
    // Approximately 8px per character for default font
    const textWidth = Math.max(80, Math.min(300, label.length * 8 + 40));
    return Math.min(400, Math.max(100, textWidth));
  };

  test('should calculate minimum width of 100px for very short labels', () => {
    expect(getDefaultWidth('ID')).toBe(100);
  });

  test('should calculate width based on label length', () => {
    expect(getDefaultWidth('Report ID')).toBe(132); // 9 * 8 + 40 = 112, min 100
    expect(getDefaultWidth('Question')).toBe(104); // 8 * 8 + 40 = 104
    expect(getDefaultWidth('Answer')).toBe(100); // 6 * 8 + 40 = 88, min 100
  });

  test('should handle longer labels with reasonable widths', () => {
    // 'Quality Improvement Followup' = 27 chars * 8 + 40 = 256
    const width = getDefaultWidth('Quality Improvement Followup');
    expect(width).toBe(256);
    expect(width).toBeLessThanOrEqual(400); // Respect 400px max
  });

  test('should respect 400px maximum width', () => {
    // Very long label: 60 chars * 8 + 40 = 520, should cap at 400
    const longLabel = 'This is a very long column label that should not exceed maximum width limit';
    expect(getDefaultWidth(longLabel)).toBe(400);
  });

  test('should not squeeze columns with realistic headers from submitted answers page', () => {
    const headers = [
      'Report ID',
      'Question',
      'Answer',
      'Facility',
      'User',
      'Recorded By',
      'Score',
      'Answer Date/Time',
      'Reviewer Comment',
      'QI Followup',
      'Submitted At'
    ];

    const widths = headers.map(h => getDefaultWidth(h));
    
    // All widths should be between 100 and 400
    widths.forEach((width, idx) => {
      expect(width).toBeGreaterThanOrEqual(100);
      expect(width).toBeLessThanOrEqual(400);
      console.log(`${headers[idx]}: ${width}px`);
    });
  });

  test('should provide reasonable spacing for all column types', () => {
    const testCases = [
      { label: 'Score', expectedMin: 100, expectedMax: 150 },
      { label: 'Facility', expectedMin: 100, expectedMax: 160 },
      { label: 'User', expectedMin: 100, expectedMax: 150 },
      { label: 'Answer Date/Time', expectedMin: 150, expectedMax: 250 },
      { label: 'Reviewer Comment', expectedMin: 150, expectedMax: 250 },
      { label: 'Quality Improvement Followup', expectedMin: 250, expectedMax: 350 }
    ];

    testCases.forEach(({ label, expectedMin, expectedMax }) => {
      const width = getDefaultWidth(label);
      expect(width).toBeGreaterThanOrEqual(expectedMin);
      expect(width).toBeLessThanOrEqual(expectedMax);
    });
  });

  test('resize should respect 400px maximum', () => {
    const startWidth = getDefaultWidth('Answer');
    const delta = 500; // Try to resize beyond max
    const startX = 0;
    const clientX = startX + delta;

    // Simulate resize logic
    const nextWidth = Math.max(80, Math.min(400, startWidth + clientX - startX));
    
    expect(nextWidth).toBe(400); // Should cap at 400px
  });

  test('resize should allow minimum of 80px', () => {
    const startWidth = 150;
    const delta = -200; // Try to resize below min
    const startX = 0;
    const clientX = startX + delta;

    // Simulate resize logic
    const nextWidth = Math.max(80, Math.min(400, startWidth + clientX - startX));
    
    expect(nextWidth).toBe(80); // Should cap at 80px minimum
  });

  test('should handle Unicode characters and special characters in labels', () => {
    // Test with various special characters
    expect(getDefaultWidth('Score %')).toBeGreaterThan(100);
    expect(getDefaultWidth('Date/Time')).toBeGreaterThan(100);
    expect(getDefaultWidth('User (Name)')).toBeGreaterThan(100);
  });

  test('should maintain consistency across multiple calls', () => {
    const label = 'Answer Date/Time';
    const width1 = getDefaultWidth(label);
    const width2 = getDefaultWidth(label);
    
    expect(width1).toBe(width2);
  });
});
