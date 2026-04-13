import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';
import Card from '../components/Card';

const C = {
  primary: '#3b82f6', secondary: '#ef4444', tertiary: '#22c55e',
  quaternary: '#f59e0b', pink: '#ec4899', gray: '#6b7280',
  purple: '#8b5cf6', indigo: '#6366f1', teal: '#14b8a6'
};

const toMensuel = (annuel) => annuel ? Math.round(annuel / 12) : null;

export default function SalairesTab({d, darkMode, fp={}}) {
  const chartProps = useChartProps(darkMode);

  // ── Déciles secteur privé ──────────────────────────────────────────────────
  const deciles = d.deciles_salaires_prives;
  const decilesTrend = deciles?.evolution?.map(e => ({
    annee: e.annee,
    D1: toMensuel(e.d1),
    D5: toMensuel(e.d5),
    D9: toMensuel(e.d9),
  })) ?? [];
  const lastDecile = deciles?.derniere_annee ?? {};
  const d1m = toMensuel(lastDecile.d1);
  const d5m = toMensuel(lastDecile.d5);
  const d9m = toMensuel(lastDecile.d9);

  // ── Fonction publique ──────────────────────────────────────────────────────
  const fp_data = d.indices_fonction_publique;
  const fpTrend = fp_data?.evolution ?? [];

  // ── Rapport interdécile ────────────────────────────────────────────────────
  const interdecile = deciles?.interdecile ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">

      {/* ══════════════════════════════════════════════════════════════════════
          1. Déciles D1/D5/D9 — pleine largeur
      ══════════════════════════════════════════════════════════════════════ */}
      <Card
        title="📊 Structure des salaires — secteur privé (net EQTP)"
        darkMode={darkMode}
        favoriId="deciles_salaires_prives"
        isFavori={fp.isFavori?.("deciles_salaires_prives")}
        toggleFavori={fp.toggleFavori}
        className="md:col-span-2"
      >
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>D1 · 10% les + modestes</p>
            <p className="text-2xl font-bold text-red-500">{d1m ? `${d1m.toLocaleString('fr-FR')}€` : '—'}</p>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>/mois net</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
            <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>D5 · Médiane BTS</p>
            <p className="text-2xl font-bold text-blue-500">{d5m ? `${d5m.toLocaleString('fr-FR')}€` : '—'}</p>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>/mois net</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>D9 · 10% les + aisés</p>
            <p className="text-2xl font-bold text-green-500">{d9m ? `${d9m.toLocaleString('fr-FR')}€` : '—'}</p>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>/mois net</p>
          </div>
        </div>

        {decilesTrend.length > 0 && (
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={decilesTrend}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} />
              <YAxis {...chartProps.yAxis} fontSize={11} tickFormatter={v => `${v}€`} />
              <Tooltip
                {...chartProps.tooltip}
                formatter={(v, name) => [`${v?.toLocaleString('fr-FR')}€/mois`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="D1" stroke={C.secondary}  strokeWidth={2}   dot={false} name="D1 (10% bas)" />
              <Line type="monotone" dataKey="D5" stroke={C.primary}    strokeWidth={2.5} dot={false} name="D5 (médiane)" />
              <Line type="monotone" dataKey="D9" stroke={C.tertiary}   strokeWidth={2}   dot={false} name="D9 (10% haut)" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {lastDecile.annee && (
          <p className={`text-xs text-center mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Données {lastDecile.annee} · Salaires nets annuels en EQTP, secteur privé · Source INSEE Base Tous Salariés
          </p>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          2. Salaire médian (graphique) + Écart H/F
      ══════════════════════════════════════════════════════════════════════ */}

      <Card title="💰 Salaire médian net" darkMode={darkMode} favoriId="salaire_median" isFavori={fp.isFavori?.("salaire_median")} toggleFavori={fp.toggleFavori}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={d.salaire_median.evolution}>
            <CartesianGrid {...chartProps.cartesianGrid} />
            <XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} />
            <YAxis {...chartProps.yAxis} domain={[1800,2300]} fontSize={11} />
            <Tooltip {...chartProps.tooltip} formatter={v=>`${v}€`} />
            <Bar radius={[6, 6, 0, 0]} dataKey="montant" fill={C.primary} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-center text-xl font-bold text-green-600 mt-2">{d.salaire_median.montant_2024}€</p>
      </Card>

      <Card title="👫 Écart H/F (EQTP)" darkMode={darkMode}>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-pink-900/30' : 'bg-pink-50'}`}>
            <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Écart global</p>
            <p className="text-xl font-bold text-pink-600">{d.ecart_hommes_femmes.ecart_global}%</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-pink-900/20' : 'bg-pink-50/60'}`}>
            <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>EQTP</p>
            <p className="text-xl font-bold text-pink-500">{d.ecart_hommes_femmes.ecart_eqtp}%</p>
          </div>
          <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Poste égal</p>
            <p className="text-xl font-bold text-green-600">{d.ecart_hommes_femmes.ecart_poste_comparable}%</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={165}>
          <LineChart data={d.ecart_hommes_femmes.evolution}>
            <CartesianGrid {...chartProps.cartesianGrid} />
            <XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} />
            <YAxis {...chartProps.yAxis} domain={[10,20]} fontSize={11} />
            <Tooltip {...chartProps.tooltip} formatter={v=>`${v}%`} />
            <Line strokeLinecap="round" strokeLinejoin="round" dataKey="ecart" stroke={C.pink} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          3. Fonction Publique ITB + Inégalités salariales
      ══════════════════════════════════════════════════════════════════════ */}

      {fp_data && (
        <Card
          title="🏛️ Indices traitement brut — Fonction Publique"
          darkMode={darkMode}
          favoriId="indices_fp"
          isFavori={fp.isFavori?.("indices_fp")}
          toggleFavori={fp.toggleFavori}
        >
          <div className="grid grid-cols-4 gap-1 mb-3">
            {[
              { label: 'Ensemble', key: 'ensemble', color: 'text-indigo-500', bg: darkMode ? 'bg-indigo-900/30' : 'bg-indigo-50' },
              { label: 'Cat. A',   key: 'cat_a',    color: 'text-blue-500',   bg: darkMode ? 'bg-blue-900/30'   : 'bg-blue-50'   },
              { label: 'Cat. B',   key: 'cat_b',    color: 'text-teal-500',   bg: darkMode ? 'bg-teal-900/30'   : 'bg-teal-50'   },
              { label: 'Cat. C',   key: 'cat_c',    color: 'text-amber-500',  bg: darkMode ? 'bg-amber-900/30'  : 'bg-amber-50'  },
            ].map(({ label, key, color, bg }) => {
              const last = fpTrend.length ? fpTrend[fpTrend.length - 1] : null;
              return (
                <div key={key} className={`text-center p-2 rounded-lg ${bg}`}>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
                  <p className={`text-base font-bold ${color}`}>{last?.[key] ?? '—'}</p>
                </div>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={185}>
            <LineChart data={fpTrend}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartProps.xAxis} fontSize={10} />
              <YAxis {...chartProps.yAxis} fontSize={10} domain={['auto','auto']} />
              <Tooltip {...chartProps.tooltip} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine
                y={100}
                stroke={darkMode ? '#555' : '#ccc'}
                strokeDasharray="4 4"
                label={{ value: 'base 100', fontSize: 9, fill: darkMode ? '#888' : '#aaa' }}
              />
              <Line type="monotone" dataKey="ensemble" stroke={C.indigo}     strokeWidth={2.5} dot={false} name="Ensemble" />
              <Line type="monotone" dataKey="cat_a"    stroke={C.primary}    strokeWidth={1.8} dot={false} name="Cat. A" />
              <Line type="monotone" dataKey="cat_b"    stroke={C.teal}       strokeWidth={1.8} dot={false} name="Cat. B" />
              <Line type="monotone" dataKey="cat_c"    stroke={C.quaternary} strokeWidth={1.8} dot={false} name="Cat. C" />
            </LineChart>
          </ResponsiveContainer>
          <p className={`text-xs text-center mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            Indice grille indiciaire — base 100 en 2000 · Source INSEE BDM 001572130-33
          </p>
        </Card>
      )}

      {interdecile && interdecile.length > 0 && (
        <Card
          title="⚖️ Inégalités salariales (secteur privé)"
          darkMode={darkMode}
          favoriId="interdecile_salaires"
          isFavori={fp.isFavori?.("interdecile_salaires")}
          toggleFavori={fp.toggleFavori}
        >
          {(() => {
            const last = interdecile[interdecile.length - 1];
            return (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ratio D9/D1</p>
                  <p className="text-xl font-bold text-red-500">{last?.d9_d1?.toFixed(2) ?? '—'}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>({last?.annee})</p>
                </div>
                <div className={`text-center p-3 rounded-lg ${darkMode ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                  <p className={`text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ratio D5/D1</p>
                  <p className="text-xl font-bold text-amber-500">{last?.d5_d1?.toFixed(2) ?? '—'}</p>
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>({last?.annee})</p>
                </div>
              </div>
            );
          })()}
          <ResponsiveContainer width="100%" height={175}>
            <LineChart data={interdecile}>
              <CartesianGrid {...chartProps.cartesianGrid} />
              <XAxis dataKey="annee" {...chartProps.xAxis} fontSize={11} />
              <YAxis {...chartProps.yAxis} fontSize={11} domain={['auto','auto']} />
              <Tooltip {...chartProps.tooltip} formatter={(v, name) => [v?.toFixed(2), name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="d9_d1" stroke={C.secondary}  strokeWidth={2.5} dot={false} name="D9/D1" />
              <Line type="monotone" dataKey="d5_d1" stroke={C.quaternary} strokeWidth={2}   dot={false} name="D5/D1" />
            </LineChart>
          </ResponsiveContainer>
          <p className={`text-xs text-center mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            D9/D1 élevé = inégalités fortes · Source INSEE Base Tous Salariés
          </p>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          4. Salaires par secteur + PPV (secondaires)
      ══════════════════════════════════════════════════════════════════════ */}
      <Card title="🏭 Salaires par secteur" darkMode={darkMode} favoriId="salaires_secteur" isFavori={fp.isFavori?.("salaires_secteur")} toggleFavori={fp.toggleFavori}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={d.salaires_secteur} layout="vertical">
            <CartesianGrid {...chartProps.cartesianGrid} />
            <XAxis {...chartProps.xAxis} type="number" fontSize={11} />
            <YAxis {...chartProps.yAxis} dataKey="secteur" type="category" width={70} fontSize={10} />
            <Tooltip {...chartProps.tooltip} formatter={v=>`${v}€`} />
            <Bar radius={[0, 6, 6, 0]} dataKey="salaire" fill={C.primary} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="🎁 PPV" darkMode={darkMode}>
        <div className="grid grid-cols-2 gap-2 p-2">
          <div className={`text-center p-3 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded`}>
            <p className="text-xs">Bénéf. 2023</p>
            <p className="text-xl font-bold text-[#0d4093]">{d.ppv.beneficiaires_2023}%</p>
          </div>
          <div className={`text-center p-3 ${darkMode ? 'bg-orange-900/30' : 'bg-orange-50'} rounded`}>
            <p className="text-xs">Bénéf. 2024</p>
            <p className="text-xl font-bold text-orange-600">{d.ppv.beneficiaires_2024}%</p>
          </div>
          <div className={`text-center p-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} rounded`}>
            <p className="text-xs">Montant moy.</p>
            <p className="text-xl font-bold text-green-600">{d.ppv.montant_moyen}€</p>
          </div>
          <div className={`text-center p-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl`}>
            <p className="text-xs">Total 2024</p>
            <p className="text-xl font-bold">{d.ppv.montant_total_2024}Md€</p>
          </div>
        </div>
      </Card>

      {/* ── Source footer ── */}
      {d.sources_par_onglet?.salaires && (
        <p className="text-xs text-gray-400 text-center mt-4 pt-4 border-t border-gray-200 col-span-2">
          📚 Sources : {d.sources_par_onglet.salaires}
        </p>
      )}
    </div>
  );
}
