import { useMemo, useState } from 'react';
import Card from '../components/Card';

export default function ConventionsTab({ d, darkMode }) {
  const [selectedBranche, setSelectedBranche] = useState(null);
  const [filter, setFilter] = useState('all'); // all | conforme | non_conforme | a_verifier
  const [sortBy, setSortBy] = useState('effectif'); // effectif | idcc | nom | statut
  const [sortDir, setSortDir] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTop, setShowTop] = useState(50); // 30 | 50 | 'all'

  const cc = d?.conventions_collectives;

  if (!cc || !cc.branches || !cc.smic_reference) {
    return (
      <div className={`${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'} border border-yellow-200 rounded-xl p-6 text-center`}>
        <p className="text-yellow-800 text-lg">⚠️ Données des conventions collectives non disponibles</p>
        <p className="text-sm text-yellow-600 mt-2">Vérifie que data.json contient la section "conventions_collectives"</p>
      </div>
    );
  }

  const SMIC = Number(cc.smic_reference?.mensuel || 0);

  const countConformes = cc.branches.filter((b) => b.statut === 'conforme').length;
  const countNonConformes = cc.branches.filter((b) => b.statut === 'non_conforme').length;
  const countAVerifier = cc.branches.filter((b) => b.statut === 'a_verifier').length;

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
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

  const statutRank = (statut) => {
    if (statut === 'conforme') return 3;
    if (statut === 'a_verifier') return 2;
    if (statut === 'non_conforme') return 1;
    return 0;
  };

  const getNiveauxSousSmic = (branche) =>
    (branche.grille || []).filter((n) => Number(n.minimum_mensuel || 0) < SMIC).length;

  const getEcartSmic = (minimum) => {
    if (!minimum || !SMIC) return null;
    return ((minimum - SMIC) / SMIC * 100).toFixed(1);
  };

  const formatEffectif = (n) => {
    if (!n) return '—';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return Number(n).toLocaleString('fr-FR');
  };

  const formatMoney = (n) => {
    if (n == null || Number.isNaN(Number(n))) return '—';
    return Number(n).toLocaleString('fr-FR');
  };

  const formatConfidence = (v) => {
    if (v == null || Number.isNaN(Number(v))) return null;
    return `${Math.round(Number(v) * 100)}%`;
  };

  const branchesTriees = useMemo(() => {
    return [...cc.branches]
      .filter((b) => {
        if (filter === 'conforme') return b.statut === 'conforme';
        if (filter === 'non_conforme') return b.statut === 'non_conforme';
        if (filter === 'a_verifier') return b.statut === 'a_verifier';
        return true;
      })
      .filter((b) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (b.nom || '').toLowerCase().includes(q) ||
          String(b.idcc || '').includes(q) ||
          String(b.effectif || '').includes(q)
        );
      })
      .sort((a, b) => {
        let va;
        let vb;

        switch (sortBy) {
          case 'idcc':
            va = parseInt(a.idcc || '0', 10);
            vb = parseInt(b.idcc || '0', 10);
            break;
          case 'nom':
            va = (a.nom || '').toLowerCase();
            vb = (b.nom || '').toLowerCase();
            return sortDir === 'asc'
              ? va.localeCompare(vb, 'fr')
              : vb.localeCompare(va, 'fr');
          case 'statut':
            va = statutRank(a.statut);
            vb = statutRank(b.statut);
            break;
          case 'effectif':
          default:
            va = Number(a.effectif || 0);
            vb = Number(b.effectif || 0);
            break;
        }

        return sortDir === 'asc' ? va - vb : vb - va;
      });
  }, [cc.branches, filter, searchQuery, sortBy, sortDir]);

  const branchesAffichees = showTop === 'all'
    ? branchesTriees
    : branchesTriees.slice(0, showTop);

  const totalEffectifFiltre = branchesTriees.reduce((s, b) => s + Number(b.effectif || 0), 0);

  const rangsParIdcc = useMemo(() => {
    const sorted = [...cc.branches].sort((a, b) => Number(b.effectif || 0) - Number(a.effectif || 0));
    const map = new Map();
    sorted.forEach((b, i) => map.set(b.idcc, i + 1));
    return map;
  }, [cc.branches]);

  const getStatutBadge = (branche) => {
    const isConforme = branche.statut === 'conforme';
    const isAVerifier = branche.statut === 'a_verifier';
    const niveauxSousSmic = getNiveauxSousSmic(branche);

    if (isConforme) {
      return {
        label: '✅ OK',
        className: darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700',
      };
    }

    if (isAVerifier) {
      return {
        label: '🟠 À vérifier',
        className: darkMode ? 'bg-amber-900/50 text-amber-300' : 'bg-amber-100 text-amber-700',
      };
    }

    return {
      label: `❌ ${niveauxSousSmic} niv.`,
      className: darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700',
    };
  };

  return (
    <div className="space-y-4">
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
          <div className="text-right text-sm opacity-90">
            <div className="font-semibold">
              SMIC référence : {formatMoney(SMIC)}€ net
            </div>
            <div className="opacity-75 text-xs">
              Brut : {formatMoney(cc.smic_reference?.mensuel_brut || 1823)}€ · {cc.smic_reference?.date || '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Branches suivies',
            val: cc.statistiques_branches?.total_branches || cc.branches.length,
            color: 'blue',
          },
          {
            label: '✅ Conformes',
            val: cc.statistiques_branches?.branches_conformes ?? countConformes,
            color: 'green',
          },
          {
            label: '❌ Sous SMIC',
            val: cc.statistiques_branches?.branches_non_conformes ?? countNonConformes,
            color: 'red',
          },
          {
            label: '🟠 À vérifier',
            val: cc.statistiques_branches?.branches_a_verifier ?? countAVerifier,
            color: 'amber',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl text-center ${darkMode ? `bg-${kpi.color}-900/30` : `bg-${kpi.color}-50`}`}
          >
            <p className={`text-3xl font-bold text-${kpi.color}-${darkMode ? '300' : '600'}`}>
              {kpi.val ?? '—'}
            </p>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {countNonConformes > 0 && (
        <div className={`${darkMode ? 'bg-red-900/30' : 'bg-red-50'} border-l-4 border-red-500 p-4 rounded`}>
          <h3 className="font-semibold text-red-800">
            ⚠️ {countNonConformes} branche(s) avec minima &lt; SMIC ({formatMoney(SMIC)}€)
          </h3>
          <p className="text-sm text-red-700 mt-1">
            Loi du 16 août 2022 : les branches ont <b>45 jours</b> après une revalorisation du SMIC
            pour ouvrir des négociations. Risque de <b>fusion administrative</b> en cas de carence persistante.
          </p>
        </div>
      )}

      {countAVerifier > 0 && (
        <div className={`${darkMode ? 'bg-amber-900/30' : 'bg-amber-50'} border-l-4 border-amber-500 p-4 rounded`}>
          <h3 className="font-semibold text-amber-800">
            🟠 {countAVerifier} branche(s) à vérifier
          </h3>
          <p className="text-sm text-amber-700 mt-1">
            La grille salariale n’a pas été extraite avec une fiabilité suffisante. Ces branches ne sont ni
            considérées conformes, ni classées sous SMIC tant qu’une vérification complémentaire n’a pas été faite.
          </p>
        </div>
      )}

      <div className={`p-3 rounded-2xl space-y-3 ${darkMode ? 'bg-gray-800' : 'bg-white shadow-sm'}`}>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="🔍 Rechercher par nom, IDCC ou effectif..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedBranche(null);
            }}
            className={`flex-1 min-w-[220px] px-3 py-2 rounded-xl border text-sm ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'border-gray-200'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`px-3 py-2 rounded-xl text-sm ${
                darkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              ✕ Effacer
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs font-medium self-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Statut :
            </span>
            {[
              ['all', `Toutes (${cc.branches.length})`],
              ['conforme', `✅ Conformes (${countConformes})`],
              ['non_conforme', `❌ Sous SMIC (${countNonConformes})`],
              ['a_verifier', `🟠 À vérifier (${countAVerifier})`],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setFilter(id);
                  setSelectedBranche(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  filter === id
                    ? id === 'non_conforme'
                      ? 'bg-red-600 text-white'
                      : id === 'a_verifier'
                        ? 'bg-amber-600 text-white'
                        : id === 'conforme'
                          ? 'bg-green-600 text-white'
                          : 'bg-indigo-600 text-white shadow'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Afficher :</span>
            {[30, 50, 'all'].map((n) => (
              <button
                key={n}
                onClick={() => setShowTop(n)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  showTop === n
                    ? 'bg-indigo-600 text-white'
                    : darkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {n === 'all' ? 'Tout' : `Top ${n}`}
              </button>
            ))}
          </div>
        </div>

        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {branchesAffichees.length} branche{branchesAffichees.length > 1 ? 's' : ''} affichée{branchesAffichees.length > 1 ? 's' : ''}
          {branchesTriees.length !== branchesAffichees.length && ` (sur ${branchesTriees.length} filtrées)`}
          {totalEffectifFiltre > 0 && ` · ~${formatEffectif(totalEffectifFiltre)} salariés couverts`}
        </div>
      </div>

      <div className={`rounded-2xl overflow-hidden shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div
          className={`grid grid-cols-12 gap-0 text-xs font-bold uppercase tracking-wide px-3 py-2 border-b ${
            darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}
        >
          {[
            { col: 'idcc', label: 'IDCC', span: 1 },
            { col: 'nom', label: 'Branche', span: 5 },
            { col: 'effectif', label: 'Salariés', span: 2 },
            { col: 'statut', label: 'Statut', span: 2 },
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

        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
          {branchesAffichees.length === 0 && (
            <div className={`text-center py-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Aucune branche trouvée
            </div>
          )}

          {branchesAffichees.map((branche, idx) => {
            const badge = getStatutBadge(branche);
            const isSelected = selectedBranche === idx;
            const rang = rangsParIdcc.get(branche.idcc) || null;
            const firstMin = branche.grille?.[0]?.minimum_mensuel;
            const lastMin = branche.grille?.[branche.grille.length - 1]?.minimum_mensuel;

            return (
              <div key={branche.idcc || idx}>
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
                  <div className="col-span-1 flex items-center">
                    <span className={`font-mono text-xs font-bold ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                      {branche.idcc}
                    </span>
                  </div>

                  <div className="col-span-5 flex items-center gap-2 min-w-0 pr-2">
                    {rang && rang <= 10 && (
                      <span
                        className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          darkMode ? 'bg-amber-800/60 text-amber-300' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        #{rang}
                      </span>
                    )}
                    <span className={`truncate font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {branche.nom}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center">
                    <span className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {formatEffectif(branche.effectif)}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center">
                    {branche.grille && branche.grille.length > 0 ? (
                      <span
                        className={`text-xs ${
                          branche.statut === 'non_conforme'
                            ? 'text-red-500 font-bold'
                            : branche.statut === 'a_verifier'
                              ? 'text-amber-500 font-bold'
                              : darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {formatMoney(firstMin)}€
                        {branche.grille.length > 1 && (
                          <span className="opacity-60"> → {formatMoney(lastMin)}€</span>
                        )}
                      </span>
                    ) : (
                      <span className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>—</span>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <div className={`px-4 py-4 border-t ${
                    darkMode ? 'bg-gray-900/60 border-gray-700' : 'bg-amber-50/50 border-amber-100'
                  }`}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <Card darkMode={darkMode}>
                        <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          Informations branche
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>IDCC</span>
                            <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>{branche.idcc}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Nom</span>
                            <span className={`text-right ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{branche.nom}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Effectif</span>
                            <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                              {formatEffectif(branche.effectif)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Statut</span>
                            <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                              {branche.statut}
                            </span>
                          </div>
                          {branche.derniere_revalorisation && (
                            <div className="flex justify-between gap-3">
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Dernière revalo</span>
                              <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                                {branche.derniere_revalorisation}
                              </span>
                            </div>
                          )}
                          {branche.source && (
                            <div className="pt-2">
                              <a
                                href={branche.source}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-blue-500 hover:underline"
                              >
                                Ouvrir la source ↗
                              </a>
                            </div>
                          )}
                        </div>
                      </Card>

                      <Card darkMode={darkMode}>
                        <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          Qualité de l’extraction
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between gap-3">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Statut extraction</span>
                            <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                              {branche.meta?.extraction_status || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Confiance</span>
                            <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                              {formatConfidence(branche.meta?.confidence) || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Qualité</span>
                            <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                              {branche.meta?.quality || '—'}
                            </span>
                          </div>
                          {branche.meta?.source_donnees && (
                            <div className="flex justify-between gap-3">
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Source données</span>
                              <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                                {branche.meta.source_donnees}
                              </span>
                            </div>
                          )}
                          {branche.meta?.source_path && (
                            <div className="pt-2">
                              <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Bloc détecté
                              </div>
                              <div className={`text-xs rounded-lg p-2 ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700 border'}`}>
                                {branche.meta.source_path}
                              </div>
                            </div>
                          )}
                          {branche.meta?.reason && (
                            <div className={`text-xs rounded-lg p-2 ${darkMode ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                              {branche.meta.reason}
                            </div>
                          )}
                        </div>
                      </Card>

                      <Card darkMode={darkMode}>
                        <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          Lecture SMIC
                        </h3>
                        {branche.grille && branche.grille.length > 0 ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>SMIC net</span>
                              <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>{formatMoney(SMIC)}€</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Niveaux détectés</span>
                              <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                                {branche.grille.length}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Sous SMIC</span>
                              <span className={darkMode ? 'text-gray-200' : 'text-gray-800'}>
                                {getNiveauxSousSmic(branche)}
                              </span>
                            </div>
                            {firstMin != null && (
                              <div className="flex justify-between gap-3">
                                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Écart 1er niveau</span>
                                <span className={
                                  Number(firstMin) < SMIC
                                    ? 'text-red-500 font-semibold'
                                    : Number(firstMin) === SMIC
                                      ? 'text-amber-500 font-semibold'
                                      : 'text-green-500 font-semibold'
                                }>
                                  {getEcartSmic(Number(firstMin)) > 0 ? '+' : ''}
                                  {getEcartSmic(Number(firstMin))}%
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Aucune grille exploitable détectée.
                          </div>
                        )}
                      </Card>
                    </div>

                    <div className="mt-4">
                      <Card darkMode={darkMode}>
                        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            Grille salariale détectée
                          </h3>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {branche.grille?.length || 0} ligne(s)
                          </span>
                        </div>

                        {branche.grille && branche.grille.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className={darkMode ? 'text-gray-400 border-b border-gray-700' : 'text-gray-500 border-b'}>
                                  <th className="text-left py-2 pr-3">Niveau</th>
                                  <th className="text-left py-2 pr-3">Coefficient</th>
                                  <th className="text-right py-2 pr-3">Mensuel</th>
                                  <th className="text-right py-2">Annuel</th>
                                </tr>
                              </thead>
                              <tbody>
                                {branche.grille.map((row, i) => {
                                  const below = Number(row.minimum_mensuel || 0) < SMIC;
                                  return (
                                    <tr
                                      key={`${row.niveau || 'niveau'}-${i}`}
                                      className={darkMode ? 'border-b border-gray-800' : 'border-b border-gray-100'}
                                    >
                                      <td className={`py-2 pr-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                        {row.niveau || '—'}
                                      </td>
                                      <td className={`py-2 pr-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {row.coefficient || '—'}
                                      </td>
                                      <td className={`py-2 pr-3 text-right font-medium ${
                                        below ? 'text-red-500' : darkMode ? 'text-gray-200' : 'text-gray-800'
                                      }`}>
                                        {formatMoney(row.minimum_mensuel)}€
                                      </td>
                                      <td className={`py-2 text-right ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        {row.minimum_annuel != null ? `${formatMoney(row.minimum_annuel)}€` : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Pas de grille structurée disponible pour cette branche.
                          </div>
                        )}

                        {branche.meta?.source_excerpt && (
                          <div className="mt-4">
                            <div className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Extrait source
                            </div>
                            <div className={`text-xs rounded-lg p-3 whitespace-pre-wrap ${
                              darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-700 border'
                            }`}>
                              {branche.meta.source_excerpt}
                            </div>
                          </div>
                        )}
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
