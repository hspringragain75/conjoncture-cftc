import { useState } from 'react';

export default function PanneauPresseContenu({ rp, darkMode }) {
  const [filtre, setFiltre] = useState('tous');
  const [sourceFiltre, setSourceFiltre] = useState('Toutes');

  const sources = ['Toutes', ...(rp.sources_noms || [])];
  const articles = filtre === 'une' ? (rp.a_la_une || []) : (rp.tous || []);
  const articlesFiltres = articles.filter(a =>
    sourceFiltre === 'Toutes' || a.source === sourceFiltre
  );

  return (
    <>
      {/* Filtres */}
      <div className="flex gap-1.5 flex-wrap">
        {[['une','⭐ À la une'],['tous','📋 Tous']].map(([id, label]) => (
          <button key={id} onClick={() => setFiltre(id)}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
              filtre === id
                ? 'bg-[#0d4093] text-white'
                : darkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
        <select value={sourceFiltre} onChange={e => setSourceFiltre(e.target.value)}
          className={`ml-auto px-2 py-1 rounded-xl text-xs border ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}>
          {sources.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Articles */}
      {articlesFiltres.length === 0 ? (
        <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Aucun article disponible
        </div>
      ) : articlesFiltres.map((a, i) => (
        <a key={i} href={a.lien} target="_blank" rel="noopener noreferrer"
          className={`flex gap-3 p-3.5 rounded-2xl border transition-all hover:shadow-md group ${
            darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}>
          <div className="w-1 shrink-0 rounded-full self-stretch" style={{ backgroundColor: a.couleur }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-sm">{a.emoji}</span>
              <span className="text-[11px] font-bold" style={{ color: a.couleur }}>{a.source}</span>
              <span className={`text-[10px] ml-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{a.date_fr}</span>
            </div>
            <p className={`text-xs font-semibold leading-snug mb-1 group-hover:underline ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
              {a.titre}
            </p>
            {a.resume && (
              <p className={`text-[11px] leading-relaxed line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {a.resume}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className={`w-1.5 h-1.5 rounded-full ${
                    j < Math.ceil(a.pertinence / 2) ? 'bg-[#0d4093]' : darkMode ? 'bg-gray-600' : 'bg-gray-200'
                  }`} />
                ))}
              </div>
              <span className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>pertinence NAO</span>
              <span className={`text-[10px] ml-auto ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>Lire →</span>
            </div>
          </div>
        </a>
      ))}

      <p className={`text-[10px] text-center pb-2 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📡 Flux RSS officiels · {rp.nb_sources} sources · {rp.tous?.length || 0} articles
      </p>
    </>
  );
}
  
