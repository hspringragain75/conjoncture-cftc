import React, { useEffect } from 'react';

export default function GlobeTab({ darkMode }) {
  const canvasRef = React.useRef(null);
  const [indicateur, setIndicateur] = React.useState('chomage');
  const [pays, setPays] = React.useState(null);
  const [geoData, setGeoData] = React.useState(null);
  const isDragging = React.useRef(false);
  const lastPos = React.useRef([0, 0]);
  const rotRef = React.useRef([0, 0]);
  const velRef = React.useRef([0, 0]);
  const rafRef = React.useRef(null);
  const dRef = React.useRef(null);
  const projRef = React.useRef(null);
  const [loadError, setLoadError] = React.useState(null);

  const PAYS_DATA = {
    'France':{'iso':'FRA',chomage:7.7,inflation:0.9,pib:1.1,smic:1802,gini:31.5},
    'Germany':{'iso':'DEU',chomage:3.4,inflation:2.2,pib:-0.2,smic:2054,gini:31.7},
    'Spain':{'iso':'ESP',chomage:11.6,inflation:2.8,pib:3.2,smic:1323,gini:33.0},
    'Italy':{'iso':'ITA',chomage:6.2,inflation:1.1,pib:0.7,smic:null,gini:34.8},
    'Netherlands':{'iso':'NLD',chomage:3.7,inflation:2.7,pib:0.9,smic:2070,gini:28.2},
    'Belgium':{'iso':'BEL',chomage:5.5,inflation:3.1,pib:1.4,smic:2070,gini:27.2},
    'Sweden':{'iso':'SWE',chomage:8.5,inflation:1.7,pib:0.5,smic:null,gini:27.6},
    'Poland':{'iso':'POL',chomage:2.9,inflation:4.7,pib:2.9,smic:925,gini:30.2},
    'Portugal':{'iso':'PRT',chomage:6.4,inflation:2.3,pib:2.1,smic:1020,gini:33.5},
    'Greece':{'iso':'GRC',chomage:11.0,inflation:3.0,pib:2.3,smic:910,gini:32.9},
    'Austria':{'iso':'AUT',chomage:5.3,inflation:2.9,pib:-1.0,smic:null,gini:30.8},
    'Switzerland':{'iso':'CHE',chomage:2.6,inflation:1.1,pib:1.3,smic:null,gini:33.5},
    'Norway':{'iso':'NOR',chomage:3.9,inflation:3.1,pib:0.8,smic:null,gini:26.1},
    'Denmark':{'iso':'DNK',chomage:2.6,inflation:2.4,pib:1.5,smic:null,gini:28.3},
    'Finland':{'iso':'FIN',chomage:7.5,inflation:0.5,pib:-1.0,smic:null,gini:27.7},
    'Romania':{'iso':'ROU',chomage:5.6,inflation:5.6,pib:2.0,smic:760,gini:34.8},
    'Hungary':{'iso':'HUN',chomage:4.1,inflation:3.7,pib:0.6,smic:701,gini:28.0},
    'Czechia':{'iso':'CZE',chomage:2.6,inflation:2.0,pib:1.2,smic:870,gini:25.3},
    'United States of America':{'iso':'USA',chomage:4.1,inflation:2.9,pib:2.8,smic:1160,gini:41.5},
    'Canada':{'iso':'CAN',chomage:6.8,inflation:1.8,pib:1.3,smic:1580,gini:33.3},
    'Brazil':{'iso':'BRA',chomage:6.2,inflation:4.8,pib:3.1,smic:325,gini:52.0},
    'Mexico':{'iso':'MEX',chomage:2.8,inflation:4.2,pib:1.5,smic:270,gini:45.4},
    'Argentina':{'iso':'ARG',chomage:7.0,inflation:118.0,pib:-1.7,smic:320,gini:42.0},
    'Chile':{'iso':'CHL',chomage:8.6,inflation:4.5,pib:2.3,smic:540,gini:44.9},
    'Colombia':{'iso':'COL',chomage:9.5,inflation:5.2,pib:1.7,smic:310,gini:54.8},
    'China':{'iso':'CHN',chomage:5.0,inflation:0.3,pib:5.0,smic:360,gini:38.2},
    'Japan':{'iso':'JPN',chomage:2.5,inflation:2.8,pib:0.1,smic:1020,gini:32.9},
    'South Korea':{'iso':'KOR',chomage:3.0,inflation:2.3,pib:2.1,smic:1480,gini:31.4},
    'India':{'iso':'IND',chomage:7.8,inflation:4.9,pib:6.8,smic:120,gini:35.7},
    'Indonesia':{'iso':'IDN',chomage:4.8,inflation:2.8,pib:5.1,smic:230,gini:38.2},
    'Turkey':{'iso':'TUR',chomage:8.5,inflation:47.0,pib:3.2,smic:630,gini:41.9},
    'Vietnam':{'iso':'VNM',chomage:2.1,inflation:3.6,pib:7.1,smic:200,gini:36.1},
    'Thailand':{'iso':'THA',chomage:1.1,inflation:0.4,pib:2.7,smic:310,gini:36.4},
    'South Africa':{'iso':'ZAF',chomage:33.5,inflation:4.4,pib:0.8,smic:310,gini:63.0},
    'Nigeria':{'iso':'NGA',chomage:5.0,inflation:28.0,pib:3.2,smic:55,gini:35.1},
    'Morocco':{'iso':'MAR',chomage:13.0,inflation:0.9,pib:3.6,smic:310,gini:39.5},
    'Egypt':{'iso':'EGY',chomage:6.7,inflation:26.0,pib:4.2,smic:115,gini:31.5},
    'Australia':{'iso':'AUS',chomage:4.0,inflation:2.4,pib:1.5,smic:2070,gini:34.3},
    'New Zealand':{'iso':'NZL',chomage:4.7,inflation:2.2,pib:0.5,smic:1790,gini:33.9},
    'Russia':{'iso':'RUS',chomage:2.4,inflation:8.5,pib:3.6,smic:220,gini:36.0},
    'Ukraine':{'iso':'UKR',chomage:18.0,inflation:12.0,pib:4.5,smic:210,gini:26.6},
    'Saudi Arabia':{'iso':'SAU',chomage:7.7,inflation:1.5,pib:0.8,smic:null,gini:null},
  };

  const INDICATEURS = [
    {id:'chomage',  label:'Taux de chômage (%)',    unite:'%',  lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
    {id:'inflation',label:'Inflation (%)',           unite:'%',  lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
    {id:'pib',      label:'Croissance PIB (%)',      unite:'%',  lowGood:false, pal:['#dc2626','#f97316','#fde68a','#86efac','#22c55e']},
    {id:'smic',     label:'Salaire minimum (€)',     unite:'€',  lowGood:false, pal:['#dc2626','#f97316','#fde68a','#86efac','#22c55e']},
    {id:'gini',     label:'Inégalités (Gini)',       unite:'',   lowGood:true,  pal:['#22c55e','#86efac','#fde68a','#f97316','#dc2626']},
  ];
  const indDef = INDICATEURS.find(i => i.id === indicateur);

  const getColor = React.useCallback((val, indId) => {
    if (val === null || val === undefined) return darkMode ? '#374151' : '#d1d5db';
    const def = INDICATEURS.find(i => i.id === indId);
    const vals = Object.values(PAYS_DATA).map(p => p[indId]).filter(v => v != null);
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const t = Math.max(0, Math.min(1, (val - min) / range));
    const p = def.pal;
    const idx = t * (p.length - 1);
    const i0 = Math.floor(idx), i1 = Math.min(i0+1, p.length-1);
    const frac = idx - i0;
    const h = c => [parseInt(c.slice(1,3),16), parseInt(c.slice(3,5),16), parseInt(c.slice(5,7),16)];
    const c0 = h(p[i0]), c1 = h(p[i1]);
    const r = Math.round(c0[0]+(c1[0]-c0[0])*frac);
    const g = Math.round(c0[1]+(c1[1]-c0[1])*frac);
    const b = Math.round(c0[2]+(c1[2]-c0[2])*frac);
    return `rgb(${r},${g},${b})`;
  }, [indicateur, darkMode]);

  useEffect(() => {
    const loadAll = async () => {
      if (!window.d3) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
          s.onload = res;
          s.onerror = () => rej(new Error('D3 non chargé'));
          document.head.appendChild(s);
        });
      }
      if (!window.topojson) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js';
          s.onload = res;
          s.onerror = () => rej(new Error('topojson non chargé'));
          document.head.appendChild(s);
        });
      }
      const URLS = [
        'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
        'https://unpkg.com/world-atlas@2/countries-110m.json',
        'https://raw.githubusercontent.com/topojson/world-atlas/master/countries-110m.json',
      ];
      let topo = null;
      for (const url of URLS) {
        try {
          const res = await fetch(url);
          if (res.ok) { topo = await res.json(); break; }
        } catch { continue; }
      }
      if (!topo) throw new Error('Impossible de charger les données cartographiques');
      const geo = window.topojson.feature(topo, topo.objects.countries);
      const ID_TO_NAME = {
        '004':'Afghanistan','008':'Albania','012':'Algeria','024':'Angola','032':'Argentina',
        '036':'Australia','040':'Austria','050':'Bangladesh','056':'Belgium','064':'Bhutan',
        '068':'Bolivia','076':'Brazil','100':'Bulgaria','116':'Cambodia','120':'Cameroon',
        '124':'Canada','144':'Sri Lanka','152':'Chile','156':'China','170':'Colombia',
        '180':'Dem. Rep. Congo','188':'Costa Rica','191':'Croatia','192':'Cuba','203':'Czechia',
        '208':'Denmark','218':'Ecuador','818':'Egypt','231':'Ethiopia','246':'Finland',
        '250':'France','276':'Germany','288':'Ghana','300':'Greece','320':'Guatemala',
        '332':'Haiti','340':'Honduras','348':'Hungary','356':'India','360':'Indonesia',
        '364':'Iran','368':'Iraq','372':'Ireland','376':'Israel','380':'Italy',
        '388':'Jamaica','392':'Japan','400':'Jordan','398':'Kazakhstan','404':'Kenya',
        '410':'South Korea','408':'North Korea','414':'Kuwait','418':'Laos','422':'Lebanon',
        '434':'Libya','442':'Luxembourg','484':'Mexico','504':'Morocco','508':'Mozambique',
        '524':'Nepal','528':'Netherlands','554':'New Zealand','566':'Nigeria','578':'Norway',
        '586':'Pakistan','591':'Panama','600':'Paraguay','604':'Peru','608':'Philippines',
        '616':'Poland','620':'Portugal','630':'Puerto Rico','642':'Romania','643':'Russia',
        '682':'Saudi Arabia','686':'Senegal','694':'Sierra Leone','703':'Slovakia','706':'Somalia',
        '710':'South Africa','724':'Spain','729':'Sudan','752':'Sweden','756':'Switzerland',
        '760':'Syria','764':'Thailand','792':'Turkey','800':'Uganda','804':'Ukraine',
        '784':'United Arab Emirates','826':'United Kingdom','840':'United States of America',
        '858':'Uruguay','860':'Uzbekistan','862':'Venezuela','704':'Vietnam','887':'Yemen',
        '894':'Zambia','716':'Zimbabwe',
      };
      geo.features.forEach(f => {
        if (!f.properties) f.properties = {};
        f.properties.name = ID_TO_NAME[String(f.id).padStart(3,'0')] || String(f.id);
      });
      setGeoData(geo);
    };
    loadAll().catch(e => { console.error('Globe:', e); setLoadError(e.message); });
  }, []);

  const draw = React.useCallback(() => {
    if (!canvasRef.current || !geoData || !window.d3) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const R = Math.min(W, H) / 2 - 10;
    const d3 = window.d3;
    dRef.current = d3;
    const [rx, ry] = rotRef.current;
    const proj = d3.geoOrthographic()
      .scale(R).translate([W/2, H/2]).rotate([rx, ry, 0]).clipAngle(90);
    projRef.current = proj;
    const path = d3.geoPath(proj, ctx);
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();
    ctx.arc(W/2, H/2, R, 0, 2*Math.PI);
    ctx.fillStyle = darkMode ? '#0f172a' : '#1e40af';
    ctx.fill();
    const grad = ctx.createRadialGradient(W/2, H/2, R*0.92, W/2, H/2, R*1.05);
    grad.addColorStop(0, 'rgba(100,160,255,0.0)');
    grad.addColorStop(1, 'rgba(100,160,255,0.18)');
    ctx.beginPath();
    ctx.arc(W/2, H/2, R*1.05, 0, 2*Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
    geoData.features.forEach(f => {
      const nomGeo = f.properties?.name || '';
      const data = PAYS_DATA[nomGeo];
      const val = data ? data[indicateur] : null;
      const color = getColor(val, indicateur);
      ctx.beginPath();
      path(f);
      ctx.fillStyle = color;
      ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 0.5;
      ctx.fill();
      ctx.stroke();
    });
    const graticule = d3.geoGraticule()();
    ctx.beginPath();
    path(graticule);
    ctx.strokeStyle = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W/2, H/2, R, 0, 2*Math.PI);
    ctx.strokeStyle = darkMode ? 'rgba(100,160,255,0.3)' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [geoData, indicateur, darkMode, getColor]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current.parentElement;
    const resize = () => {
      canvasRef.current.width  = el.clientWidth;
      canvasRef.current.height = el.clientHeight;
      draw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [draw]);

  useEffect(() => {
    const animate = () => {
      if (!isDragging.current) {
        velRef.current[0] *= 0.96;
        velRef.current[1] *= 0.96;
        velRef.current[0] += 0.08;
        rotRef.current[0] += velRef.current[0] * 0.1;
        rotRef.current[1] += velRef.current[1] * 0.1;
        draw();
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const onMouseDown = e => {
    isDragging.current = true;
    velRef.current = [0, 0];
    lastPos.current = [e.clientX, e.clientY];
  };
  const onMouseMove = e => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current[0];
    const dy = e.clientY - lastPos.current[1];
    lastPos.current = [e.clientX, e.clientY];
    velRef.current = [dx, dy];
    rotRef.current[0] += dx * 0.3;
    rotRef.current[1] -= dy * 0.3;
    rotRef.current[1] = Math.max(-90, Math.min(90, rotRef.current[1]));
    draw();
  };
  const onMouseUp = e => {
    isDragging.current = false;
    if (!projRef.current || !geoData || !window.d3) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const coords = projRef.current.invert([px, py]);
    if (!coords) return;
    const d3 = window.d3;
    const found = geoData.features.find(f => d3.geoContains(f, coords));
    if (found) {
      const nom = found.properties?.name || '';
      const data = PAYS_DATA[nom];
      if (data) setPays({ nom, data });
    }
  };

  const onTouchStart = e => { const t = e.touches[0]; onMouseDown({clientX:t.clientX,clientY:t.clientY}); };
  const onTouchMove  = e => { e.preventDefault(); const t = e.touches[0]; onMouseMove({clientX:t.clientX,clientY:t.clientY}); };
  const onTouchEnd   = e => { const t = e.changedTouches[0]; onMouseUp({clientX:t.clientX,clientY:t.clientY}); };

  return (
    <div className="space-y-4">
      <div className={`p-5 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-blue-900 to-indigo-900' : 'bg-gradient-to-r from-[#0d4093] to-indigo-600'} text-white`}>
        <h2 className="text-xl font-black">🌍 Globe économique mondial</h2>
        <p className="text-sm opacity-80 mt-1">Visualisez les indicateurs économiques pays par pays · Faites tourner le globe</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {INDICATEURS.map(ind => (
          <button key={ind.id} onClick={() => { setIndicateur(ind.id); setPays(null); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              indicateur === ind.id
                ? 'bg-[#0d4093] text-white shadow-lg'
                : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}>
            {ind.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`lg:col-span-2 rounded-2xl overflow-hidden relative ${darkMode ? 'bg-gray-950' : 'bg-slate-800'}`} style={{height:'480px'}}>
          {!geoData && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 text-sm gap-2">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
              Chargement de la carte…
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <div className="text-3xl">🌐</div>
              <p className="text-white/60 text-sm">Carte indisponible — vérifiez votre connexion</p>
              <button onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-[#0d4093] text-white text-xs rounded-xl hover:bg-[#0a3278]">
                Réessayer
              </button>
            </div>
          )}
          <canvas ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={() => { isDragging.current = false; }}
            onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
          />
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-white/30 text-xs">🖱️ Glisser pour tourner · Cliquer sur un pays</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{indDef.label}</p>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{indDef.lowGood ? '✅' : '❌'}</span>
              <div className="flex-1 h-3 rounded-full" style={{background:`linear-gradient(to right,${indDef.pal.join(',')})`}} />
              <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{indDef.lowGood ? '❌' : '✅'}</span>
            </div>
            <div className={`text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Gris = données non disponibles</div>
          </div>

          {pays ? (
            <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
              <h3 className={`font-black text-lg mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{pays.nom}</h3>
              <div className="space-y-2">
                {INDICATEURS.map(ind => {
                  const val = pays.data[ind.id];
                  if (val == null) return null;
                  const color = getColor(val, ind.id);
                  return (
                    <div key={ind.id} className={`flex justify-between py-1 border-b ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                      <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{ind.label.split(' (')[0]}</span>
                      <span className="text-sm font-bold" style={{color}}>{val}{ind.unite}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl p-6 text-center ${darkMode ? 'bg-gray-800 text-gray-500' : 'bg-white text-gray-400'} shadow`}>
              <div className="text-3xl mb-2">🌍</div>
              <p className="text-sm">Cliquez sur un pays pour ses données</p>
            </div>
          )}

          <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
            <p className={`text-xs font-bold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>🏆 Top 5 — {indDef.label.split(' (')[0]}</p>
            {Object.entries(PAYS_DATA)
              .filter(([,d]) => d[indicateur] != null)
              .sort(([,a],[,b]) => indDef.lowGood ? a[indicateur]-b[indicateur] : b[indicateur]-a[indicateur])
              .slice(0,5)
              .map(([nom,data],i) => (
                <div key={nom} className={`flex justify-between items-center py-1 ${i<4?(darkMode?'border-b border-gray-700':'border-b border-gray-100'):''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-4 ${darkMode?'text-gray-500':'text-gray-400'}`}>{i+1}</span>
                    <span className={`text-xs ${darkMode?'text-gray-300':'text-gray-600'}`}>{nom}</span>
                  </div>
                  <span className="text-xs font-bold" style={{color:getColor(data[indicateur],indicateur)}}>
                    {data[indicateur]}{indDef.unite}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <p className={`text-xs text-center ${darkMode?'text-gray-600':'text-gray-400'}`}>
        📚 Sources : FMI, OCDE, Eurostat, Banque mondiale — Données 2024-2025 · {Object.keys(PAYS_DATA).length} pays · Carte GeoJSON Natural Earth
      </p>
    </div>
  );
}
