import React, { useState } from 'react';
import { buildCatalogue } from '../utils/catalogue';
import BubbleKpi from '../components/BubbleKpi';

export default function FavorisTab({ d, darkMode, favoris, toggleFavori, isFavori, setSeuil, getSeuil, setNote, getNote, isEnAlerte }) {
  const [modeConfig, setModeConfig] = useState(false);
  const [filterCat, setFilterCat] = useState('Tous');
  const [popover, setPopover] = useState(null); // id de la carte dont le popover est ouvert
  const [seuilInput, setSeuilInput] = useState('');
  const [seuilDir, setSeuilDir] = useState('sup');
  const [noteInput, setNoteInput] = useState('');

  const [ordre, setOrdre] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cftc_favoris_ordre') || '[]'); } catch { return []; }
  });
  const dragId = React.useRef(null);
  const dragOverId = React.useRef(null);

  const catalogue = buildCatalogue(d);
  const categories = [...new Set(catalogue.map(ind => ind.categorie))];

  const ordreEffectif = React.useMemo(() => {
    const inOrdre = ordre.filter(id => favoris.includes(id));
    const nouveaux = favoris.filter(id => !ordre.includes(id));
    return [...inOrdre, ...nouveaux];
  }, [favoris, ordre]);

  const sauvegarderOrdre = (nouvelOrdre) => {
    setOrdre(nouvelOrdre);
    localStorage.setItem('cftc_favoris_ordre', JSON.stringify(nouvelOrdre));
  };

  const onDragStart = (id) => { dragId.current = id; };
  const onDragOver  = (e, id) => { e.preventDefault(); dragOverId.current = id; };
  const onDrop      = () => {
    if (!dragId.current || dragId.current === dragOverId.current) return;
    const next = [...ordreEffectif];
    const from = next.indexOf(dragId.current);
    const to   = next.indexOf(dragOverId.current);
    if (from === -1 || to === -1) return;
    next.splice(from, 1);
    next.splice(to, 0, dragId.current);
    sauvegarderOrdre(next);
    dragId.current = null; dragOverId.current = null;
  };

  const indicsFavoris = ordreEffectif.map(id => catalogue.find(ind => ind.id === id)).filter(Boolean);
  const catalogueFiltré = filterCat === 'Tous' ? catalogue : catalogue.filter(ind => ind.categorie === filterCat);

  // Résumé
  const nbHausse  = indicsFavoris.filter(ind => { const sp = ind.getSparkline?.(d); if (!sp || sp.length < 2) return false; const v = sp.filter(x => x != null); return v.length >= 2 && v[v.length-1] > v[v.length-2]; }).length;
  const nbBaisse  = indicsFavoris.filter(ind => { const sp = ind.getSparkline?.(d); if (!sp || sp.length < 2) return false; const v = sp.filter(x => x != null); return v.length >= 2 && v[v.length-1] < v[v.length-2]; }).length;
  const nbAlertes = indicsFavoris.filter(ind => isEnAlerte(ind.id, ind.getValue(d))).length;

  // Ouvrir le popover d'une carte
  const ouvrirPopover = (ind) => {
    const s = getSeuil(ind.id);
    setSeuilInput(s ? String(s.valeur) : '');
    setSeuilDir(s ? s.direction : 'sup');
    setNoteInput(getNote(ind.id));
    setPopover(ind.id);
  };

  const fermerPopover = () => setPopover(null);

  const sauvegarderPopover = (id) => {
    setSeuil(id, seuilInput, seuilDir);
    setNote(id, noteInput);
    fermerPopover();
  };

  // ── Mode config ──
  if (modeConfig) {
    return (
      <div className="space-y-4">
        <div className={`flex items-center justify-between p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
          <div>
            <h2 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-gray-800'}`}>✏️ Configurer mes favoris</h2>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{favoris.length} indicateur{favoris.length !== 1 ? 's' : ''} sélectionné{favoris.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setModeConfig(false)} className="px-4 py-2 bg-[#0d4093] text-white rounded-xl text-sm font-medium hover:bg-[#0a3278] transition">✓ Terminer</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Tous', ...categories].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filterCat === cat ? 'bg-[#0d4093] text-white shadow' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {catalogueFiltré.map(ind => {
            const actif = favoris.includes(ind.id);
            return (
              <button key={ind.id} onClick={() => toggleFavori(ind.id)}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${actif ? darkMode ? 'bg-blue-900/40 border-blue-700 shadow-lg' : 'bg-blue-50 border-blue-300 shadow' : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-300 shadow-sm'}`}>
                <span className={`text-lg ${actif ? 'text-yellow-400' : darkMode ? 'text-gray-600' : 'text-gray-300'}`}>{actif ? '★' : '☆'}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{ind.label}</p>
                  <p className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{ind.categorie}</p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${darkMode ? 'text-blue-400' : 'text-[#0d4093]'}`}>{ind.getValue(d)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Mode affichage cockpit ──
  return (
    <div className="space-y-3" onClick={() => popover && fermerPopover()}>

      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h2 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>⭐ Mon tableau de bord</h2>
            <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{indicsFavoris.length} indicateur{indicsFavoris.length !== 1 ? 's' : ''}</p>
          </div>
          {indicsFavoris.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {nbHausse  > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{background:'#dcfce7',color:'#15803d'}}>▲ {nbHausse} en hausse</span>}
              {nbBaisse  > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{background:'#fee2e2',color:'#b91c1c'}}>▼ {nbBaisse} en baisse</span>}
              {nbAlertes > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{background:'#fef3c7',color:'#92400e'}}>⚠ {nbAlertes} alerte{nbAlertes !== 1 ? 's' : ''}</span>}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {indicsFavoris.length > 1 && <span className={`text-[10px] hidden sm:block ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>⠿ Glisser pour réordonner · ⚙ Clic pour configurer</span>}
          <button onClick={() => setModeConfig(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            ✏️ Indicateurs
          </button>
        </div>
      </div>

      {/* Vide */}
      {indicsFavoris.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-16 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
          <div className="text-5xl mb-4">⭐</div>
          <h3 className={`font-semibold text-base mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Votre tableau de bord est vide</h3>
          <p className={`text-sm mb-6 text-center max-w-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sélectionnez les indicateurs que vous souhaitez suivre au quotidien.</p>
          <button onClick={() => setModeConfig(true)} className="px-5 py-2.5 bg-[#0d4093] text-white rounded-xl text-sm font-medium hover:bg-[#0a3278] transition">✏️ Choisir mes indicateurs</button>
        </div>
      )}

      {/* Grille cockpit */}
      {indicsFavoris.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
          {indicsFavoris.map(ind => {
            const enAlerte = isEnAlerte(ind.id, ind.getValue(d));
            const note = getNote(ind.id);
            const seuil = getSeuil(ind.id);
            const isOpen = popover === ind.id;

            return (
              <div key={ind.id} draggable
                onDragStart={() => onDragStart(ind.id)}
                onDragOver={e => onDragOver(e, ind.id)}
                onDrop={onDrop}
                style={{ position: 'relative' }}
              >
                {/* Carte principale */}
                <BubbleKpi
                  label={ind.label}
                  value={ind.getValue(d)}
                  status={ind.getStatus(d)}
                  darkMode={darkMode}
                  tooltip={ind.tooltip}
                  sparklineData={ind.getSparkline ? ind.getSparkline(d) : undefined}
                  invertTrend={!!ind.invertTrend}
                  alerte={enAlerte}
                  note={note}
                />

                {/* ✕ Supprimer — coin haut droit, toujours visible */}
                <button
                  onClick={e => { e.stopPropagation(); toggleFavori(ind.id); }}
                  title="Retirer des favoris"
                  style={{
                    position: 'absolute', top: '5px', right: '5px', zIndex: 10,
                    width: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: darkMode ? '#374151' : '#f3f4f6',
                    border: 'none', borderRadius: '4px',
                    cursor: 'pointer', fontSize: '9px', fontWeight: 700,
                    color: darkMode ? '#9ca3af' : '#6b7280',
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background=darkMode?'#374151':'#f3f4f6'; e.currentTarget.style.color=darkMode?'#9ca3af':'#6b7280'; }}
                >✕</button>

                {/* ✏ Note — coin bas droit, toujours visible */}
                <button
                  onClick={e => { e.stopPropagation(); ouvrirPopover(ind); }}
                  title={note ? `Note : ${note}` : 'Ajouter une note ou un seuil'}
                  style={{
                    position: 'absolute', bottom: '5px', right: '5px', zIndex: 10,
                    width: '16px', height: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: note || getSeuil(ind.id)
                      ? (darkMode ? '#1e3a5f' : '#dbeafe')
                      : (darkMode ? '#374151' : '#f3f4f6'),
                    border: 'none', borderRadius: '4px',
                    cursor: 'pointer', fontSize: '9px',
                    color: note || getSeuil(ind.id)
                      ? (darkMode ? '#60a5fa' : '#2563eb')
                      : (darkMode ? '#9ca3af' : '#6b7280'),
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#2563eb'; e.currentTarget.style.color='#fff'; }}
                  onMouseLeave={e => {
                    const hasData = note || getSeuil(ind.id);
                    e.currentTarget.style.background = hasData ? (darkMode?'#1e3a5f':'#dbeafe') : (darkMode?'#374151':'#f3f4f6');
                    e.currentTarget.style.color = hasData ? (darkMode?'#60a5fa':'#2563eb') : (darkMode?'#9ca3af':'#6b7280');
                  }}
                >✏</button>

                {/* Badge seuil configuré mais pas déclenché */}
                {seuil && !enAlerte && (
                  <div style={{ position:'absolute', bottom:'6px', left:'6px', fontSize:'9px', color: darkMode?'#4b5563':'#d1d5db' }}>
                    {seuil.direction === 'sup' ? '▲' : '▼'}{seuil.valeur}
                  </div>
                )}

                {/* Popover config seuil + note */}
                {isOpen && (
                  <div onClick={e => e.stopPropagation()}
                    style={{
                      position:'absolute', top:'calc(100% + 8px)', left:0, zIndex:100,
                      width:'220px',
                      background: darkMode?'#1f2937':'#ffffff',
                      border:`1px solid ${darkMode?'#374151':'#e5e7eb'}`,
                      borderRadius:'12px', padding:'12px',
                      boxShadow:'0 8px 24px rgba(0,0,0,0.15)',
                    }}>
                    <p style={{ fontSize:'11px', fontWeight:600, color: darkMode?'#f9fafb':'#111827', marginBottom:'10px' }}>
                      ✏ {ind.label}
                    </p>

                    {/* Seuil */}
                    <p style={{ fontSize:'10px', color: darkMode?'#9ca3af':'#6b7280', marginBottom:'4px' }}>Alerte si la valeur est</p>
                    <div style={{ display:'flex', gap:'4px', marginBottom:'8px' }}>
                      <select value={seuilDir} onChange={e => setSeuilDir(e.target.value)}
                        style={{ fontSize:'11px', padding:'4px 6px', borderRadius:'6px', border:`0.5px solid ${darkMode?'#374151':'#e5e7eb'}`, background: darkMode?'#374151':'#f9fafb', color: darkMode?'#f9fafb':'#111827', flex:'0 0 auto' }}>
                        <option value="sup">supérieure à</option>
                        <option value="inf">inférieure à</option>
                      </select>
                      <input type="number" value={seuilInput} onChange={e => setSeuilInput(e.target.value)}
                        placeholder="valeur"
                        style={{ fontSize:'11px', padding:'4px 8px', borderRadius:'6px', border:`0.5px solid ${darkMode?'#374151':'#e5e7eb'}`, background: darkMode?'#374151':'#f9fafb', color: darkMode?'#f9fafb':'#111827', width:'72px' }} />
                    </div>

                    {/* Note */}
                    <p style={{ fontSize:'10px', color: darkMode?'#9ca3af':'#6b7280', marginBottom:'4px' }}>Note personnelle</p>
                    <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                      placeholder="Ex : à surveiller pour NAO oct."
                      rows={2}
                      style={{ fontSize:'11px', padding:'6px 8px', borderRadius:'6px', border:`0.5px solid ${darkMode?'#374151':'#e5e7eb'}`, background: darkMode?'#374151':'#f9fafb', color: darkMode?'#f9fafb':'#111827', width:'100%', resize:'none', marginBottom:'8px', lineHeight:1.5 }} />

                    {/* Boutons */}
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button onClick={() => sauvegarderPopover(ind.id)}
                        style={{ flex:1, fontSize:'11px', padding:'5px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:600 }}>
                        ✓ Enregistrer
                      </button>
                      <button onClick={() => { setSeuil(ind.id, '', 'sup'); setNote(ind.id, ''); setSeuilInput(''); setNoteInput(''); fermerPopover(); }}
                        style={{ fontSize:'11px', padding:'5px 8px', background:'none', color: darkMode?'#6b7280':'#9ca3af', border:`0.5px solid ${darkMode?'#374151':'#e5e7eb'}`, borderRadius:'6px', cursor:'pointer' }}>
                        Effacer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
