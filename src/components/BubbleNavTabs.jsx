import { useState, useEffect, useRef } from 'react';

export default function BubbleNavTabs({ tabs, activeTab, setActiveTab, darkMode }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 10);
      setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative rounded-2xl p-1.5 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className={`hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-xl shadow transition-all ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          ◀
        </button>
      )}

      <div
        ref={scrollRef}
        className={`flex gap-1 overflow-x-auto scrollbar-hide ${showLeft ? 'md:ml-10' : ''} ${showRight ? 'md:mr-10' : ''}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              activeTab === id
                ? 'bg-[#0d4093] text-white shadow-lg'
                : darkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showRight && (
        <button
          onClick={() => scroll('right')}
          className={`hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-xl shadow transition-all ${
            darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50 border'
          }`}
        >
          ▶
        </button>
      )}
    </div>
  );
}
