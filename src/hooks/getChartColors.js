export function getChartColors(darkMode) {
  return {
    grid:       darkMode ? '#374151' : '#e5e7eb',
    axis:       darkMode ? '#9ca3af' : '#6b7280',
    text:       darkMode ? '#e5e7eb' : '#374151',
    tooltipBg:  darkMode ? '#1f2937' : '#ffffff',
    tooltipBorder: darkMode ? '#374151' : '#e5e7eb',
  };
}
