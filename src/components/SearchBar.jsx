import React, { useState, useEffect } from 'react';

export default function SearchBar({ d, darkMode, onNavigate }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = React.useRef(null);
  const containerRef = React.useRef(null);

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Index ──────────────────────────────────────────────────────────────────
  const index = React.useMemo(() => {
    if (!d) return [];
    const ic = d.indicateurs_cles || {};
    const items = [];
    const add = (label, valeur, onglet, keywords = [], sparkline = null) =>
      items.push({ label, valeur, onglet, keywords: [label.toLowerCase(), ...keywords], sparkline });

    add('Taux de chômage', `${ic.taux_chomage_actuel}%`, 'emploi', ['chomage','unemployment','bit'], d.sparklines?.chomage);
    add('Chômage des jeunes', `${ic.taux_chomage_jeunes}%`, 'emploi', ['jeunes','youth','15-24'], d.sparklines?.chomage);
    add('Taux emploi seniors', `${ic.taux_emploi_seniors}%`, 'emploi', ['seniors','55-64']);
    add('Inflation annuelle', `${ic.inflation_annuelle}%`, 'inflation', ['inflation','ipc','prix'], d.sparklines?.inflation);
    add('SMIC brut mensuel', `${ic.smic_brut}€`, 'simulateur', ['smic','minimum','smig'], d.sparklines?.smic);
    add('SMIC net mensuel', `${ic.smic_net}€`, 'simulateur', ['smic net','minimum net'], d.sparklines?.smic);
    add('Salaire médian', `${ic.salaire_median}€`, 'salaires', ['median','médian','rémunération']);
    add('Salaire moyen', `${ic.salaire_moyen}€`, 'salaires', ['moyen','rémunération moyenne']);
    add('Écart salarial H/F', `${ic.ecart_hf_eqtp}%`, 'salaires', ['inégalité','femmes','hommes','égalité','hf']);
    add('Difficultés recrutement', `${ic.difficultes_recrutement}%`, 'emploi', ['recrutement','tension','recruter']);
    add('IRL (glissement)', `+${ic.irl_glissement}%`, 'conditions_vie', ['irl','loyer','indice loyer']);
    add('Prix du gazole', `${ic.prix_gazole}€/L`, 'conditions_vie', ['gazole','diesel','carburant']);
    add('Taux effort locataires', `${ic.taux_effort_locataires}%`, 'conditions_vie', ['effort','logement','loyer']);
    add('Croissance PIB', `+${ic.croissance_pib}%`, 'conjoncture', ['pib','croissance','gdp']);
    add('Climat des affaires', `${ic.climat_affaires}`, 'conjoncture', ['climat','confiance','insee']);
    add('Défaillances entreprises', `${(ic.defaillances_12m/1000).toFixed(1)}k`, 'conjoncture', ['défaillances','faillites','liquidation']);

    const pva = d.partage_va || {};
    add('Part salaires dans la VA', `${pva.part_salaires_snf}%`, 'conjoncture', ['valeur ajoutée','va','partage']);
    add('Taux de marge EBE', `${pva.part_ebe_snf}%`, 'conjoncture', ['marge','ebe','profits','bénéfices']);

    (d.salaires_secteur || []).forEach(s =>
      add(`Salaire — ${s.secteur}`, `${s.salaire.toLocaleString('fr-FR')}€`, 'salaires',
        ['salaire', s.secteur.toLowerCase(), 'secteur']));

    (d.comparaison_ue?.smic_europe || []).forEach(p =>
      add(`SMIC ${p.pays}`, `${p.smic.toLocaleString('fr-FR')}€`, 'comparaison_ue',
        ['europe','ue', p.pays.toLowerCase(), 'smic europe']));

    const cc = d.conventions_collectives || {};
    add('Branches non conformes SMIC',
      `${cc.statistiques_branches?.branches_non_conformes}/${cc.statistiques_branches?.total_branches}`,
      'conventions', ['convention','branche','smic','conformité','minima']);
    (cc.branches || []).forEach(b =>
      add(`CCN — ${b.nom}`, b.statut === 'conforme' ? '✅' : '❌', 'conventions',
        ['convention','ccn', b.nom.toLowerCase(), `idcc ${b.idcc}`]));

    const carb = d.carburants || {};
    if (carb.sp95) add('SP95', `${carb.sp95.prix}€/L`, 'conditions_vie', ['sp95','essence','carburant']);
    add('PPV (montant moyen)', `${(d.ppv||{}).montant_moyen}€`, 'salaires', ['ppv','prime macron','partage valeur']);

    return items;
  }, [d]);

  // ── Recherche fuzzy ────────────────────────────────────────────────────────
  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!q) return [];
    return index.map(item => {
      const hay = item.keywords.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const lab = item.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let score = 0;
      if (lab.startsWith(q)) score = 100;
      else if (lab.includes(q)) score = 60;
      else if (hay.includes(q)) score = 30;
      else if (q.split(' ').filter(Boolean).every(w => hay.includes(w))) score = 10;
      return { ...item, score };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [query, index]);

  useEffect(() => { setSelected(0); }, [results]);

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, results.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s-1, 0)); }
    if (e.key === 'Enter' && results[selected]) { onNavigate(results[selected].onglet); setOpen(false); setQuery(''); }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
  };

  const LABELS = {
    conjoncture:'📈 Conjoncture', previsions:'🔮 Prévisions', evolutions:'📉 Évolutions',
    pouvoir_achat:"💰 Pouvoir d'achat", salaires:'💵 Salaires', emploi:'👥 Emploi',
    travail:'⚙️ Travail', territoires:'🗺️ Territoires', conditions_vie:'🏠 Conditions',
    inflation:'📊 Inflation', conventions:'📋 Conventions', comparaison_ue:'🇪🇺 Europe',
    simulateur:'🧮 Simulateur',
  };

  // Sparkline SVG
  const Spark = ({ data, active }) => {
    if (!data || data.length < 2) return null;
    const vals = data.map(v => typeof v === 'object' ? v.value : v);
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const w = 44, h = 16, p = 1;
    const pts = vals.map((v, i) => {
      const x = p + (i/(vals.length-1))*(w-2*p);
      const y = h - p - ((v-min)/range)*(h-2*p);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const color = active ? '#60a5fa' : '#6b7280';
    return (
      <svg width={w} height={h}>
        <polyline fill="none" stroke={color} strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" points={pts} />
      </svg>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all ${
        open
          ? darkMode ? 'bg-white/20 ring-2 ring-white/30' : 'bg-white/30 ring-2 ring-white/50'
          : darkMode ? 'bg-white/10 hover:bg-white/15' : 'bg-white/20 hover:bg-white/25'
      }`}>
        <span className="text-white/70 text-sm">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="Rechercher..."
          className="bg-transparent outline-none text-white placeholder-white/50 text-xs w-32 sm:w-44"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}
            className="text-white/50 hover:text-white text-sm leading-none">✕</button>
        )}
      </div>

      {/* Dropdown résultats */}
      {open && results.length > 0 && (
        <div className={`absolute top-full mt-2 right-0 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden z-50 ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          {results.map((r, i) => (
            <button key={i}
              onClick={() => { onNavigate(r.onglet); setOpen(false); setQuery(''); }}
              onMouseEnter={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selected
                  ? darkMode ? 'bg-blue-900/60' : 'bg-blue-50'
                  : darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
              } ${i > 0 ? (darkMode ? 'border-t border-gray-800' : 'border-t border-gray-100') : ''}`}>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-medium truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {r.label}
                  </span>
                  <span className={`text-sm font-black shrink-0 ${
                    i === selected ? (darkMode ? 'text-blue-300' : 'text-[#0d4093]') : (darkMode ? 'text-white' : 'text-gray-900')
                  }`}>
                    {r.valeur}
                  </span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md mt-0.5 inline-block ${
                  darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                }`}>
                  {LABELS[r.onglet] || r.onglet}
                </span>
              </div>

              {r.sparkline && <Spark data={r.sparkline} active={i === selected} />}
            </button>
          ))}

          <div className={`px-4 py-1.5 text-[10px] flex justify-between ${
            darkMode ? 'border-t border-gray-800 text-gray-600' : 'border-t border-gray-100 text-gray-400'
          }`}>
            <span>↑↓ naviguer · ↵ ouvrir</span>
            <span>{index.length} indicateurs</span>
          </div>
        </div>
      )}
    </div>
  );
}

}
