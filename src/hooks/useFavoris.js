import { useState } from 'react';

export default function useFavoris() {
  const [favoris, setFavoris] = useState(() => {
    try { const s = localStorage.getItem('cftc_favoris'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [seuils, setSeuils] = useState(() => {
    try { const s = localStorage.getItem('cftc_seuils'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [notes, setNotes] = useState(() => {
    try { const s = localStorage.getItem('cftc_notes'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });

  const toggleFavori = (id) => {
    setFavoris(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('cftc_favoris', JSON.stringify(next));
      return next;
    });
  };

  const setSeuil = (id, valeur, direction) => {
    setSeuils(prev => {
      const next = valeur === '' ? { ...prev } : { ...prev, [id]: { valeur: parseFloat(valeur), direction } };
      if (valeur === '') delete next[id];
      localStorage.setItem('cftc_seuils', JSON.stringify(next));
      return next;
    });
  };

  const setNote = (id, texte) => {
    setNotes(prev => {
      const next = texte.trim() === '' ? { ...prev } : { ...prev, [id]: texte };
      if (texte.trim() === '') delete next[id];
      localStorage.setItem('cftc_notes', JSON.stringify(next));
      return next;
    });
  };

  const isFavori  = (id) => favoris.includes(id);
  const getSeuil  = (id) => seuils[id] || null;
  const getNote   = (id) => notes[id]  || '';

  return { favoris, toggleFavori, isFavori, setSeuil, getSeuil, setNote, getNote };
}
