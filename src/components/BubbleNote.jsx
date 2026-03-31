export default function BubbleNote({ type = 'info', title, children, darkMode }) {
  const types = {
    info:    { border: 'border-[#0d4093]', bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50', title: darkMode ? 'text-blue-300' : 'text-blue-800', text: darkMode ? 'text-blue-200' : 'text-blue-700' },
    warning: { border: 'border-orange-500', bg: darkMode ? 'bg-orange-900/20' : 'bg-orange-50', title: darkMode ? 'text-orange-300' : 'text-orange-800', text: darkMode ? 'text-orange-200' : 'text-orange-700' },
    success: { border: 'border-green-500', bg: darkMode ? 'bg-green-900/20' : 'bg-green-50', title: darkMode ? 'text-green-300' : 'text-green-800', text: darkMode ? 'text-green-200' : 'text-green-700' },
    danger:  { border: 'border-red-500', bg: darkMode ? 'bg-red-900/20' : 'bg-red-50', title: darkMode ? 'text-red-300' : 'text-red-800', text: darkMode ? 'text-red-200' : 'text-red-700' }
  };
  const style = types[type];
  return (
    <div className={`p-4 rounded-2xl border-l-4 ${style.border} ${style.bg}`}>
      {title && <h4 className={`font-semibold mb-2 ${style.title}`}>{title}</h4>}
      <div className={`text-sm ${style.text}`}>{children}</div>
    </div>
  );
}
