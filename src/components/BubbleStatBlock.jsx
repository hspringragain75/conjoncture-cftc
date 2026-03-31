export default function BubbleStatBlock({ label, value, status = 'neutral', darkMode, subtitle }) {
  const statusColors = {
    good:    darkMode ? 'bg-green-900/30 text-green-400'  : 'bg-green-50 text-green-600',
    neutral: darkMode ? 'bg-blue-900/30 text-blue-400'   : 'bg-blue-50 text-[#0d4093]',
    warning: darkMode ? 'bg-orange-900/30 text-orange-400' : 'bg-orange-50 text-orange-600',
    bad:     darkMode ? 'bg-red-900/30 text-red-400'     : 'bg-red-50 text-red-600',
  };

  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
      <div>
        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</span>
        {subtitle && <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{subtitle}</p>}
      </div>
      <span className={`text-xl font-bold px-3 py-1 rounded-xl ${statusColors[status]}`}>{value}</span>
    </div>
  );
}
