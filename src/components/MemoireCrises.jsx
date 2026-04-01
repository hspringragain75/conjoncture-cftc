import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useChartProps } from '../hooks/useChartProps';

export default function MemoireCrises({ darkMode }) {
  const CRISES = [
    {
      id: 'c1929', annee: 1929, label: 'Grande Dépression', emoji: '💀',
      couleur: '#7c2d12', couleurLight: '#fed7aa',
      periode: '1929 – 1939',
      accroche: 'Le système bancaire mondial s\'effondre en 3 ans.',
      contexte: 'Le krach boursier d\'octobre 1929 ("Jeudi Noir") déclenche une spirale déflationniste mondiale. Les banques ferment en cascade, la production industrielle chute de 50%, un tiers des Américains se retrouvent sans emploi.',
      vecu: 'Des millions de familles font la queue devant les soupes populaires. Les agriculteurs brûlent leurs récoltes faute d\'acheteurs. Des villes de baraquements ("Hoovervilles") poussent dans les parcs. Le salaire moyen s\'effondre de 40%.',
      tournant: 'Le New Deal de Roosevelt (1933) et la Seconde Guerre mondiale relancent l\'économie.',
      indicateurs: {
        chomage: [3, 8, 15, 23, 25, 22, 17, 14, 19, 17],
        pib:     [0, -8, -6, -13, -1, 11, 9, 5, -3, 8],
        inflation:[-1,-6,-9,-10, 0, 1, 3, 1,-2, 0],
        bourses: [100, 66, 45, 28, 35, 55, 70, 80, 65, 85],
        defaillances:[100,130,180,240,200,160,140,130,150,120],
      },
      annees: ['1929','1930','1931','1932','1933','1934','1935','1936','1937','1938'],
    },
    {
      id: 'c1973', annee: 1973, label: 'Choc pétrolier', emoji: '🛢️',
      couleur: '#713f12', couleurLight: '#fef08a',
      periode: '1973 – 1979',
      accroche: 'Le prix du pétrole quadruple en 3 mois.',
      contexte: 'L\'embargo pétrolier de l\'OPEP (octobre 1973) en représailles à la guerre du Kippour fait passer le baril de 3$ à 12$ en quelques semaines. Les économies occidentales découvrent leur dépendance au pétrole.',
      vecu: 'Dimanches sans voiture imposés en France et en Allemagne. Stations-service à sec. Les factures d\'énergie doublent. Les industries énergivores licencient massivement. La stagflation — inflation + chômage simultanés — brise les certitudes keynésiennes.',
      tournant: 'Le second choc pétrolier de 1979 (révolution iranienne) enfonce les économies. La déréglementation thatcherienne et reaganienne émerge en réponse.',
      indicateurs: {
        chomage: [2.8, 3.1, 2.9, 4.0, 4.5, 4.2, 4.8, 5.1, 5.3, 5.0],
        pib:     [5.4, 5.2, 4.8, -0.5, 2.1, 3.0, 2.8, 4.0, 3.1, 3.8],
        inflation:[5.9, 7.5, 9.1, 13.4, 11.0, 9.1, 7.0, 6.5, 7.6, 9.0],
        bourses: [100, 85, 72, 58, 70, 82, 90, 100, 95, 88],
        defaillances:[100,105,110,135,140,130,125,120,118,115],
      },
      annees: ['1972','1973','1974','1975','1976','1977','1978','1979','1980','1981'],
    },
    {
      id: 'c1987', annee: 1987, label: 'Krach boursier', emoji: '📉',
      couleur: '#1e3a8a', couleurLight: '#bfdbfe',
      periode: 'Octobre 1987',
      accroche: 'En un seul jour, Wall Street perd 22%.',
      contexte: 'Le "Lundi Noir" du 19 octobre 1987 voit le Dow Jones s\'effondrer de 22,6% — la plus forte chute en un jour de l\'histoire. Les marchés mondiaux suivent. La panique se diffuse à la vitesse des ordinateurs de trading.',
      vecu: 'Les traders pleurent sur les parquets boursiers. Des fortunes s\'évaporent en heures. Pourtant, l\'économie réelle résiste mieux qu\'en 1929 : la Fed injecte massivement des liquidités. La récession est évitée. Le "krach éclair" préfigure l\'ère des krachs algorithmiques.',
      tournant: 'La reprise est rapide — dès 1988 les marchés rebondissent. Mais la leçon sur le risque systémique est ignorée.',
      indicateurs: {
        chomage: [7.0, 6.2, 5.5, 5.3, 5.5, 5.6, 5.4, 5.2, 5.0, 4.9],
        pib:     [3.5, 3.5, 4.1, 3.6, 3.5, 2.5, 1.9, 3.7, 4.2, 3.7],
        inflation:[3.2, 3.6, 1.9, 3.6, 4.1, 4.8, 5.4, 4.2, 3.0, 3.0],
        bourses: [100, 120, 145, 115, 120, 135, 155, 165, 180, 200],
        defaillances:[100, 95, 90, 95, 100, 98, 95, 90, 85, 80],
      },
      annees: ['1985','1986','1987','1988','1989','1990','1991','1992','1993','1994'],
    },
    {
      id: 'c2000', annee: 2000, label: 'Bulle internet', emoji: '💻',
      couleur: '#5b21b6', couleurLight: '#ddd6fe',
      periode: '2000 – 2002',
      accroche: 'Des milliards s\'évaporent sur des entreprises sans revenus.',
      contexte: 'Le Nasdaq avait été multiplié par 5 en 5 ans. En mars 2000, la bulle éclate. Des centaines d\'entreprises ".com" valorisées à des milliards font faillite. L\'indice Nasdaq perd 78% de sa valeur en 2 ans.',
      vecu: 'Des ingénieurs en informatique licenciés par dizaines de milliers. Des actionnaires qui avaient misé leurs économies sur Webvan, Pets.com, Boo.com se retrouvent ruinés. Silicon Valley connaît sa première récession sévère. Les plans stock-options ne valent plus rien.',
      tournant: 'Les attentats du 11 septembre 2001 aggravent le choc. La Fed baisse massivement ses taux — semant les graines de la crise de 2008.',
      indicateurs: {
        chomage: [4.0, 3.9, 4.0, 4.5, 5.7, 6.0, 5.8, 5.5, 5.1, 4.6],
        pib:     [4.1, 4.7, 4.1, 1.0, 1.8, 2.8, 3.8, 3.5, 3.1, 2.9],
        inflation:[2.2, 2.0, 3.4, 2.8, 1.6, 2.3, 2.7, 3.4, 3.2, 2.5],
        bourses: [150, 200, 180, 115, 85, 75, 90, 105, 130, 150],
        defaillances:[100, 95, 105, 130, 150, 140, 125, 110, 100, 90],
      },
      annees: ['1998','1999','2000','2001','2002','2003','2004','2005','2006','2007'],
    },
    {
      id: 'c2008', annee: 2008, label: 'Crise financière', emoji: '🏦',
      couleur: '#7f1d1d', couleurLight: '#fecaca',
      periode: '2008 – 2012',
      accroche: 'La faillite de Lehman Brothers paralyse le système financier mondial.',
      contexte: 'La crise des subprimes américains contamine les banques mondiales via des produits financiers toxiques. Le 15 septembre 2008, Lehman Brothers s\'effondre. Le crédit mondial se fige. Les gouvernements injectent des milliers de milliards pour éviter l\'effondrement du système.',
      vecu: 'Des millions de familles américaines perdent leur maison. En Europe, les plans d\'austérité dévastent la Grèce, l\'Espagne, le Portugal. Le chômage des jeunes dépasse 50% en Grèce. En France, les défaillances d\'entreprises explosent. Le mot "bail-out" (sauvetage bancaire) entre dans le vocabulaire commun.',
      tournant: 'La crise de la dette souveraine européenne (2011-2012) prolonge les souffrances. La BCE de Draghi ("whatever it takes", 2012) stoppe la spirale.',
      indicateurs: {
        chomage: [4.6, 4.4, 5.8, 9.3, 9.6, 8.9, 8.1, 7.4, 6.7, 5.3],
        pib:     [2.9, 1.9, -0.1, -2.5, 2.6, 1.6, 2.2, 1.7, 2.5, 2.9],
        inflation:[4.1, 0.1, 2.7, 1.5, 3.0, 2.1, 1.5, 1.6, 0.1, 1.3],
        bourses: [160, 145, 80, 65, 90, 105, 120, 130, 140, 165],
        defaillances:[100, 120, 165, 200, 180, 155, 130, 110, 100, 85],
      },
      annees: ['2006','2007','2008','2009','2010','2011','2012','2013','2014','2015'],
    },
    {
      id: 'c2020', annee: 2020, label: 'Covid-19', emoji: '🦠',
      couleur: '#064e3b', couleurLight: '#a7f3d0',
      periode: '2020 – 2022',
      accroche: 'L\'économie mondiale mise à l\'arrêt en 3 semaines.',
      contexte: 'La pandémie de Covid-19 provoque les confinements simultanés de 4 milliards de personnes. Le PIB mondial chute de 3,1% en 2020 — pire récession depuis 1929. Les gouvernements injectent des sommes inédites : 14 000 milliards de dollars en aides mondiales.',
      vecu: 'Des millions de salariés en chômage partiel. Des secteurs entiers à l\'arrêt : tourisme, restauration, aviation, spectacle. En France, 85% des salariés en télétravail forcé du jour au lendemain. Les soignants en première ligne sans équipements. Puis l\'inflation post-Covid (chaînes d\'approvisionnement brisées, demande refoulée, guerre en Ukraine) dévore le pouvoir d\'achat.',
      tournant: 'Le rebond de 2021 (+5.9% mondial) est historique. Mais l\'inflation déclenche la plus forte hausse des taux depuis 40 ans (BCE : de 0% à 4.5% en 18 mois).',
      indicateurs: {
        chomage: [3.5, 3.5, 8.1, 5.4, 3.9, 3.7, 3.6, 3.7, 4.0, 4.2],
        pib:     [2.3, 2.5, -3.1, 5.9, 3.5, 3.1, 2.4, 1.5, 0.9, 1.1],
        inflation:[2.3, 2.5, 0.8, 4.7, 8.8, 6.8, 4.2, 2.8, 2.0, 1.5],
        bourses: [120, 135, 115, 155, 175, 160, 150, 145, 155, 165],
        defaillances:[90, 85, 65, 90, 110, 130, 150, 160, 155, 140],
      },
      annees: ['2018','2019','2020','2021','2022','2023','2024','2025','2026p','2027p'],
    },
  ];

  const INDICATEURS_DEF = [
    { id: 'chomage',     label: 'Chômage (%)',              color: '#3b82f6', unite: '%'  },
    { id: 'pib',         label: 'Croissance PIB (%)',        color: '#22c55e', unite: '%'  },
    { id: 'inflation',   label: 'Inflation (%)',             color: '#f97316', unite: '%'  },
    { id: 'bourses',     label: 'Marchés (base 100)',        color: '#a855f7', unite: ''   },
    { id: 'defaillances',label: 'Défaillances (base 100)',   color: '#ef4444', unite: ''   },
  ];

  const [criseActive, setCriseActive] = useState(CRISES[4]); // 2008 par défaut
  const [indActifs, setIndActifs] = useState({ chomage:true, pib:true, inflation:false, bourses:false, defaillances:false });
  const [animStep, setAnimStep] = useState(9);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = React.useRef(null);

  // Lancer l'animation quand on change de crise
  useEffect(() => {
    setAnimStep(0);
    setIsPlaying(true);
  }, [criseActive.id]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setAnimStep(s => {
          if (s >= criseActive.annees.length - 1) {
            setIsPlaying(false);
            clearInterval(intervalRef.current);
            return s;
          }
          return s + 1;
        });
      }, 300);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, criseActive]);

  // Calcul du min/max pour l'axe Y par indicateur
  const getRange = (indId) => {
    const vals = criseActive.indicateurs[indId];
    const min = Math.min(...vals), max = Math.max(...vals);
    const pad = (max - min) * 0.15 || 5;
    return [min - pad, max + pad];
  };

  // Composant mini sparkline animé via SVG inline
  const AnimChart = ({ indId, color, label, unite }) => {
    const vals = criseActive.indicateurs[indId];
    const annees = criseActive.annees;
    const [yMin, yMax] = getRange(indId);
    const W = 280, H = 90, PAD = { t:12, r:8, b:24, l:36 };
    const cW = W - PAD.l - PAD.r;
    const cH = H - PAD.t - PAD.b;

    const xScale = i => PAD.l + (i / (vals.length - 1)) * cW;
    const yScale = v => PAD.t + cH - ((v - yMin) / (yMax - yMin)) * cH;

    const visibleVals = vals.slice(0, animStep + 1);
    const points = visibleVals.map((v, i) => `${xScale(i).toFixed(1)},${yScale(v).toFixed(1)}`).join(' ');
    const lastX = xScale(animStep);
    const lastY = yScale(vals[animStep]);

    // Zone de remplissage
    const areaPoints = visibleVals.length > 1
      ? `${xScale(0)},${PAD.t + cH} ${points} ${lastX},${PAD.t + cH}`
      : '';

    const crisisX = xScale(2); // 3ème année = sommet/creux de crise

    return (
      <div className={`rounded-xl p-3 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-semibold" style={{ color }}>{label}</span>
          <span className="text-sm font-black" style={{ color }}>
            {vals[animStep]?.toFixed(1)}{unite}
          </span>
        </div>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* Ligne zéro si pertinent */}
          {yMin < 0 && yMax > 0 && (
            <line x1={PAD.l} y1={yScale(0)} x2={PAD.l + cW} y2={yScale(0)}
              stroke={darkMode ? '#374151' : '#e5e7eb'} strokeWidth="1" strokeDasharray="3,3" />
          )}
          {/* Marqueur année de crise */}
          <line x1={crisisX} y1={PAD.t} x2={crisisX} y2={PAD.t + cH}
            stroke={criseActive.couleur} strokeWidth="1.5" strokeDasharray="4,2" opacity="0.6" />

          {/* Aire */}
          {areaPoints && (
            <polygon points={areaPoints} fill={color} opacity="0.08" />
          )}

          {/* Courbe */}
          {visibleVals.length > 1 && (
            <polyline fill="none" stroke={color} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" points={points} />
          )}

          {/* Point actuel */}
          <circle cx={lastX} cy={lastY} r="4" fill={color} stroke={darkMode ? '#111827' : '#fff'} strokeWidth="2" />

          {/* Axe X — années */}
          {annees.filter((_, i) => i % 3 === 0 || i === 0 || i === annees.length - 1).map((a, _, arr) => {
            const origIdx = annees.indexOf(a);
            return (
              <text key={a} x={xScale(origIdx)} y={H - 4}
                textAnchor="middle" fontSize="8"
                fill={darkMode ? '#4b5563' : '#9ca3af'}>
                {a}
              </text>
            );
          })}

          {/* Axe Y — min/max */}
          <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fontSize="8" fill={darkMode ? '#4b5563' : '#9ca3af'}>{yMax.toFixed(0)}</text>
          <text x={PAD.l - 2} y={PAD.t + cH} textAnchor="end" fontSize="8" fill={darkMode ? '#4b5563' : '#9ca3af'}>{yMin.toFixed(0)}</text>
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-4">

      {/* ── Frise chronologique ── */}
      <div className={`rounded-2xl p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h3 className={`text-sm font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
          🕯️ Grandes crises économiques — cliquez pour explorer
        </h3>
        <div className="relative">
          {/* Ligne du temps */}
          <div className={`absolute top-5 left-0 right-0 h-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />

          <div className="flex justify-between relative">
            {CRISES.map((c) => (
              <button key={c.id}
                onClick={() => { setCriseActive(c); }}
                className="flex flex-col items-center gap-1 group relative"
                style={{ minWidth: '60px' }}>

                {/* Bulle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 border-2 z-10 ${
                  criseActive.id === c.id
                    ? 'scale-125 shadow-lg border-white'
                    : 'scale-100 border-transparent opacity-70 hover:opacity-100 hover:scale-110'
                }`}
                  style={{ backgroundColor: criseActive.id === c.id ? c.couleur : (darkMode ? '#374151' : '#f3f4f6') }}>
                  {c.emoji}
                </div>

                {/* Année */}
                <span className={`text-xs font-bold transition-colors ${
                  criseActive.id === c.id ? '' : (darkMode ? 'text-gray-400' : 'text-gray-500')
                }`} style={{ color: criseActive.id === c.id ? c.couleur : undefined }}>
                  {c.annee}
                </span>

                {/* Label */}
                <span className={`text-[10px] text-center leading-tight max-w-[60px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {c.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Panneau principal de la crise ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Contexte narratif */}
        <div className="space-y-3">
          {/* En-tête crise */}
          <div className="rounded-2xl p-5 text-white"
            style={{ background: `linear-gradient(135deg, ${criseActive.couleur}, ${criseActive.couleur}cc)` }}>
            <div className="flex items-start gap-3">
              <span className="text-4xl">{criseActive.emoji}</span>
              <div>
                <div className="text-xs opacity-70 mb-0.5">{criseActive.periode}</div>
                <h3 className="text-xl font-black">{criseActive.label}</h3>
                <p className="text-sm opacity-90 mt-1 font-medium italic">"{criseActive.accroche}"</p>
              </div>
            </div>
          </div>

          {/* Ce qui s'est passé */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              📋 Ce qui s'est passé
            </p>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {criseActive.contexte}
            </p>
          </div>

          {/* Ce que vivaient les gens */}
          <div className="rounded-2xl p-4"
            style={{ backgroundColor: criseActive.couleur + (darkMode ? '30' : '15'), borderLeft: `4px solid ${criseActive.couleur}` }}>
            <p className="text-xs font-bold mb-2" style={{ color: criseActive.couleur }}>
              👥 Ce que vivaient les gens
            </p>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {criseActive.vecu}
            </p>
          </div>

          {/* Tournant */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              🔄 Le tournant
            </p>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {criseActive.tournant}
            </p>
          </div>
        </div>

        {/* Graphiques animés */}
        <div className="space-y-3">

          {/* Contrôles animation */}
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                📈 Évolution des indicateurs — {criseActive.annees[animStep]}
              </span>
              <div className="flex gap-2">
                <button onClick={() => { setAnimStep(0); setIsPlaying(true); }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isPlaying ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}>
                  {isPlaying ? '⏸ Pause' : animStep === criseActive.annees.length - 1 ? '↺ Rejouer' : '▶ Play'}
                </button>
              </div>
            </div>

            {/* Barre de progression */}
            <div className={`h-1.5 rounded-full mb-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${((animStep) / (criseActive.annees.length - 1)) * 100}%`,
                  backgroundColor: criseActive.couleur,
                }} />
            </div>

            {/* Toggle indicateurs */}
            <div className="flex flex-wrap gap-1.5">
              {INDICATEURS_DEF.map(ind => (
                <button key={ind.id}
                  onClick={() => setIndActifs(prev => ({ ...prev, [ind.id]: !prev[ind.id] }))}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                    indActifs[ind.id] ? 'text-white border-transparent' : (darkMode ? 'bg-gray-700 text-gray-500 border-gray-600' : 'bg-white text-gray-400 border-gray-200')
                  }`}
                  style={{ backgroundColor: indActifs[ind.id] ? ind.color : undefined }}>
                  {ind.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 gap-2">
            {INDICATEURS_DEF.filter(ind => indActifs[ind.id]).map(ind => (
              <AnimChart key={`${criseActive.id}-${ind.id}`}
                indId={ind.id} color={ind.color} label={ind.label} unite={ind.unite} />
            ))}
            {Object.values(indActifs).every(v => !v) && (
              <div className={`rounded-xl p-6 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Sélectionnez au moins un indicateur
              </div>
            )}
          </div>
        </div>
      </div>

      <p className={`text-xs text-center ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        📚 Sources : FMI, Banque mondiale, OCDE, INSEE — Données historiques reconstituées · Certaines séries sont des estimations
      </p>
    </div>
  );
}
