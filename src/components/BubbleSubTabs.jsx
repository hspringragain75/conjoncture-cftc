export default function BubbleSubTabs({ tabs, activeTab, setActiveTab, darkMode, color = 'indigo' }) {
  const colorClasses = {
    indigo: 'bg-indigo-600',
    blue: 'bg-[#0d4093]',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    cyan: 'bg-cyan-600',
    green: 'bg-green-600'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === id
              ? `${colorClasses[color]} text-white shadow-lg`
              : darkMode
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
