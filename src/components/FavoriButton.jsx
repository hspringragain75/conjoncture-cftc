export default function FavoriButton({ id, isFavori, toggleFavori, darkMode }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); toggleFavori(id); }}
      title={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`ml-auto p-1 rounded-lg transition-all text-sm leading-none ${
        isFavori
          ? 'text-yellow-400 hover:text-yellow-300'
          : darkMode ? 'text-gray-600 hover:text-yellow-400' : 'text-gray-300 hover:text-yellow-400'
      }`}
    >
      {isFavori ? '★' : '☆'}
    </button>
  );
}
