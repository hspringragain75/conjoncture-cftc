export default function BubbleProgressBar({ label, value, max = 100, darkMode, showPercent = true, color }) {
  const percentage = (Math.abs(value) / max) * 100;
  const isPositive = value >= 0;
  const barColor = color || (isPositive ? 'bg-green-500' : 'bg-red-500');

  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs w-32 sm:w-36 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <div className={`h-3 rounded-full flex-1 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
        {showPercent && (
          <span className={`text-xs font-bold w-12 text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {typeof value === 'number' && value >= 0 ? '+' : ''}{value}{typeof value === 'number' ? '%' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
