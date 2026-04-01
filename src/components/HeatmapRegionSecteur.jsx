import React from 'react';

export default function HeatmapRegionSecteur({ d, darkMode }) {
  const [metrique, setMetrique] = React.useState('precarite');
  const [cellActive, setCellActive] = React.useState(null);
  const [regionFocus, setRegionFocus] = React.useState(null);
  const [secteurFocus, setSecteurFocus] = React.useState(null);

  const regions = d.donnees_regionales?.regions ?? [];
  const SMIC_NET = d.indicateurs_cles?.smic_net ?? 1443;
  const INFLATION_CUM = 15.9;

  const secteursBase = d.salaires_secteur ?? [];
  const emploiSecteurs = d.emploi_secteur?.secteurs ?? [];
  const vaParSecteur = d.partage_va?.par_secteur ?? [];
  const defaillancesParSecteur = d.defaillances?.par_secteur ?? [];

  const matchEmploi = (nom) => {
    if (nom.includes('Industrie'))    return emploiSecteurs.find(e => e.secteur === 'Industrie');
    if (nom.includes('Construction')) return emploiSecteurs.find(e => e.secteur === 'Construction');
    return emploiSecteurs.find(e => e.secteur === 'Tertiaire marchand');
  };
  const matchVA = (nom) => {
    if (nom.includes('Industrie'))    return vaParSecteur.find(v => v.secteur === 'Industrie');
    if (nom.includes('Construction')) return vaParSecteur.find(v => v.secteur === 'Construction');
    if (nom.includes('Info'))         return vaParSecteur.find(v => v.secteur === 'Info-comm');
    if (nom.includes('financier'))    return vaParSecteur.find(v => v.secteur === 'Services march.');
    return vaParSecteur.find(v => v.secteur === 'Commerce');
  };
  const matchDef = (nom) => {
    if (nom.includes('Industrie'))    return defaillancesParSecteur.find(v => v.secteur === 'Industrie');
    if (nom.includes('Construction')) return defaillancesParSecteur.find(v => v.secteur === 'Construction');
    if (nom.includes('Héberg'))       return defaillancesParSecteur.find(v => v.secteur === 'Héberg-resto');
    return defaillancesParSecteur.find(v => v.secteur === 'Services');
  };

  const secteurs = secteursBase.map(s => ({
    nom: s.secteur, salaire: s.salaire, evolSal: s.evolution,
    evolEmploi: matchEmploi(s.secteur)?.evolution_an ?? null,
    partSalVA:  matchVA(s.secteur)?.salaires ?? null,
    ebe:        matchVA(s.secteur)?.ebe ?? null,
    defEvol:    matchDef(s.secteur)?.evolution ?? null,
  }));

  const metriques = [
    {
      id: 'precarite', label: '🔴 Risque précarité',
      desc: 'Combine chômage régional élevé et salaire sectoriel bas — identifie les situations cumulant les difficultés.',
      score: (r, s) => {
        const chomNorm = (r.chomage - 5.8) / (9.2 - 5.8);
        const salNorm  = 1 - (s.salaire - 1979) / (4123 - 1979);
        return chomNorm * 0.55 + salNorm * 0.45;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Faible', '30–55 Modéré', '55–75 Élevé', '> 75 Critique'],
    },
    {
      id: 'pouvoir_achat', label: '💰 Pression pouvoir d\'achat',
      desc: `Salaire sectoriel rapporté à l'inflation cumulée ${INFLATION_CUM}% depuis 2020 et au SMIC. Plus c'est rouge, plus le salarié est sous pression.`,
      score: (r, s) => {
        const proxSmic  = Math.max(0, Math.min(1, 1 - (s.salaire - SMIC_NET) / (4123 - SMIC_NET)));
        const chomFaible = 1 - (r.chomage - 5.8) / (9.2 - 5.8);
        return proxSmic * 0.7 + chomFaible * 0.3;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Confortable', '30–55 Tendu', '55–75 Sous pression', '> 75 Critique'],
    },
    {
      id: 'levier_nego', label: '🎯 Levier de négociation',
      desc: 'Tensions de recrutement × taux de marge EBE — zones où l\'employeur a les moyens d\'augmenter ET en a besoin pour recruter.',
      invertColor: true,
      score: (r, s) => {
        const tensionsNorm = (r.tensions - 52) / (72 - 52);
        const ebeNorm      = s.ebe != null ? (s.ebe - 22) / (38 - 22) : 0.5;
        return tensionsNorm * 0.5 + ebeNorm * 0.5;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Faible levier', '30–55 Modéré', '55–75 Bon levier', '> 75 Fort levier'],
    },
    {
      id: 'fragilite_eco', label: '⚠️ Fragilité économique',
      desc: 'Chômage régional + emploi en recul sectoriel + défaillances en hausse — zones à risque de licenciements.',
      score: (r, s) => {
        const chomNorm   = (r.chomage - 5.8) / (9.2 - 5.8);
        const evolEmploi = s.evolEmploi != null ? Math.max(0, -s.evolEmploi) / 3 : 0.3;
        const defScore   = s.defEvol != null ? Math.min(1, s.defEvol / 15) : 0.3;
        return chomNorm * 0.4 + evolEmploi * 0.35 + defScore * 0.25;
      },
      format: sc => `${(sc * 100).toFixed(0)}/100`,
      legende: ['< 30 Stable', '30–55 Vigilance', '55–75 Fragile', '> 75 Très fragile'],
    },
  ];

  const metriqueActive = metriques.find(m => m.id === metrique);

  const scoreToColor = (score, invert = false, alpha = 0.88) => {
    const palettes = [
      [[34,197,94],[234,179,8],[249,115,22],[239,68,68]],
      [[239,68,68],[249,115,22],[234,179,8],[34,197,94]],
    ];
    const pal = invert ? palettes[1] : palettes[0];
    const idx = score < 0.35 ? 0 : score < 0.6 ? 1 : score < 0.8 ? 2 : 3;
    const [r, g, b] = pal[idx];
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const scoreToLabel = (score, invert = false) => {
    const eff = invert ? 1 - score : score;
    if (eff < 0.35) return { txt: 'Faible',   emoji: '🟢' };
    if (eff < 0.6)  return { txt: 'Modéré',   emoji: '🟡' };
    if (eff < 0.8)  return { txt: 'Élevé',    emoji: '🟠' };
    return                  { txt: 'Critique', emoji: '🔴' };
  };

  const matrice = regions.map(r => secteurs.map(s => metriqueActive.score(r, s)));
  const moyRegion  = regions.map((_, ri) => matrice[ri].reduce((a, b) => a + b, 0) / secteurs.length);
  const moySecteur = secteurs.map((_, si) => matrice.reduce((sum, row) => sum + row[si], 0) / regions.length);
  const regionsTriees = [...regions].map((r, ri) => ({ ...r, _ri: ri, moy: moyRegion[ri] })).sort((a, b) => b.moy - a.moy);

  const cellInfo = cellActive != null ? (() => {
    const { ri, si } = cellActive;
    const r = regions[ri], s = secteurs[si];
    const score = matrice[ri][si];
    const label = scoreToLabel(score, metriqueActive.invertColor);
    const args = [];
    if (metrique === 'precarite') {
      args.push(`Chômage de ${r.chomage}% dans ${r.nom} — parmi les ${r.chomage > 7.5 ? 'plus élevés' : 'plus faibles'} de France`);
      args.push(`Salaire médian de ${s.salaire.toLocaleString('fr-FR')}€ dans ${s.nom} — seulement +${s.salaire - SMIC_NET}€ au-dessus du SMIC net`);
      if (r.chomage > 7.5 && s.salaire < 2500) args.push(`Situation cumulée : insécurité de l'emploi ET salaires bas → priorité syndicale`);
    } else if (metrique === 'pouvoir_achat') {
      args.push(`Avec ${INFLATION_CUM}% d'inflation cumulée depuis 2020, un salaire de ${s.salaire.toLocaleString('fr-FR')}€ perd réellement en pouvoir d'achat`);
      args.push(`Marge au-dessus du SMIC net : +${s.salaire - SMIC_NET}€ — ${s.salaire - SMIC_NET < 400 ? 'très faible, argument fort pour revalorisation' : 'marge existante mais insuffisante'}`);
    } else if (metrique === 'levier_nego') {
      args.push(`Tensions de recrutement : ${r.tensions}% dans ${r.nom} — l'employeur a besoin de fidéliser`);
      if (s.ebe) args.push(`Taux de marge EBE : ${s.ebe}% de la VA — les marges existent pour augmenter les salaires`);
      args.push(`Argument clé : "Vous ne trouvez pas à recruter à ces salaires, c'est le marché qui parle"`);
    } else if (metrique === 'fragilite_eco') {
      args.push(`Chômage régional : ${r.chomage}% — ${r.chomage > 8 ? 'contexte difficile, vigilance sur les emplois' : 'marché relativement sain'}`);
      if (s.evolEmploi != null) args.push(`Emploi sectoriel : ${s.evolEmploi >= 0 ? '+' : ''}${s.evolEmploi}%/an — ${s.evolEmploi < 0 ? 'recul préoccupant' : 'dynamique positive'}`);
      if (s.defEvol != null) args.push(`Défaillances dans ce secteur : +${s.defEvol}% — ${s.defEvol > 8 ? 'signal d\'alarme' : 'évolution contenue'}`);
    }
    return { r, s, score, label, args };
  })() : null;

  return (
    <div className="space-y-5 mt-2">

      {/* Sélecteur de métrique */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {metriques.map(m => (
          <button key={m.id} onClick={() => { setMetrique(m.id); setCellActive(null); }}
            className={`text-left p-3 rounded-2xl border text-xs transition-all duration-200 ${
              metrique === m.id
                ? 'ring-2 ring-rose-500 ' + (darkMode ? 'bg-rose-900/40 border-rose-700 text-white' : 'bg-rose-50 border-rose-300 text-rose-900')
                : darkMode ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
            }`}>
            <div className="font-semibold mb-0.5">{m.label}</div>
            <div className={`leading-tight ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} style={{fontSize:'10px'}}>
              {m.desc.slice(0, 62)}…
            </div>
          </button>
        ))}
      </div>

      {/* Description + légende */}
      <div className={`p-3 rounded-xl text-xs ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
        <strong>{metriqueActive.label} :</strong> {metriqueActive.desc}
      </div>
      <div className="flex flex-wrap gap-3 items-center text-xs">
        <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Légende :</span>
        {metriqueActive.legende.map((l, i) => {
          const scores = [0.15, 0.47, 0.68, 0.9];
          return (
            <span key={i} className="flex items-center gap-1 font-medium" style={{color: scoreToColor(scores[i], metriqueActive.invertColor, 1)}}>
              <span className="w-3 h-3 rounded" style={{backgroundColor: scoreToColor(scores[i], metriqueActive.invertColor, 0.85)}}></span>
              {l}
            </span>
          );
        })}
        <span className={`ml-auto italic ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} style={{fontSize:'10px'}}>
          Cliquez sur une cellule pour les arguments de négociation
        </span>
      </div>

      {/* Heatmap */}
      <div className={`rounded-2xl overflow-hidden shadow-xl ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{minWidth:560}}>
            <thead>
              <tr>
                <th className={`sticky left-0 z-20 p-3 text-left border-b border-r text-xs font-semibold ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  Région ↓ / Secteur →
                </th>
                {secteurs.map((s, si) => (
                  <th key={si}
                    onClick={() => setSecteurFocus(secteurFocus === si ? null : si)}
                    className={`p-2 text-center border-b cursor-pointer transition-colors ${
                      secteurFocus === si
                        ? darkMode ? 'bg-indigo-900/50 border-indigo-700' : 'bg-indigo-50 border-indigo-300'
                        : darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className={`text-[10px] font-semibold leading-tight ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {s.nom.length > 12 ? s.nom.slice(0,11)+'…' : s.nom}
                    </div>
                    <div className={`text-[9px] mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {s.salaire.toLocaleString('fr-FR')}€
                    </div>
                    <div className="mt-1 mx-auto h-1.5 rounded-full overflow-hidden w-10" style={{backgroundColor: darkMode ? '#374151' : '#e5e7eb'}}>
                      <div className="h-full rounded-full" style={{width:`${moySecteur[si]*100}%`, backgroundColor: scoreToColor(moySecteur[si], metriqueActive.invertColor, 1)}}/>
                    </div>
                  </th>
                ))}
                <th className={`p-2 text-center border-b border-l text-[10px] font-semibold ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  Score moy.
                </th>
              </tr>
            </thead>
            <tbody>
              {regionsTriees.map(({ _ri: ri, ...region }, rowIdx) => {
                const isRegFocus = regionFocus === ri;
                const rowBg = darkMode
                  ? isRegFocus ? 'bg-indigo-900/30' : rowIdx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/40'
                  : isRegFocus ? 'bg-indigo-50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
                return (
                  <tr key={ri} className={`${rowBg} transition-colors`}>
                    <td
                      onClick={() => setRegionFocus(regionFocus === ri ? null : ri)}
                      className={`sticky left-0 z-10 p-2 border-r cursor-pointer ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${rowBg}`}>
                      <div className={`text-xs font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        {region.nom.length > 20 ? region.nom.slice(0,19)+'…' : region.nom}
                      </div>
                      <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        Chôm. {region.chomage}% · {region.salaire_median?.toLocaleString('fr-FR')}€
                      </div>
                    </td>
                    {secteurs.map((s, si) => {
                      const score = matrice[ri][si];
                      const isActive = cellActive?.ri === ri && cellActive?.si === si;
                      const isFaded  = (regionFocus != null && regionFocus !== ri) || (secteurFocus != null && secteurFocus !== si);
                      return (
                        <td key={si} className="p-1">
                          <div
                            onClick={() => setCellActive(isActive ? null : { ri, si })}
                            className={`flex items-center justify-center rounded-xl cursor-pointer font-bold text-white transition-all duration-150 select-none ${
                              isActive ? 'ring-2 ring-white ring-offset-1 scale-110 z-10 relative shadow-lg' : 'hover:scale-105'
                            } ${isFaded ? 'opacity-25' : ''}`}
                            style={{height:44, backgroundColor: scoreToColor(score, metriqueActive.invertColor), fontSize:11}}>
                            {metriqueActive.format(score)}
                          </div>
                        </td>
                      );
                    })}
                    <td className={`p-1 border-l ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="mx-auto rounded-xl flex items-center justify-center font-bold text-white text-xs"
                        style={{height:44, width:52, backgroundColor: scoreToColor(moyRegion[ri], metriqueActive.invertColor, 0.75)}}>
                        {(moyRegion[ri]*100).toFixed(0)}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className={`border-t ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'}`}>
                <td className={`sticky left-0 z-10 p-2 text-xs font-semibold ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  Moy. secteur
                </td>
                {secteurs.map((_, si) => (
                  <td key={si} className="p-1">
                    <div className="mx-auto rounded-xl flex items-center justify-center font-bold text-white text-xs"
                      style={{height:32, backgroundColor: scoreToColor(moySecteur[si], metriqueActive.invertColor, 0.65)}}>
                      {(moySecteur[si]*100).toFixed(0)}
                    </div>
                  </td>
                ))}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Panneau détail cellule */}
      {cellInfo && (
        <div className={`rounded-2xl p-5 border ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} shadow-xl`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className={`font-black text-base ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {cellInfo.r.nom} <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>×</span> {cellInfo.s.nom}
              </h4>
              <p className="text-sm mt-0.5" style={{color: scoreToColor(cellInfo.score, metriqueActive.invertColor, 1)}}>
                {cellInfo.label.emoji} {cellInfo.label.txt} — Score {metriqueActive.format(cellInfo.score)}
              </p>
            </div>
            <button onClick={() => setCellActive(null)}
              className={`p-2 rounded-xl text-lg leading-none ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-400'}`}>✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Chômage',        val: `${cellInfo.r.chomage}%`,                              icon: '📉' },
              { label: 'Salaire sect.',  val: `${cellInfo.s.salaire.toLocaleString('fr-FR')}€`,     icon: '💰' },
              { label: 'Tensions recrut.', val: `${cellInfo.r.tensions}%`,                           icon: '🎯' },
              { label: 'Taux marge EBE', val: cellInfo.s.ebe != null ? `${cellInfo.s.ebe}%` : '—', icon: '📊' },
            ].map((kpi, i) => (
              <div key={i} className={`p-3 rounded-xl text-center ${darkMode ? 'bg-gray-700/60' : 'bg-gray-100'}`}>
                <div className="text-lg">{kpi.icon}</div>
                <div className={`text-sm font-bold mt-0.5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{kpi.val}</div>
                <div className={`text-[10px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.label}</div>
              </div>
            ))}
          </div>
          <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
              💬 Arguments pour la négociation — {cellInfo.r.nom} / {cellInfo.s.nom}
            </p>
            <ul className={`text-xs space-y-2 ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
              {cellInfo.args.map((arg, i) => (
                <li key={i} className="flex gap-2"><span className="shrink-0 opacity-60">▸</span><span>{arg}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Top 5 priorités */}
      <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h4 className={`font-bold text-sm mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          🔴 Top 5 situations à traiter en priorité
        </h4>
        <div className="space-y-2">
          {(() => {
            const all = [];
            regions.forEach((r, ri) => secteurs.forEach((s, si) => { all.push({ r, s, score: matrice[ri][si] }); }));
            return all.sort((a, b) => b.score - a.score).slice(0, 5).map((item, i) => (
              <div key={i} className={`flex items-center justify-between gap-3 p-2.5 rounded-xl text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{backgroundColor: scoreToColor(item.score, metriqueActive.invertColor)}}>
                    {i+1}
                  </span>
                  <span className={`font-semibold truncate ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.r.nom}</span>
                  <span className={`shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>×</span>
                  <span className={`truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.s.nom}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`hidden sm:inline ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Chôm. {item.r.chomage}% · {item.s.salaire.toLocaleString('fr-FR')}€
                  </span>
                  <span className="font-bold px-2 py-0.5 rounded-lg text-white text-[11px]"
                    style={{backgroundColor: scoreToColor(item.score, metriqueActive.invertColor)}}>
                    {metriqueActive.format(item.score)}
                  </span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Guide formateur */}
      <div className={`p-4 rounded-xl text-xs ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
        <strong className={darkMode ? 'text-gray-300' : 'text-gray-700'}>🎓 Guide formateur :</strong>
        {' '}Commencez par <em>Risque précarité</em> pour une vue d'ensemble. Utilisez <em>Levier de négociation</em> pour cibler où l'employeur a les moyens d'augmenter. Cliquez sur une région ou un secteur pour filtrer. Cliquez sur une cellule pour les arguments prêts à l'emploi.
      </div>

      <p className={`text-xs text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📚 Sources : INSEE (chômage, salaires T3 2025) · DARES-BMO (tensions 2025) · Banque de France (défaillances) · INSEE comptes nationaux (partage VA)
      </p>
    </div>
  );
}
