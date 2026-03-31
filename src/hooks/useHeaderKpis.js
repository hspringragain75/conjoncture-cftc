import { useState } from 'react';

const HEADER_KPIS_DEFAULT = ['pib_trim', 'climat_affaires', 'chomage', 'inflation', 'smic_net', 'defaillances'];
const HEADER_KPIS_MAX = 6;

export default function useHeaderKpis() {
  const [headerKpis, setHeaderKpis] = useState(() => {
    try {
      const s = localStorage.getItem('cftc_header_kpis');
      const parsed = s ? JSON.parse(s) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : HEADER_KPIS_DEFAULT;
    } catch { return HEADER_KPIS_DEFAULT; }
  });

  const setAndSave = (ids) => {
    const next = ids.slice(0, HEADER_KPIS_MAX);
    setHeaderKpis(next);
    localStorage.setItem('cftc_header_kpis', JSON.stringify(next));
  };

  const toggleHeaderKpi = (id) => {
    setAndSave(
      headerKpis.includes(id)
        ? headerKpis.filter(k => k !== id)
        : headerKpis.length < HEADER_KPIS_MAX ? [...headerKpis, id] : headerKpis
    );
  };

  return { headerKpis, toggleHeaderKpi };
}
