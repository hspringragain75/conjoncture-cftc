import FavoriButton from './FavoriButton';

export default function Card({ title, children, darkMode, noPadding = false, favoriId, isFavori, toggleFavori }) {
  return (
    <div className={`rounded-2xl overflow-hidden shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className={`px-4 py-3 border-b flex items-center gap-3 ${
        darkMode ? 'border-gray-700' : 'border-gray-100 bg-gray-50'
      }`}>
        <h3 className={`font-semibold text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {title}
        </h3>
        {favoriId && toggleFavori && (
          <FavoriButton id={favoriId} isFavori={!!isFavori} toggleFavori={toggleFavori} darkMode={darkMode} />
        )}
      </div>
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
}
