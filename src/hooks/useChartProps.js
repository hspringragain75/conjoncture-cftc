import { getChartColors } from './getChartColors';

export function useChartProps(darkMode) {
  const colors = getChartColors(darkMode);
  return {
    cartesianGrid: { strokeDasharray: "3 3", stroke: colors.grid, vertical: false },
    xAxis: { tick: { fill: colors.axis, fontSize: 11 }, axisLine: { stroke: colors.grid }, tickLine: false },
    yAxis: { tick: { fill: colors.axis, fontSize: 11 }, axisLine: false, tickLine: false, width: 40 },
    legend: { wrapperStyle: { fontSize: 11, color: colors.text, paddingTop: '10px' } },
    tooltip: {
      contentStyle: {
        backgroundColor: colors.tooltipBg,
        border: 'none', borderRadius: '12px',
        boxShadow: darkMode ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.12)',
        color: colors.text, padding: '10px 14px'
      },
      labelStyle: { color: colors.text, fontWeight: 600, marginBottom: '4px' },
      itemStyle: { color: colors.text, padding: '2px 0' },
      cursor: { fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }
    }
  };
}
