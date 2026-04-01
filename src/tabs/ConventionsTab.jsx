import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', purple: '#8b5cf6', gray: '#6b7280'
};

export default function ConventionsTab({d, darkMode}) {
  const [selectedBranche, setSelectedBranche] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('effectif'); // 'effectif' | 'idcc' | 'nom' | 'statut'
  const [sortDir, setSortDir] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTop, setShowTop] = useState(50); // 30 | 50 | 'all'
  
  const cc = d.conventions_collectives;
  
  if (!cc || !cc.branches || !cc.smic_reference) {
    return (
      <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border border-yellow-200 rounded-xl p-6 text-center`}>
        <p className="text-yellow-800 text-lg">⚠️ Données des conventions collectives non disponibles</p>
        <p className="text-sm text-yellow-600 mt-2">Vérifiez que data.json contient la section "conventions_collectives"</p>
      </div>
    );
  }
  
  const SMIC = cc.smic_reference.mensuel;
  
  // ── Tri ──────────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir(col === 'idcc' || col === 'nom' ? 'asc' : 'desc');
    }
    setSelectedBranche(null);
  };

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Filtrage + tri ────────────────────────────────────────────────────────
  const branchesFiltrees = cc.branches
    .filter(b => {
      if (filter === 'conforme') return b.statut === 'conforme';
      if (filter === 'non_conforme') return b.statut !== 'conforme';
      return true;
    })
    .filter(b => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        b.nom.toLowerCase().includes(q) ||
        b.idcc.includes(q) ||
        String(b.effectif || '').includes(q)
      );
    })
    .sort((a, b) => {
      let va, vb;
      switch (sortBy) {
        case 'idcc':
          va = parseInt(a.idcc || '0');
          vb = parseInt(b.idcc || '0');
          break;
        case 'nom':
          va = a.nom.toLowerCase();
          vb = b.nom.toLowerCase();
          return sortDir === 'asc'
            ? va.localeCompare(vb, 'fr')
            : vb.localeCompare(va, 'fr');
        case 'effectif':
          va = a.effectif || 0;
          vb = b.effectif || 0;
          break;
        case 'statut':
          va = a.statut === 'conforme' ? 1 : 0;
          vb = b.statut === 'conforme' ? 1 : 0;
          break;
        default:
          va = a.effectif || 0;
          vb = b.effectif || 0;
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  const branchesAffichees = showTop === 'all'
    ? branchesFiltrees
    : branchesFiltrees.slice(0, showTop);

  const countNonConformes = cc.branches.filter(b => b.statut !== 'conforme').length;
  
  const getNiveauxSousSmic = (branche) =>
    (branche.grille || []).filter(n => n.minimum_mensuel < SMIC).length;
  
  const getEcartSmic = (minimum) =>
    ((minimum - SMIC) / SMIC * 100).toFixed(1);

  const formatEffectif = (n) => {
    if (!n) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return n.toLocaleString('fr-FR');
  };

  const totalEffectifFiltre = branchesFiltrees
    .reduce((s, b) => s + (b.effectif || 0), 0);

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-4 rounded-2xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold">📋 Conventions Collectives</h2>
            <p className="text-sm opacity-80 mt-0.5">
              Top {cc.statistiques_branches?.branches_affichees || cc.branches.length} branches classées par effectif
              {cc.meta?.source_effectifs && (
                <span className="opacity-70"> · {cc.meta.source_effectifs}</span>
              )}
            </p>
          </div>
          <div className={`text-right text-sm ${darkMode ? 'opacity-90' : 'opacity-90'}`}>
            <div className="font-semibold">SMIC référence : {SMIC.toLocaleString('fr-FR')}€ net</div>
            <div className="opacity-75 text-xs">Brut : {cc.smic_reference.mensuel_brut?.toLocaleString('fr-FR') || '1 823'}€ · {cc.smic_reference.date}</div>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Branches suivies', val: cc.statistiques_branches?.total_branches || cc.branches.length, color: 'blue' },
          { label: 'Affichées ici', val: cc.statistiques_branches?.branches_affichees || cc.branches.length, color: 'indigo' },
          { label: '✅ Conformes SMIC', val: cc.statistiques_branches?.branches_conformes, color: 'green' },
          { label: '❌ Non conformes', val: countNonConformes, color: 'red' },
        ].map((kpi, i) => (
          <div key={i} className={`p-4 rounded-xl text-center ${darkMode ? `bg-${kpi.color}-900/30` : `bg-${kpi.color}-50`}`}>
            <p className={`text-3xl font-bold text-${kpi.color}-${darkMode ? '300' : '600'}`}>{kpi.val ?? '—'}</p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* ── Alerte non conformes ── */}
      {countNonConformes > 0 && (
        <div className={`${darkMode ? 'bg-red-900/30' : 'bg-red-50'} border-l-4 border-red-500 p-4 rounded`}>
          <h3 className="font-semibold text-red-800">
            ⚠️ {countNonConformes} branche(s) avec minima &lt; SMIC ({SMIC.toLocaleString('fr-FR')}€)
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Loi du 16 août 2022 : les branches ont <b>45 jours</b> après une revalorisation du SMIC pour ouvrir des négociations.
            Risque de <b>fusion administrative</b> en cas de carence persistante.
          </p>
        </div>
      )}

      {/* ── Barre de recherche + filtres + tri ── */}
      <div className={`p-3 rounded-2xl space-y-3 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        {/* Recherche */}
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Rechercher par nom, IDCC ou effectif..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelectedBranche(null); }}
            className={`flex-1 min-w-[220px] px-3 py-2 rounded-xl border text-sm ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`px-3 py-2 rounded-xl text-sm ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              ✕ Effacer
            </button>
          )}
        </div>

        {/* Filtres statut + nombre affiché */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs font-medium self-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Statut :</span>
            {[
              ['all', `Toutes (${cc.branches.length})`],
              ['conforme', `✅ Conformes (${cc.branches.length - countNonConformes})`],
              ['non_conforme', `❌ Non conformes (${countNonConformes})`],
            ].map(([id, label]) => (
              <button key={id} onClick={() => { setFilter(id); setSelectedBranche(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filter === id
                    ? id === 'non_conforme' ? 'bg-red-600 text-white' : id === 'conforme' ? 'bg-green-600 text-white' : 'bg-amber-600 text-white shadow'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Afficher :</span>
            {[30, 50, 'all'].map(n => (
              <button key={n} onClick={() => setShowTop(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  showTop === n
                    ? 'bg-indigo-600 text-white'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {n === 'all' ? 'Tout' : `Top ${n}`}
              </button>
            ))}
          </div>
        </div>

        {/* Info résultats */}
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {branchesAffichees.length} branche{branchesAffichees.length > 1 ? 's' : ''} affichée{branchesAffichees.length > 1 ? 's' : ''}
          {branchesFiltrees.length !== branchesAffichees.length && ` (sur ${branchesFiltrees.length} filtrées)`}
          {totalEffectifFiltre > 0 && ` · ~${formatEffectif(totalEffectifFiltre)} salariés couverts`}
        </div>
      </div>

      {/* ── En-têtes de colonnes cliquables pour le tri ── */}
      <div className={`rounded-2xl overflow-hidden shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Header du tableau */}
        <div className={`grid grid-cols-12 gap-0 text-xs font-bold uppercase tracking-wide px-3 py-2 border-b ${
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
        }`}>
          {[
            { col: 'idcc', label: 'IDCC', span: 1 },
            { col: 'nom', label: 'Branche', span: 5 },
            { col: 'effectif', label: 'Salariés', span: 2 },
            { col: 'statut', label: 'Conformité', span: 2 },
            { col: null, label: 'Minima', span: 2 },
          ].map(({ col, label, span }) => (
            <div
              key={label}
              className={`col-span-${span} flex items-center gap-1 ${col ? 'cursor-pointer hover:text-current select-none' : ''} ${
                sortBy === col ? (darkMode ? 'text-amber-400' : 'text-amber-600') : ''
              }`}
              onClick={() => col && handleSort(col)}
            >
              {label}
              {col && <SortIcon col={col} />}
            </div>
          ))}
        </div>

        {/* Lignes */}
        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
          {branchesAffichees.length === 0 && (
            <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Aucune branche trouvée
            </div>
          )}
          {branchesAffichees.map((branche, idx) => {
            const niveauxSousSmic = getNiveauxSousSmic(branche);
            const isSelected = selectedBranche === idx;
            const isConforme = branche.statut === 'conforme';
            
            // Rang par effectif dans la liste non filtrée
            const rang = cc.branches
              .sort((a, b) => (b.effectif || 0) - (a.effectif || 0))
              .findIndex(b => b.idcc === branche.idcc) + 1;

            return (
              <div key={branche.idcc || idx}>
                {/* Ligne principale */}
                <div
                  className={`grid grid-cols-12 gap-0 px-3 py-2.5 cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? darkMode ? 'bg-amber-900/30' : 'bg-amber-50'
                      : darkMode
                        ? idx % 2 === 0 ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-800/60 hover:bg-gray-700'
                        : idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedBranche(isSelected ? null : idx)}
                >
                  {/* IDCC */}
                  <div className="col-span-1 flex items-center">
                    <span className={`font-mono text-xs font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                      {branche.idcc}
                    </span>
                  </div>

                  {/* Nom */}
                  <div className="col-span-5 flex items-center gap-2 min-w-0 pr-2">
                    {rang <= 10 && (
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        darkMode ? 'bg-amber-800/60 text-amber-300' : 'bg-amber-100 text-amber-700'
                      }`}>
                        #{rang}
                      </span>
                    )}
                    <span className={`truncate font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {branche.nom}
                    </span>
                  </div>

                  {/* Effectif */}
                  <div className="col-span-2 flex items-center">
                    <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formatEffectif(branche.effectif)}
                    </span>
                  </div>

                  {/* Statut */}
                  <div className="col-span-2 flex items-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isConforme
                        ? darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700'
                        : darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                    }`}>
                      {isConforme ? '✅ OK' : `❌ ${niveauxSousSmic}niv.`}
                    </span>
                  </div>

                  {/* Minima (premier niveau de grille) */}
                  <div className="col-span-2 flex items-center">
                    {branche.grille && branche.grille.length > 0 ? (
                      <span className={`text-xs ${
                        branche.grille[0].minimum_mensuel < SMIC
                          ? 'text-red-500 font-bold'
                          : darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {branche.grille[0].minimum_mensuel.toLocaleString('fr-FR')}€
                        {branche.grille.length > 1 && (
                          <span className="opacity-60"> → {branche.grille[branche.grille.length-1].minimum_mensuel.toLocaleString('fr-FR')}€</span>
                        )}
                      </span>
                    ) : (
                      <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                    )}
                  </div>
                </div>

                {/* Détail déplié */}
                {isSelected && (
                  <div className={`px-4 py-4 border-t ${
                    darkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-amber-50/50 border-amber-100'
                  }`}>
                    <div className="flex flex-wrap gap-3 mb-3">
                      {/* Info branche */}
                      <div className="flex gap-4 text-sm flex-wrap">
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                          <b>IDCC :</b> <span className="font-mono">{branche.idcc}</span>
                        </span>
                        {branche.effectif && (
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            <b>Effectif :</b> {branche.effectif.toLocaleString('fr-FR')} salariés
                          </span>
                        )}
                        {branche.derniere_revalorisation && (
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            <b>Dernière reva :</b> {branche.derniere_revalorisation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Grille de salaires */}
                    {branche.grille && branche.grille.length > 1 ? (
                      <div className="overflow-x-auto">
                        <table className={`w-full text-xs rounded-xl overflow-hidden`}>
                          <thead>
                            <tr className={darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}>
                              <th className="text-left py-2 px-3">Niveau</th>
                              <th className="text-right py-2 px-3">Coef.</th>
                              <th className="text-right py-2 px-3">Mensuel net</th>
                              <th className="text-right py-2 px-3">vs SMIC</th>
                              <th className="text-right py-2 px-3">Annuel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {branche.grille.map((niveau, i) => {
                              const sousSmic = niveau.minimum_mensuel < SMIC;
                              const ecart = getEcartSmic(niveau.minimum_mensuel);
                              return (
                                <tr key={i} className={`border-t ${
                                  sousSmic
                                    ? darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-100'
                                    : darkMode ? 'border-gray-700' : 'border-gray-100'
                                }`}>
                                  <td className={`py-1.5 px-3 font-mono font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {niveau.niveau}
                                    {sousSmic && <span className="ml-1 text-red-500">⚠</span>}
                                  </td>
                                  <td className={`py-1.5 px-3 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {niveau.coefficient || '—'}
                                  </td>
                                  <td className={`py-1.5 px-3 text-right font-semibold ${
                                    sousSmic ? 'text-red-500' : darkMode ? 'text-gray-200' : 'text-gray-800'
                                  }`}>
                                    {niveau.minimum_mensuel.toLocaleString('fr-FR')}€
                                  </td>
                                  <td className={`py-1.5 px-3 text-right font-medium ${
                                    parseFloat(ecart) >= 0 ? 'text-green-500' : 'text-red-500'
                                  }`}>
                                    {parseFloat(ecart) >= 0 ? '+' : ''}{ecart}%
                                  </td>
                                  <td className={`py-1.5 px-3 text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {(niveau.minimum_annuel || niveau.minimum_mensuel * 12).toLocaleString('fr-FR')}€
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className={`text-xs italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Grille détaillée non disponible pour cette convention.
                        {branche.source && (
                          <> <a href={branche.source} target="_blank" rel="noopener noreferrer" className="text-[#0d4093] underline ml-1">
                            Consulter sur Légifrance ↗
                          </a></>
                        )}
                      </p>
                    )}

                    {branche.source && branche.grille && branche.grille.length > 1 && (
                      <div className="mt-2 text-right">
                        <a href={branche.source} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#0d4093] hover:underline">
                          🔗 Voir sur Légifrance
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Note pédagogique ── */}
      <div className={`${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} border border-blue-200 rounded-xl p-4`}>
        <h3 className="font-semibold text-blue-800 mb-2">📚 Comment utiliser ce comparateur ?</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <b>Cliquez sur l'en-tête IDCC</b> pour trier par numéro de convention (ordre croissant ou décroissant)</p>
          <p>• <b>Cliquez sur Salariés</b> pour voir les branches les plus importantes en premier</p>
          <p>• <b>Cherchez votre branche</b> par nom ou numéro IDCC dans la barre de recherche</p>
          <p>• <b>Dépliez une branche</b> pour comparer sa grille de salaires avec le SMIC</p>
        </div>
      </div>

      {/* ── Métadonnées ── */}
      {cc.meta && (
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Mise à jour :</span>
              <span className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{cc.meta.derniere_mise_a_jour}</span>
            </div>
            <div>
              <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Source effectifs :</span>
              <span className={`ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{cc.meta.source_effectifs}</span>
            </div>
            <div className="flex gap-2">
              <a href="https://www.legifrance.gouv.fr/liste/idcc" target="_blank" rel="noopener noreferrer"
                className="text-[#0d4093] hover:underline">Légifrance</a>
              <span className={darkMode ? 'text-gray-600' : 'text-gray-300'}>·</span>
              <a href="https://code.travail.gouv.fr/outils/convention-collective" target="_blank" rel="noopener noreferrer"
                className="text-[#0d4093] hover:underline">Code du Travail Numérique</a>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        SMIC référence : {SMIC.toLocaleString('fr-FR')}€ net mensuel · {cc.smic_reference.date}
        {cc.statistiques_branches?.source_statistiques && ` · ${cc.statistiques_branches.source_statistiques}`}
      </p>
    </div>
  );
}
