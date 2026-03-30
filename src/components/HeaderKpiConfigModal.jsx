import { useState } from 'react';
import { buildCatalogue } from '../utils/catalogue';

const HEADER_KPIS_MAX = 6;

export default function HeaderKpiConfigModal({ d, darkMode, headerKpis, toggleHeaderKpi, onClose }) {
  // ==================== MODAL CONFIG HEADER KPIs ====================
  const catalogue = buildCatalogue(d);
  const categories = [...new Set(catalogue.map(ind => ind.categorie))];
  const [filterCat, setFilterCat] = useState('Tous');

  const catalogueFiltré = filterCat === 'Tous' ? catalogue : catalogue.filter(ind => ind.categorie === filterCat);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto" onClick={onClose}>
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div>
            <h2 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              ⚡ Personnaliser les indicateurs clés
            </h2>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {headerKpis.length}/{HEADER_KPIS_MAX} sélectionnés · Toujours visibles en haut de page
            </p>
          </div>
          <button onClick={onClose}
            className={`p-2 rounded-xl transition ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
            ✕
          </button>
        </div>

        {/* Filtres catégorie */}
        <div className={`px-5 py-3 border-b flex flex-wrap gap-2 ${darkMode ? 'border-gray-700' : 'border-gray-100 bg-gray-50'}`}>
          {['Tous', ...categories].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                filterCat === cat
                  ? 'bg-[#0d4093] text-white shadow'
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grille indicateurs */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
          {catalogueFiltré.map(ind => {
            const actif = headerKpis.includes(ind.id);
            const plein = headerKpis.length >= HEADER_KPIS_MAX && !actif;
            return (
              <button key={ind.id} onClick={() => !plein && toggleHeaderKpi(ind.id)}
                disabled={plein}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  actif
                    ? darkMode ? 'bg-blue-900/40 border-[#0d4093]' : 'bg-blue-50 border-blue-400'
                    : plein
                      ? darkMode ? 'bg-gray-800 border-gray-700 opacity-40 cursor-not-allowed' : 'bg-gray-50 border-gray-100 opacity-40 cursor-not-allowed'
                      : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-100 hover:border-gray-300'
                }`}>
                {/* Checkbox visuelle */}
                <div style={{
                  width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                  background: actif ? '#2563eb' : darkMode ? '#374151' : '#e5e7eb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {actif && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{ind.label}</p>
                  <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{ind.categorie}</p>
                </div>

                <span className={`text-xs font-bold tabular-nums ${actif ? (darkMode ? 'text-blue-400' : 'text-[#0d4093]') : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {ind.getValue(d)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-100 bg-gray-50'}`}>
          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {headerKpis.length < HEADER_KPIS_MAX
              ? `Vous pouvez encore sélectionner ${HEADER_KPIS_MAX - headerKpis.length} indicateur${HEADER_KPIS_MAX - headerKpis.length > 1 ? 's' : ''}`
              : 'Maximum atteint — retirez-en un pour en ajouter un autre'}
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-[#0d4093] text-white rounded-xl text-sm font-medium hover:bg-[#0a3278] transition">
            ✓ Valider
          </button>
        </div>
      </div>
    </div>
  );
}
