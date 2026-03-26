#!/usr/bin/env python3
"""
🔮 Module de Prévisions Économiques CFTC v6.0
=============================================

AMÉLIORATIONS vs v5 :
─────────────────────
CALIBRAGE
  1. Référence neutre défaillances adaptative (moyenne glissante 12 mois)
  2. Volatilités dynamiques calculées sur séries historiques INSEE
  3. Mean reversion non-linéaire (force proportionnelle à l'écart)

NOUVEAUX SIGNAUX
  4. Confiance ménages → inflation services
  5. Taux immobilier → chômage construction
  6. SMB sectoriel → inflation salariale

ARCHITECTURE
  7. Cache + analyse de dérive (comparaison semaine précédente)
  8. Backtesting automatique avec archivage historique
  9. Décomposition de l'intervalle de confiance (3 sources)
"""

import json
import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from statistics import mean, stdev, median

# ============================================================================
# CONFIGURATION
# ============================================================================

random.seed(int(datetime.now().strftime('%Y%m%d')))

N_SIMULATIONS = 1000
HORIZON_MONTHS = 12
HORIZON_QUARTERS = 4

VOLATILITY_DEFAULTS = {'inflation': 0.5, 'chomage': 0.4}
VOLATILITY_BOUNDS = {'inflation': (0.3, 1.2), 'chomage': (0.25, 0.9)}

MEAN_REVERSION_K = 0.3

SEASONAL_INFLATION = {
    1: 0.10, 2: 0.00, 3: 0.00, 4: 0.05,
    5: 0.00, 6: 0.00, 7: 0.08, 8: 0.08,
    9: 0.12, 10: 0.00, 11: 0.00, 12: -0.05
}

ELASTICITIES = {
    'petrole_10pct':         {'inflation': 0.15, 'chomage': 0.05},
    'gaz_50pct':             {'inflation': 0.30, 'chomage': 0.08},
    'climat_affaires_10pts': {'chomage': -0.20},
    'taux_bce_1pt':          {'inflation': -0.15, 'chomage': 0.25},
}

SMIC_AUTO_THRESHOLD = 2.0
MAX_HISTORIQUE_ENTRIES = 26

# ============================================================================
# UTILITAIRES
# ============================================================================

def percentile(data: List[float], p: float) -> float:
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * p / 100
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    return sorted_data[f] * (c - k) + sorted_data[c] * (k - f)


def get_month_year(offset_months: int = 0) -> Tuple[int, int]:
    now = datetime.now()
    target = now + timedelta(days=offset_months * 30)
    return target.month, target.year


def safe_float(value, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# ============================================================================
# CALIBRAGE DYNAMIQUE (nouveau v6)
# ============================================================================

def compute_dynamic_volatilities(data: Dict) -> Tuple[Dict, Dict]:
    """
    Calcule les volatilités à partir des séries historiques data.json.
    Fallback sur constantes si historique insuffisant (< 6 points).
    """
    result = dict(VOLATILITY_DEFAULTS)
    report = {}

    # Volatilité inflation
    inf_series = data.get('inflation_salaires', [])
    inf_values = [safe_float(e.get('inflation')) for e in inf_series
                  if e.get('inflation') is not None]

    if len(inf_values) >= 6:
        vol_inf = stdev(inf_values)
        vol_inf = max(VOLATILITY_BOUNDS['inflation'][0],
                      min(VOLATILITY_BOUNDS['inflation'][1], vol_inf))
        result['inflation'] = round(vol_inf, 3)
        report['inflation'] = {
            'source': 'historique INSEE',
            'n_points': len(inf_values),
            'std_brut': round(stdev(inf_values), 3),
            'vol_retenu': result['inflation']
        }
    else:
        report['inflation'] = {
            'source': 'fallback (historique insuffisant)',
            'n_points': len(inf_values),
            'vol_retenu': result['inflation']
        }

    # Volatilité chômage
    cho_series = data.get('chomage', [])
    cho_values = [safe_float(e.get('taux')) for e in cho_series
                  if e.get('taux') is not None]

    if len(cho_values) >= 6:
        vol_cho = stdev(cho_values)
        vol_cho = max(VOLATILITY_BOUNDS['chomage'][0],
                      min(VOLATILITY_BOUNDS['chomage'][1], vol_cho))
        result['chomage'] = round(vol_cho, 3)
        report['chomage'] = {
            'source': 'historique INSEE',
            'n_points': len(cho_values),
            'std_brut': round(stdev(cho_values), 3),
            'vol_retenu': result['chomage']
        }
    else:
        report['chomage'] = {
            'source': 'fallback (historique insuffisant)',
            'n_points': len(cho_values),
            'vol_retenu': result['chomage']
        }

    return result, report


def compute_adaptive_defaillances_ref(data: Dict) -> Tuple[float, str]:
    """
    Référence neutre défaillances = moyenne glissante 12 derniers mois.
    Fallback : 55 000 (moyenne post-COVID).
    """
    FALLBACK = 55_000.0
    evolution = data.get('defaillances', {}).get('evolution', [])
    if not evolution:
        return FALLBACK, 'fallback (série absente)'

    cumuls = [safe_float(e.get('cumul')) for e in evolution if e.get('cumul')]
    if len(cumuls) < 4:
        return FALLBACK, f'fallback (seulement {len(cumuls)} points)'

    window = cumuls[-12:]
    ref = round(mean(window), 0)
    return ref, f'moyenne glissante {len(window)} derniers mois ({ref:,.0f})'


def nonlinear_mean_reversion(base_speed: float, current: float,
                              target: float, k: float = MEAN_REVERSION_K) -> float:
    """Mean reversion non-linéaire : speed = base × (1 + k × |écart|)"""
    ecart = abs(current - target)
    return base_speed * (1.0 + k * ecart)


# ============================================================================
# VALIDATION DES DONNÉES
# ============================================================================

def validate_data_quality(data: Dict) -> Dict:
    issues, warnings = [], []
    score = 100

    indicateurs = data.get('indicateurs_cles', {})
    marches = data.get('marches_financiers', {})
    prev = data.get('previsions', {}).get('banque_de_france', {})

    if not indicateurs.get('inflation_annuelle'):
        issues.append("inflation_annuelle manquante"); score -= 15
    if not indicateurs.get('taux_chomage_actuel'):
        issues.append("taux_chomage_actuel manquant"); score -= 15
    if not indicateurs.get('climat_affaires'):
        warnings.append("climat_affaires absent"); score -= 5
    if not prev.get('inflation_ipch', {}).get('2026'):
        issues.append("Prévisions BDF inflation 2026 absentes"); score -= 10
    if not prev.get('taux_chomage', {}).get('2026'):
        issues.append("Prévisions BDF chômage 2026 absentes"); score -= 10

    for label, key in [('Brent', 'petrole_brent'), ('Gaz TTF', 'gaz_naturel'),
                        ('EUR/USD', 'eurusd'), ('CAC 40', 'cac40')]:
        val = marches.get(key, {})
        if val.get('valeur'):
            src = val.get('source', '')
            if 'fallback' in src.lower() or 'statique' in src.lower():
                warnings.append(f"{label}: données statiques"); score -= 2
        else:
            warnings.append(f"{label} non disponible"); score -= 2

    if not data.get('defaillances', {}).get('cumul_12_mois'):
        warnings.append("Défaillances non disponibles"); score -= 3
    if not data.get('irl', {}).get('glissement_annuel'):
        warnings.append("IRL non disponible"); score -= 2

    # Nouveaux signaux v6
    if not data.get('climat_affaires', {}).get('confiance_menages'):
        warnings.append("Confiance ménages absente (signal v6)"); score -= 1
    if not marches.get('taux_immobilier', {}).get('valeur'):
        warnings.append("Taux immobilier absent (signal v6)"); score -= 1
    if not data.get('salaires_secteur'):
        warnings.append("SMB sectoriels absents (signal v6)"); score -= 1

    return {
        'score': max(0, score),
        'niveau': ('excellent' if score >= 85 else
                   'bon' if score >= 70 else
                   'dégradé' if score >= 50 else 'faible'),
        'issues': issues,
        'warnings': warnings,
        'timestamp': datetime.now().isoformat()
    }


# ============================================================================
# EXTRACTION DES SIGNAUX MARCHÉS (v6 : + confiance ménages, taux immo, SMB)
# ============================================================================

def extract_market_signals(data: Dict, def_ref: float) -> Dict:
    marches    = data.get('marches_financiers', {})
    defaillances = data.get('defaillances', {})
    irl        = data.get('irl', {})
    carburants = data.get('carburants', {})
    climat     = data.get('climat_affaires', {})

    signals = {
        'inflation_adjustment': 0.0,
        'chomage_adjustment': 0.0,
        'energie_outlook': 'stable',
        'details': {}
    }

    # Brent
    brent = marches.get('petrole_brent', {})
    brent_val = safe_float(brent.get('valeur'))
    brent_var = safe_float(brent.get('variations', {}).get('ytd'))
    if brent_val > 0:
        impact = ((brent_val - 75.0) / 10.0) * 0.10
        signals['inflation_adjustment'] += impact
        signals['details']['brent'] = {
            'valeur': brent_val, 'ref': 75.0,
            'variation_ytd_pct': brent_var,
            'impact_inflation_pt': round(impact, 3)
        }
        if brent_var > 15:
            signals['energie_outlook'] = 'hausse'
        elif brent_var < -10:
            signals['energie_outlook'] = 'baisse'

    # Gaz TTF
    gaz = marches.get('gaz_naturel', {})
    gaz_val = safe_float(gaz.get('valeur'))
    if gaz_val > 0:
        impact = ((gaz_val - 35.0) / 10.0) * 0.05
        signals['inflation_adjustment'] += impact
        signals['details']['gaz_ttf'] = {
            'valeur': gaz_val, 'ref': 35.0,
            'impact_inflation_pt': round(impact, 3)
        }
        if gaz_val > 50:
            signals['energie_outlook'] = 'hausse'

    # EUR/USD
    eurusd = marches.get('eurusd', {})
    eurusd_val = safe_float(eurusd.get('valeur'))
    if eurusd_val > 0:
        impact = ((1.08 - eurusd_val) / 1.08) * 3.0 * 0.05
        signals['inflation_adjustment'] += impact
        signals['details']['eurusd'] = {
            'valeur': eurusd_val, 'ref': 1.08,
            'impact_inflation_pt': round(impact, 3)
        }

    # Défaillances (référence adaptive v6)
    cumul_def = safe_float(defaillances.get('cumul_12_mois'))
    var_def = safe_float(defaillances.get('variation_an'))
    if cumul_def > 0:
        impact = (cumul_def - def_ref) / 10_000 * 0.15
        impact = max(-0.3, min(0.4, impact))
        signals['chomage_adjustment'] += impact
        signals['details']['defaillances'] = {
            'cumul_12m': cumul_def,
            'ref_adaptive': def_ref,
            'variation_an_pct': var_def,
            'impact_chomage_pt': round(impact, 3)
        }

    # IRL
    irl_gl = safe_float(irl.get('glissement_annuel'))
    if irl_gl > 0:
        if irl_gl > 3.0:
            signals['inflation_adjustment'] += 0.05
        elif irl_gl < 1.0:
            signals['inflation_adjustment'] -= 0.03
        signals['details']['irl'] = {
            'glissement': irl_gl,
            'signal': 'haussier' if irl_gl > 3 else 'neutre' if irl_gl > 1 else 'baissier'
        }

    # CAC 40
    cac = marches.get('cac40', {})
    cac_ytd = safe_float(cac.get('variations', {}).get('ytd'))
    if cac_ytd != 0:
        if cac_ytd < -10:
            signals['chomage_adjustment'] += 0.10
        elif cac_ytd > 10:
            signals['chomage_adjustment'] -= 0.05
        signals['details']['cac40_ytd'] = {
            'variation_ytd_pct': cac_ytd,
            'signal_chomage': ('dégradé' if cac_ytd < -10
                               else 'bon' if cac_ytd > 10 else 'neutre')
        }

    # Carburants
    sp95_var = safe_float(carburants.get('sp95', {}).get('variation_an'))
    if sp95_var != 0:
        impact = (sp95_var / 100) * 0.4 * 0.08
        signals['inflation_adjustment'] += impact
        signals['details']['carburants_sp95'] = {
            'variation_annuelle_pct': sp95_var,
            'impact_inflation_pt': round(impact, 3)
        }

    # NOUVEAU v6 : Confiance des ménages → inflation services
    confiance = safe_float(climat.get('confiance_menages'))
    if confiance > 0:
        impact = (confiance - 100) * 0.02
        impact = max(-0.15, min(0.15, impact))
        signals['inflation_adjustment'] += impact
        signals['details']['confiance_menages'] = {
            'valeur': confiance, 'ref': 100,
            'impact_inflation_pt': round(impact, 3),
            'interpretation': ('stimule consommation → inflation services' if impact > 0
                               else 'freine consommation → désinflationniste')
        }

    # NOUVEAU v6 : Taux immobilier → chômage construction
    taux_immo = safe_float(marches.get('taux_immobilier', {}).get('valeur'))
    if taux_immo > 0:
        impact = (taux_immo - 2.5) * 0.08
        impact = max(-0.15, min(0.25, impact))
        signals['chomage_adjustment'] += impact
        signals['details']['taux_immobilier'] = {
            'valeur': taux_immo, 'ref': 2.5,
            'impact_chomage_pt': round(impact, 3),
            'interpretation': ('comprime construction → chômage' if impact > 0
                               else 'détente immobilière → soutient emploi')
        }

    # NOUVEAU v6 : SMB sectoriel → inflation salariale
    salaires_secteur = data.get('salaires_secteur', [])
    smb_evolutions = [safe_float(s.get('evolution'))
                      for s in salaires_secteur if s.get('evolution') is not None]
    if smb_evolutions:
        smb_moyen = mean(smb_evolutions)
        inflation_actuelle = safe_float(
            data.get('indicateurs_cles', {}).get('inflation_annuelle'), 1.5)
        ecart_smb_inf = smb_moyen - inflation_actuelle
        impact = 0.0
        if ecart_smb_inf > 1.0:
            impact = min(0.10, (ecart_smb_inf - 1.0) * 0.05)
        signals['inflation_adjustment'] += impact
        signals['details']['smb_sectoriel'] = {
            'evolution_moyenne_pct': round(smb_moyen, 2),
            'inflation_actuelle': inflation_actuelle,
            'ecart_smb_inflation': round(ecart_smb_inf, 2),
            'impact_inflation_pt': round(impact, 3),
            'n_secteurs': len(smb_evolutions)
        }

    signals['inflation_adjustment'] = round(
        max(-0.6, min(1.0, signals['inflation_adjustment'])), 3)
    signals['chomage_adjustment'] = round(
        max(-0.3, min(0.6, signals['chomage_adjustment'])), 3)

    return signals


# ============================================================================
# SIMULATION MONTE CARLO (v6 : mean reversion non-linéaire)
# ============================================================================

def monte_carlo_simulation(
    current: float, target: float, volatility: float, horizon: int,
    n_sims: int = N_SIMULATIONS, base_mean_reversion: float = 0.15,
    seasonal_factors: Dict[int, float] = None, start_month: int = None
) -> Dict:
    if start_month is None:
        start_month, _ = get_month_year()

    trajectories = []

    for _ in range(n_sims):
        path = [current]
        month = start_month

        for h in range(horizon):
            month = (month % 12) + 1
            # NOUVEAU v6 : mean reversion non-linéaire
            speed = nonlinear_mean_reversion(base_mean_reversion, path[-1], target)
            drift = speed * (target - path[-1])
            monthly_vol = volatility / math.sqrt(12)
            shock = random.gauss(0, monthly_vol)
            seasonal = seasonal_factors.get(month, 0) if seasonal_factors else 0
            next_val = path[-1] + drift + shock + seasonal
            next_val = max(-2.0, min(next_val, 15.0))
            path.append(round(next_val, 2))

        trajectories.append(path[1:])

    results = {'p10': [], 'p25': [], 'p50': [], 'p75': [], 'p90': [], 'mean': [], 'std': []}

    for h in range(horizon):
        values_at_h = [t[h] for t in trajectories]
        results['p10'].append(round(percentile(values_at_h, 10), 1))
        results['p25'].append(round(percentile(values_at_h, 25), 1))
        results['p50'].append(round(percentile(values_at_h, 50), 1))
        results['p75'].append(round(percentile(values_at_h, 75), 1))
        results['p90'].append(round(percentile(values_at_h, 90), 1))
        results['mean'].append(round(mean(values_at_h), 1))
        results['std'].append(round(stdev(values_at_h), 2))

    final_values = [t[-1] for t in trajectories]
    results['probabilities'] = {
        'below_1pct':  round(sum(1 for v in final_values if v < 1.0) / n_sims * 100, 1),
        'below_2pct':  round(sum(1 for v in final_values if v < 2.0) / n_sims * 100, 1),
        'above_2pct':  round(sum(1 for v in final_values if v > 2.0) / n_sims * 100, 1),
        'above_3pct':  round(sum(1 for v in final_values if v > 3.0) / n_sims * 100, 1),
        'above_4pct':  round(sum(1 for v in final_values if v > 4.0) / n_sims * 100, 1),
    }
    results['_final_values'] = final_values
    return results


# ============================================================================
# DÉCOMPOSITION DE L'INTERVALLE DE CONFIANCE (nouveau v6)
# ============================================================================

def compute_uncertainty_decomposition(
    current_inf: float, target_inf: float, vol_inf: float,
    current_cho: float, target_cho: float, vol_cho: float,
    market_signals: Dict, bdf_uncertainty: float = 0.3
) -> Dict:
    """
    3 jeux de 500 simulations pour décomposer les sources d'incertitude :
    1. Volatilité historique seule
    2. + Signaux marchés
    3. + Incertitude BDF (simulation complète)
    """
    month, _ = get_month_year()

    def ic_width(current, target, vol, base_mr, seasonal=None):
        res = monte_carlo_simulation(
            current=current, target=target, volatility=vol,
            horizon=HORIZON_MONTHS, n_sims=500,
            base_mean_reversion=base_mr,
            seasonal_factors=seasonal, start_month=month
        )
        return round(res['p90'][-1] - res['p10'][-1], 2)

    # Run 1 : volatilité seule
    ic_vol_inf = ic_width(current_inf, target_inf, vol_inf, 0.12, SEASONAL_INFLATION)
    ic_vol_cho = ic_width(current_cho, target_cho, vol_cho, 0.20)

    # Run 2 : + signaux marchés
    target_inf_adj = target_inf + market_signals.get('inflation_adjustment', 0)
    target_cho_adj = target_cho + market_signals.get('chomage_adjustment', 0)
    ic_mkt_inf = ic_width(current_inf, target_inf_adj, vol_inf, 0.12, SEASONAL_INFLATION)
    ic_mkt_cho = ic_width(current_cho, target_cho_adj, vol_cho, 0.20)

    # Run 3 : + incertitude BDF
    target_inf_bdf = target_inf_adj + random.gauss(0, bdf_uncertainty * 0.3)
    target_cho_bdf = target_cho_adj + random.gauss(0, bdf_uncertainty * 0.2)
    ic_full_inf = ic_width(current_inf, target_inf_bdf, vol_inf, 0.12, SEASONAL_INFLATION)
    ic_full_cho = ic_width(current_cho, target_cho_bdf, vol_cho, 0.20)

    def pct(part, total):
        return round(part / total * 100, 1) if total > 0 else 0

    total_inf = ic_full_inf or 0.01
    total_cho = ic_full_cho or 0.01

    contrib_vol_inf  = ic_vol_inf
    contrib_mkt_inf  = max(0, ic_mkt_inf - ic_vol_inf)
    contrib_bdf_inf  = max(0, ic_full_inf - ic_mkt_inf)
    contrib_vol_cho  = ic_vol_cho
    contrib_mkt_cho  = max(0, ic_mkt_cho - ic_vol_cho)
    contrib_bdf_cho  = max(0, ic_full_cho - ic_mkt_cho)

    return {
        'inflation': {
            'ic_total_pts': ic_full_inf,
            'sources': {
                'volatilite_historique': {
                    'ic_pts': contrib_vol_inf,
                    'part_pct': pct(contrib_vol_inf, total_inf),
                    'label': "Variabilité passée de l'inflation"
                },
                'signaux_marches': {
                    'ic_pts': round(contrib_mkt_inf, 2),
                    'part_pct': pct(contrib_mkt_inf, total_inf),
                    'label': 'Brent, gaz, EUR/USD, SMB...'
                },
                'incertitude_bdf': {
                    'ic_pts': round(contrib_bdf_inf, 2),
                    'part_pct': pct(contrib_bdf_inf, total_inf),
                    'label': 'Incertitude sur la cible Banque de France'
                }
            }
        },
        'chomage': {
            'ic_total_pts': ic_full_cho,
            'sources': {
                'volatilite_historique': {
                    'ic_pts': contrib_vol_cho,
                    'part_pct': pct(contrib_vol_cho, total_cho),
                    'label': 'Variabilité passée du chômage'
                },
                'signaux_marches': {
                    'ic_pts': round(contrib_mkt_cho, 2),
                    'part_pct': pct(contrib_mkt_cho, total_cho),
                    'label': 'Défaillances, taux immo, CAC 40...'
                },
                'incertitude_bdf': {
                    'ic_pts': round(contrib_bdf_cho, 2),
                    'part_pct': pct(contrib_bdf_cho, total_cho),
                    'label': 'Incertitude sur la cible Banque de France'
                }
            }
        },
        'note': (
            'IC = intervalle p90-p10 à 12 mois. '
            'Contributions estimées par 3 séries de 500 simulations séparées.'
        )
    }


# ============================================================================
# BACKTESTING ET CACHE (nouveau v6)
# ============================================================================

def archive_current_predictions(data: Dict, predictions: Dict) -> None:
    """Archive les prévisions courantes dans previsions_historique (FIFO 26 entrées)."""
    historique = data.get('previsions_historique', [])

    inf_mc = predictions.get('inflation', {}).get('mensuel', {})
    cho_mc = predictions.get('chomage', {}).get('trimestriel', {})

    entry = {
        'date':              datetime.now().strftime('%Y-%m-%d'),
        'semaine':           datetime.now().strftime('%Y-W%W'),
        'inflation_p50_12m': predictions.get('inflation', {}).get('prevision_12m'),
        'inflation_p10_12m': (inf_mc.get('lower_bound', [None])[-1]),
        'inflation_p90_12m': (inf_mc.get('upper_bound', [None])[-1]),
        'chomage_p50_q4':    predictions.get('chomage', {}).get('prevision_q4'),
        'chomage_p10_q4':    (cho_mc.get('lower_bound', [None])[-1]),
        'chomage_p90_q4':    (cho_mc.get('upper_bound', [None])[-1]),
        'smic_hausse_pct':   (predictions.get('smic', {})
                              .get('events', [{}])[0].get('estimated_increase_pct')),
        'market_signals': {
            'inflation_adj': predictions.get('market_signals', {}).get('inflation_adjustment'),
            'chomage_adj':   predictions.get('market_signals', {}).get('chomage_adjustment'),
            'energie':       predictions.get('market_signals', {}).get('energie_outlook'),
        },
        'volatilites': predictions.get('calibrage', {}).get('volatilites', {})
    }

    historique.append(entry)
    if len(historique) > MAX_HISTORIQUE_ENTRIES:
        historique = historique[-MAX_HISTORIQUE_ENTRIES:]

    data['previsions_historique'] = historique


def compute_drift_analysis(data: Dict, current_predictions: Dict) -> Dict:
    """Compare les prévisions courantes avec la dernière entrée archivée."""
    historique = data.get('previsions_historique', [])

    if not historique:
        return {
            'disponible': False,
            'message': 'Première exécution — aucun historique disponible'
        }

    prev = historique[-1]
    cur_inf  = safe_float(current_predictions.get('inflation', {}).get('prevision_12m'))
    cur_cho  = safe_float(current_predictions.get('chomage', {}).get('prevision_q4'))
    prev_inf = safe_float(prev.get('inflation_p50_12m'))
    prev_cho = safe_float(prev.get('chomage_p50_q4'))

    drift_inf = round(cur_inf - prev_inf, 2) if prev_inf else None
    drift_cho = round(cur_cho - prev_cho, 2) if prev_cho else None

    cur_ms  = current_predictions.get('market_signals', {})
    prev_ms = prev.get('market_signals', {})
    deltas  = {}
    if cur_ms.get('inflation_adj') is not None and prev_ms.get('inflation_adj') is not None:
        deltas['signaux_inflation'] = round(
            safe_float(cur_ms['inflation_adj']) - safe_float(prev_ms['inflation_adj']), 3)
    if cur_ms.get('chomage_adj') is not None and prev_ms.get('chomage_adj') is not None:
        deltas['signaux_chomage'] = round(
            safe_float(cur_ms['chomage_adj']) - safe_float(prev_ms['chomage_adj']), 3)

    cause_principale = None
    if deltas:
        cause_key = max(deltas, key=lambda k: abs(deltas[k]))
        cause_val = deltas[cause_key]
        if abs(cause_val) > 0.02:
            cause_principale = (
                f"{cause_key.replace('_', ' ')} : "
                f"{'↑' if cause_val > 0 else '↓'}{abs(cause_val):.3f}pt"
            )

    energie_change = None
    if cur_ms.get('energie') != prev_ms.get('energie') and prev_ms.get('energie'):
        energie_change = f"{prev_ms['energie']} → {cur_ms['energie']}"

    return {
        'disponible': True,
        'date_reference': prev.get('date'),
        'inflation': {
            'precedent':  prev_inf,
            'actuel':     cur_inf,
            'derive_pt':  drift_inf,
            'direction':  ('↑' if drift_inf and drift_inf > 0.05
                           else '↓' if drift_inf and drift_inf < -0.05 else '→')
        },
        'chomage': {
            'precedent':  prev_cho,
            'actuel':     cur_cho,
            'derive_pt':  drift_cho,
            'direction':  ('↑' if drift_cho and drift_cho > 0.05
                           else '↓' if drift_cho and drift_cho < -0.05 else '→')
        },
        'cause_principale': cause_principale or 'Dérive mineure (<0.02pt)',
        'energie_change':   energie_change,
        'deltas_signaux':   deltas
    }


def compute_backtesting(data: Dict) -> Dict:
    """Compare prévisions archivées avec réalisations INSEE. Opérationnel après 4+ semaines."""
    historique = data.get('previsions_historique', [])

    if len(historique) < 4:
        semaines_manquantes = 4 - len(historique)
        return {
            'disponible': False,
            'message': (
                f'Historique insuffisant ({len(historique)} semaine(s) archivée(s)). '
                f'Backtesting disponible dans ~{semaines_manquantes} semaine(s) '
                f'(minimum 4, significatif après 26).'
            ),
            'semaines_archivees':   len(historique),
            'semaines_necessaires': 26
        }

    inf_series  = data.get('inflation_salaires', [])
    inf_realises = {str(e.get('annee')): safe_float(e.get('inflation'))
                    for e in inf_series if e.get('inflation') is not None}

    erreurs_inf = []
    comparaisons = []

    for entry in historique:
        date_prev = entry.get('date', '')
        if not date_prev:
            continue
        try:
            dt = datetime.strptime(date_prev, '%Y-%m-%d')
        except ValueError:
            continue

        annee_cible  = str(dt.year + 1) if dt.month >= 7 else str(dt.year)
        realise_inf  = inf_realises.get(annee_cible)
        prevu_inf    = safe_float(entry.get('inflation_p50_12m'))

        comparaison = {
            'date_prevision': date_prev,
            'horizon_cible':  annee_cible,
            'inflation': {'prevu': prevu_inf, 'realise': realise_inf, 'erreur': None},
        }

        if realise_inf and prevu_inf:
            erreur = round(prevu_inf - realise_inf, 2)
            comparaison['inflation']['erreur'] = erreur
            erreurs_inf.append(erreur)

        comparaisons.append(comparaison)

    def mae(errors):   return round(mean([abs(e) for e in errors]), 2) if errors else None
    def biais(errors): return round(mean(errors), 2) if errors else None

    mae_inf   = mae(erreurs_inf)
    biais_inf = biais(erreurs_inf)

    interpretation = []
    if mae_inf is not None:
        qualite = 'bon' if mae_inf < 0.3 else 'acceptable' if mae_inf < 0.6 else 'à améliorer'
        interpretation.append(f"Erreur absolue moyenne inflation : {mae_inf}pt ({qualite})")
    if biais_inf is not None:
        direction = 'sur-estime' if biais_inf > 0.1 else 'sous-estime' if biais_inf < -0.1 else 'non biaisé'
        interpretation.append(f"Biais inflation : {biais_inf:+.2f}pt ({direction})")

    return {
        'disponible':              True,
        'semaines_archivees':      len(historique),
        'comparaisons_evaluees':   len([c for c in comparaisons if c['inflation']['erreur'] is not None]),
        'metriques': {
            'inflation': {
                'mae_pt':        mae_inf,
                'biais_pt':      biais_inf,
                'n_observations': len(erreurs_inf)
            }
        },
        'interpretation':      interpretation,
        'detail_comparaisons': comparaisons[-6:],
        'avertissement': (
            'Significativité statistique augmente avec le nombre d\'observations.'
            if len(erreurs_inf) < 10 else None
        )
    }


# ============================================================================
# PRÉVISIONS INFLATION (v6)
# ============================================================================

def predict_inflation_v6(
    current_inflation: float, bdf_target_2026: float, bdf_target_2027: float,
    climat_affaires: float = 100, market_signals: Dict = None,
    volatility: float = None
) -> Dict:
    month, year = get_month_year()
    base_target = bdf_target_2026 if year <= 2026 else bdf_target_2027
    climat_adjustment = (climat_affaires - 100) * 0.01
    market_adj = market_signals.get('inflation_adjustment', 0.0) if market_signals else 0.0
    adjusted_target = max(0.0, min(6.0, base_target + climat_adjustment + market_adj))
    vol = volatility if volatility else VOLATILITY_DEFAULTS['inflation']

    mc_results = monte_carlo_simulation(
        current=current_inflation, target=adjusted_target,
        volatility=vol, horizon=HORIZON_MONTHS,
        base_mean_reversion=0.12,
        seasonal_factors=SEASONAL_INFLATION, start_month=month
    )

    periods = []
    m, y = month, year
    for _ in range(HORIZON_MONTHS):
        m += 1
        if m > 12: m = 1; y += 1
        periods.append(f"{y}-{m:02d}")

    return {
        'actuel':        current_inflation,
        'prevision_6m':  mc_results['p50'][5],
        'prevision_12m': mc_results['p50'][-1],
        'tendance': ('hausse' if mc_results['p50'][-1] > current_inflation + 0.2
                     else 'baisse' if mc_results['p50'][-1] < current_inflation - 0.2
                     else 'stable'),
        'confidence': 0.85,
        'mensuel': {
            'predictions':  mc_results['p50'],
            'lower_bound':  mc_results['p10'],
            'upper_bound':  mc_results['p90'],
            'p25':          mc_results['p25'],
            'p75':          mc_results['p75'],
            'periods':      periods,
            'methodology':  (f'Monte Carlo ({N_SIMULATIONS} sim.) + saisonnalité + '
                             f'marchés + mean reversion non-linéaire (v6)')
        },
        'probabilites': {
            'inflation_sous_2pct':      mc_results['probabilities']['below_2pct'],
            'inflation_cible_bce':      mc_results['probabilities']['below_2pct'],
            'inflation_au_dessus_3pct': mc_results['probabilities']['above_3pct'],
            'inflation_au_dessus_4pct': mc_results['probabilities']['above_4pct'],
            'description': (
                f"{mc_results['probabilities']['below_2pct']}% de chances que "
                f"l'inflation reste sous 2% à 12 mois"
            )
        },
        'facteurs': {
            'cible_bdf':           base_target,
            'ajustement_climat':   round(climat_adjustment, 3),
            'ajustement_marches':  round(market_adj, 3),
            'energie_outlook':     market_signals.get('energie_outlook', 'stable') if market_signals else 'stable',
            'cible_ajustee':       round(adjusted_target, 3),
            'volatilite_utilisee': round(vol, 3)
        },
        'insight': (
            f"Inflation médiane à 12 mois : {mc_results['p50'][-1]}% "
            f"[IC 80% : {mc_results['p10'][-1]}% - {mc_results['p90'][-1]}%]. "
            f"{mc_results['probabilities']['below_2pct']}% de probabilité de rester sous 2%."
        )
    }


# ============================================================================
# PRÉVISIONS CHÔMAGE (v6)
# ============================================================================

def predict_chomage_v6(
    current_chomage: float, bdf_target_2026: float, bdf_target_2027: float,
    climat_affaires: float = 100, difficultes_recrutement: float = 50,
    market_signals: Dict = None, volatility: float = None
) -> Dict:
    month, year = get_month_year()
    quarter = (month - 1) // 3 + 1
    base_target = bdf_target_2026 if year <= 2026 else bdf_target_2027
    climat_adjustment      = (100 - climat_affaires) * 0.02
    recrutement_adjustment = (50 - difficultes_recrutement) * 0.01
    market_adj = market_signals.get('chomage_adjustment', 0.0) if market_signals else 0.0
    adjusted_target = max(5.0, min(12.0,
        base_target + climat_adjustment + recrutement_adjustment + market_adj))
    vol = volatility if volatility else VOLATILITY_DEFAULTS['chomage']

    mc_results = monte_carlo_simulation(
        current=current_chomage, target=adjusted_target,
        volatility=vol, horizon=HORIZON_QUARTERS,
        base_mean_reversion=0.20, seasonal_factors=None
    )

    periods = []
    q, y = quarter, year
    for _ in range(HORIZON_QUARTERS):
        q += 1
        if q > 4: q = 1; y += 1
        periods.append(f"T{q} {y}")

    final_values = mc_results['_final_values']
    prob_sous_7  = round(sum(1 for v in final_values if v < 7.0) / N_SIMULATIONS * 100, 1)
    prob_sous_75 = round(sum(1 for v in final_values if v < 7.5) / N_SIMULATIONS * 100, 1)
    prob_sup_8   = round(sum(1 for v in final_values if v > 8.0) / N_SIMULATIONS * 100, 1)

    return {
        'actuel':       current_chomage,
        'prevision_q4': mc_results['p50'][-1],
        'tendance': ('hausse' if mc_results['p50'][-1] > current_chomage + 0.2
                     else 'baisse' if mc_results['p50'][-1] < current_chomage - 0.2
                     else 'stable'),
        'confidence': 0.80,
        'trimestriel': {
            'predictions':  mc_results['p50'],
            'lower_bound':  mc_results['p10'],
            'upper_bound':  mc_results['p90'],
            'p25':          mc_results['p25'],
            'p75':          mc_results['p75'],
            'periods':      periods,
            'methodology':  (f'Monte Carlo ({N_SIMULATIONS} sim.) + marchés + '
                             f'défaillances adaptive + mean reversion non-linéaire (v6)')
        },
        'probabilites': {
            'chomage_sous_7pct':      prob_sous_7,
            'chomage_sous_75pct':     prob_sous_75,
            'chomage_au_dessus_8pct': prob_sup_8,
        },
        'facteurs': {
            'cible_bdf':              base_target,
            'ajustement_climat':      round(climat_adjustment, 3),
            'ajustement_recrutement': round(recrutement_adjustment, 3),
            'ajustement_marches':     round(market_adj, 3),
            'cible_ajustee':          round(adjusted_target, 3),
            'volatilite_utilisee':    round(vol, 3)
        },
        'insight': (
            f"Chômage médian à Q4 : {mc_results['p50'][-1]}% "
            f"[IC 80% : {mc_results['p10'][-1]}% - {mc_results['p90'][-1]}%]. "
            f"{prob_sous_7}% de probabilité de rester sous 7%."
        )
    }


# ============================================================================
# PRÉVISION SMIC (v6)
# ============================================================================

def predict_smic_v6(
    current_smic_brut: float, current_smic_net: float,
    inflation_forecast: Dict, bdf_inflation_2027: float
) -> Dict:
    month, year = get_month_year()
    next_january = year + 1 if month >= 1 else year
    running_brut = current_smic_brut

    inflation_p50 = safe_float(inflation_forecast.get('prevision_12m'), 1.5)
    inflation_p25 = safe_float(
        inflation_forecast.get('mensuel', {}).get('p25', [None])[-1], inflation_p50 - 0.3)
    inflation_p75 = safe_float(
        inflation_forecast.get('mensuel', {}).get('p75', [None])[-1], inflation_p50 + 0.3)

    estimated_increase = round(max(1.0, inflation_p50 + 0.4), 1)
    fourchette_min     = round(max(0.8, inflation_p25 + 0.2), 1)
    fourchette_max     = round(max(1.5, inflation_p75 + 0.6), 1)

    new_brut = round(running_brut * (1 + estimated_increase / 100), 2)
    new_net  = round(new_brut * 0.792, 2)

    events = [{
        'date':                    f"{next_january}-01-01",
        'type':                    'janvier',
        'probability':             1.0,
        'estimated_increase_pct':  estimated_increase,
        'estimated_new_smic_brut': new_brut,
        'estimated_new_smic_net':  new_net,
        'trigger':                 'Revalorisation annuelle obligatoire',
        'legal_basis':             'Code du travail, art. L3231-5',
        'confidence':              'haute',
        'fourchette': {
            'min':    fourchette_min,
            'max':    fourchette_max,
            'source': 'Percentiles p25/p75 Monte Carlo inflation (v6)'
        }
    }]

    inflation_upper = safe_float(
        inflation_forecast.get('mensuel', {}).get('upper_bound', [2.0])[-1], 2.0)
    if inflation_upper >= SMIC_AUTO_THRESHOLD:
        prob_auto = min(0.4, (inflation_upper - SMIC_AUTO_THRESHOLD) * 0.3)
        if prob_auto > 0.1:
            auto_increase = round(inflation_upper - 0.5, 1)
            events.append({
                'date':                    f"{next_january}-07-01",
                'type':                    'automatique',
                'probability':             round(prob_auto, 2),
                'estimated_increase_pct':  auto_increase,
                'estimated_new_smic_brut': round(running_brut * (1 + auto_increase / 100), 2),
                'estimated_new_smic_net':  round(running_brut * (1 + auto_increase / 100) * 0.792, 2),
                'trigger':     f'Inflation cumulée > 2% (p90: {inflation_upper}%)',
                'legal_basis': 'Code du travail, art. L3231-5',
                'confidence':  'basse'
            })

    return {
        'current': {
            'brut':         current_smic_brut,
            'net':          current_smic_net,
            'horaire_brut': round(current_smic_brut / 151.67, 2)
        },
        'events': events,
        'forecast_12m': {
            'total_increase_pct': events[0]['estimated_increase_pct'],
            'final_smic_brut':    events[0]['estimated_new_smic_brut'],
            'final_smic_net':     events[0]['estimated_new_smic_net'],
            'fourchette':         events[0]['fourchette']
        },
        'methodology': 'Règles légales + percentiles p25/p75 Monte Carlo inflation (v6)'
    }


# ============================================================================
# SCÉNARIOS WHAT-IF
# ============================================================================

def generate_whatif_scenarios(base_inflation, base_chomage, bdf_inflation, bdf_chomage):
    return {
        'choc_petrolier': {
            'nom': '🛢️ Choc pétrolier (+30%)',
            'description': 'Hausse brutale du prix du pétrole de 30%',
            'hypotheses': {'petrole': '+30%', 'gaz': '+20%'},
            'impact': {
                'inflation_12m': round(bdf_inflation + ELASTICITIES['petrole_10pct']['inflation'] * 3, 1),
                'chomage_q4':    round(bdf_chomage + ELASTICITIES['petrole_10pct']['chomage'] * 3, 1),
                'smic_supp': '+0.5%'
            },
            'probabilite': '15%', 'declencheur': 'Tensions géopolitiques Moyen-Orient'
        },
        'recession_ue': {
            'nom': '📉 Récession zone euro',
            'description': 'Contraction économique en Allemagne et Italie',
            'hypotheses': {'pib_ue': '-0.5%', 'climat': '-15pts'},
            'impact': {
                'inflation_12m': round(bdf_inflation - 0.4, 1),
                'chomage_q4':    round(bdf_chomage + 0.5, 1),
                'smic_supp': '0%'
            },
            'probabilite': '20%', 'declencheur': 'Crise industrielle allemande'
        },
        'hausse_taux': {
            'nom': '🏦 Hausse taux BCE (+1pt)',
            'description': 'Resserrement monétaire inattendu',
            'hypotheses': {'taux_bce': '+1pt', 'credit': '-10%'},
            'impact': {
                'inflation_12m': round(bdf_inflation + ELASTICITIES['taux_bce_1pt']['inflation'], 1),
                'chomage_q4':    round(bdf_chomage + ELASTICITIES['taux_bce_1pt']['chomage'], 1),
                'smic_supp': '0%'
            },
            'probabilite': '10%', 'declencheur': 'Inflation zone euro persistante'
        },
        'reprise_forte': {
            'nom': '🚀 Reprise économique forte',
            'description': 'Consommation et investissement repartent',
            'hypotheses': {'pib': '+2%', 'climat': '+10pts'},
            'impact': {
                'inflation_12m': round(bdf_inflation + 0.3, 1),
                'chomage_q4':    round(bdf_chomage - 0.4, 1),
                'smic_supp': '+0.3%'
            },
            'probabilite': '25%', 'declencheur': 'Confiance ménages, baisse épargne'
        },
        'crise_energie': {
            'nom': '⚡ Crise énergétique',
            'description': 'Rupture approvisionnement gaz',
            'hypotheses': {'gaz': '+100%', 'electricite': '+50%'},
            'impact': {
                'inflation_12m': round(bdf_inflation + ELASTICITIES['gaz_50pct']['inflation'] * 2, 1),
                'chomage_q4':    round(bdf_chomage + ELASTICITIES['gaz_50pct']['chomage'] * 2, 1),
                'smic_supp': '+1%'
            },
            'probabilite': '10%', 'declencheur': 'Conflit Russie-Ukraine escalade'
        },
    }


# ============================================================================
# NOTES DE LECTURE (v6)
# ============================================================================

def generate_notes_lecture_v6(inflation, smic, chomage, whatif, data_quality,
                               market_signals, drift, backtesting, vol_report) -> List[str]:
    notes = []

    prob_sous_2 = inflation.get('probabilites', {}).get('inflation_sous_2pct', 50)
    notes.append(
        f"📈 Inflation médiane à 12 mois : {inflation['prevision_12m']}% "
        f"[{inflation['mensuel']['lower_bound'][-1]}% - {inflation['mensuel']['upper_bound'][-1]}%] — "
        f"{prob_sous_2}% de chances de rester sous 2%"
    )

    if smic.get('events'):
        evt = smic['events'][0]
        f_  = evt.get('fourchette', {})
        notes.append(
            f"💰 SMIC janvier {evt['date'][:4]} : {evt['estimated_new_smic_brut']:.0f}€ brut "
            f"(+{evt['estimated_increase_pct']}%, fourchette {f_.get('min','?')}-{f_.get('max','?')}%)"
        )

    notes.append(
        f"👥 Chômage Q4 : {chomage['prevision_q4']}% "
        f"[{chomage['trimestriel']['lower_bound'][-1]}% - {chomage['trimestriel']['upper_bound'][-1]}%] — "
        f"Tendance {chomage['tendance']}"
    )

    adj_inf = market_signals.get('inflation_adjustment', 0)
    adj_cho = market_signals.get('chomage_adjustment', 0)
    if abs(adj_inf) > 0.05 or abs(adj_cho) > 0.05:
        parts = []
        if abs(adj_inf) > 0.05:
            parts.append(f"{'↑' if adj_inf > 0 else '↓'} inflation {abs(adj_inf):.2f}pt")
        if abs(adj_cho) > 0.05:
            parts.append(f"{'↑' if adj_cho > 0 else '↓'} chômage {abs(adj_cho):.2f}pt")
        notes.append(f"📊 Signaux marchés : {', '.join(parts)}")

    vol_inf = vol_report.get('inflation', {})
    if vol_inf.get('source') == 'historique INSEE':
        notes.append(
            f"📉 Volatilité calculée sur {vol_inf.get('n_points','?')} pts "
            f"historiques INSEE : {vol_inf.get('vol_retenu')} (v6 dynamique)"
        )

    if drift.get('disponible'):
        d_inf = drift.get('inflation', {})
        if d_inf.get('derive_pt') and abs(d_inf['derive_pt']) >= 0.05:
            notes.append(
                f"🔄 Dérive vs semaine précédente : inflation "
                f"{d_inf['direction']}{abs(d_inf['derive_pt'])}pt — "
                f"{drift.get('cause_principale', '')}"
            )

    if backtesting.get('disponible'):
        mae = backtesting.get('metriques', {}).get('inflation', {}).get('mae_pt')
        if mae:
            notes.append(f"🎯 Précision historique : erreur moyenne {mae}pt sur l'inflation")

    most_likely = max(whatif.values(), key=lambda x: float(x['probabilite'].replace('%', '')))
    notes.append(
        f"🎲 Scénario à surveiller : {most_likely['nom']} ({most_likely['probabilite']})"
    )

    inf_prev    = inflation['prevision_12m']
    smic_increase = smic['events'][0]['estimated_increase_pct'] if smic.get('events') else 2.0
    recommandation = max(inf_prev + 0.5, smic_increase)
    notes.append(
        f"💡 Recommandation NAO : demander au minimum +{recommandation:.1f}% "
        f"pour préserver le pouvoir d'achat"
    )

    if data_quality['score'] < 70:
        notes.append(
            f"⚠️ Qualité données : {data_quality['score']}/100 — "
            f"{len(data_quality['issues'])} problème(s)"
        )

    return notes


# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def generate_predictions_v6(data: Dict) -> Dict:
    now = datetime.now()

    # 1. Archiver les prévisions précédentes AVANT modification
    prev_predictions = data.get('previsions_cftc', {})
    if prev_predictions:
        print("📦 Archivage des prévisions précédentes...")
        archive_current_predictions(data, prev_predictions)
        n_hist = len(data.get('previsions_historique', []))
        print(f"   Historique : {n_hist} entrée(s) archivée(s)")

    # 2. Validation qualité
    print("🔍 Validation de la qualité des données...")
    data_quality = validate_data_quality(data)
    print(f"   Score: {data_quality['score']}/100 ({data_quality['niveau']})")
    for issue in data_quality['issues']:
        print(f"   ❌ {issue}")
    for warning in data_quality['warnings']:
        print(f"   ⚠️  {warning}")

    # 3. Calibrage dynamique
    print("⚙️  Calibrage dynamique (v6)...")
    volatilites, vol_report = compute_dynamic_volatilities(data)
    def_ref, def_ref_label  = compute_adaptive_defaillances_ref(data)
    print(f"   Vol. inflation : {volatilites['inflation']} ({vol_report['inflation']['source']})")
    print(f"   Vol. chômage   : {volatilites['chomage']} ({vol_report['chomage']['source']})")
    print(f"   Réf. défaill.  : {def_ref:,.0f} ({def_ref_label})")

    # 4. Signaux marchés
    print("📊 Extraction des signaux marchés (v6)...")
    market_signals = extract_market_signals(data, def_ref)
    print(f"   Ajust. inflation : {market_signals['inflation_adjustment']:+.3f}pt")
    print(f"   Ajust. chômage   : {market_signals['chomage_adjustment']:+.3f}pt")
    print(f"   Énergie          : {market_signals['energie_outlook']}")

    # 5. Paramètres
    indicateurs = data.get('indicateurs_cles', {})
    smic_data   = data.get('smic', {})
    prev_bdf    = data.get('previsions', {}).get('banque_de_france', {})
    climat      = data.get('climat_affaires', {})

    inflation_actuel        = safe_float(indicateurs.get('inflation_annuelle'), 1.5)
    chomage_actuel          = safe_float(indicateurs.get('taux_chomage_actuel'), 7.5)
    climat_affaires_val     = safe_float(
        indicateurs.get('climat_affaires') or climat.get('valeur_actuelle'), 100)
    difficultes_recrutement = safe_float(indicateurs.get('difficultes_recrutement'), 50)

    bdf_inflation_2026 = safe_float(prev_bdf.get('inflation_ipch', {}).get('2026'), 1.4)
    bdf_inflation_2027 = safe_float(prev_bdf.get('inflation_ipch', {}).get('2027'), 1.6)
    bdf_chomage_2026   = safe_float(prev_bdf.get('taux_chomage', {}).get('2026'), 7.7)
    bdf_chomage_2027   = safe_float(prev_bdf.get('taux_chomage', {}).get('2027'), 7.5)

    current_smic_brut = safe_float(smic_data.get('montant_brut'), 1823.03)
    current_smic_net  = safe_float(smic_data.get('montant_net'), 1443.11)

    # 6. Simulations Monte Carlo
    print("🎲 Simulation Monte Carlo inflation (v6)...")
    inflation = predict_inflation_v6(
        current_inflation=inflation_actuel,
        bdf_target_2026=bdf_inflation_2026, bdf_target_2027=bdf_inflation_2027,
        climat_affaires=climat_affaires_val, market_signals=market_signals,
        volatility=volatilites['inflation']
    )

    print("🎲 Simulation Monte Carlo chômage (v6)...")
    chomage = predict_chomage_v6(
        current_chomage=chomage_actuel,
        bdf_target_2026=bdf_chomage_2026, bdf_target_2027=bdf_chomage_2027,
        climat_affaires=climat_affaires_val,
        difficultes_recrutement=difficultes_recrutement,
        market_signals=market_signals, volatility=volatilites['chomage']
    )

    print("📋 Calcul SMIC v6...")
    smic = predict_smic_v6(
        current_smic_brut=current_smic_brut, current_smic_net=current_smic_net,
        inflation_forecast=inflation, bdf_inflation_2027=bdf_inflation_2027
    )

    print("🎯 Scénarios what-if...")
    whatif = generate_whatif_scenarios(
        inflation_actuel, chomage_actuel, bdf_inflation_2026, bdf_chomage_2026)

    # 7. Décomposition de l'intervalle de confiance
    print("🔬 Décomposition IC (3 × 500 simulations)...")
    target_inf = max(0.0, min(6.0,
        bdf_inflation_2026 + (climat_affaires_val - 100) * 0.01))
    target_cho = max(5.0, min(12.0,
        bdf_chomage_2026 + (100 - climat_affaires_val) * 0.02
        + (50 - difficultes_recrutement) * 0.01))

    uncertainty = compute_uncertainty_decomposition(
        current_inf=inflation_actuel, target_inf=target_inf, vol_inf=volatilites['inflation'],
        current_cho=chomage_actuel,   target_cho=target_cho, vol_cho=volatilites['chomage'],
        market_signals=market_signals
    )

    # 8. Dérive et backtesting
    print("🔄 Analyse de dérive...")
    current_for_drift = {'inflation': inflation, 'chomage': chomage, 'market_signals': market_signals}
    drift = compute_drift_analysis(data, current_for_drift)
    if drift.get('disponible'):
        d_inf = drift.get('inflation', {})
        print(f"   Inflation : {d_inf.get('precedent')}% → {d_inf.get('actuel')}% "
              f"({d_inf.get('direction')}{abs(d_inf.get('derive_pt', 0) or 0):.2f}pt)")

    print("📈 Backtesting...")
    backtesting_result = compute_backtesting(data)
    if backtesting_result.get('disponible'):
        print(f"   {backtesting_result.get('comparaisons_evaluees', 0)} comparaison(s) évaluée(s)")
    else:
        print(f"   {backtesting_result.get('message', '')}")

    # 9. Scénarios compatibles v3
    scenarios = {
        'optimiste': {
            'inflation_12m': inflation['mensuel']['p25'][-1],
            'chomage_q4':    chomage['trimestriel']['p25'][-1],
            'smic_increase': f"+{round(smic['events'][0]['estimated_increase_pct'] + 0.3, 1)}%",
            'pib':           f"+{round(safe_float(prev_bdf.get('pib_croissance', {}).get('2026'), 1.0) + 0.5, 1)}%",
            'hypotheses':    'Scénario favorable (percentile 25)'
        },
        'central': {
            'inflation_12m': inflation['prevision_12m'],
            'chomage_q4':    chomage['prevision_q4'],
            'smic_increase': f"+{smic['events'][0]['estimated_increase_pct']}%",
            'pib':           f"+{prev_bdf.get('pib_croissance', {}).get('2026', 1.0)}%",
            'hypotheses':    'Scénario médian (BDF + marchés v6)'
        },
        'pessimiste': {
            'inflation_12m': inflation['mensuel']['p75'][-1],
            'chomage_q4':    chomage['trimestriel']['p75'][-1],
            'smic_increase': f"+{round(smic['events'][0]['estimated_increase_pct'] - 0.2, 1)}%",
            'pib':           f"+{round(safe_float(prev_bdf.get('pib_croissance', {}).get('2026'), 1.0) - 0.5, 1)}%",
            'hypotheses':    'Scénario défavorable (percentile 75)'
        }
    }

    # 10. Notes de lecture
    notes = generate_notes_lecture_v6(
        inflation, smic, chomage, whatif, data_quality,
        market_signals, drift, backtesting_result, vol_report
    )

    # 11. Assemblage final
    predictions = {
        'generated_at':  now.isoformat(),
        'model_version': 'CFTC v6.0 (Monte Carlo + calibrage dynamique + backtesting)',
        'n_simulations': N_SIMULATIONS,
        'horizon':       '12 mois',

        'data_quality':  data_quality,

        'calibrage': {
            'volatilites':            volatilites,
            'volatilites_report':     vol_report,
            'defaillances_ref':       def_ref,
            'defaillances_ref_label': def_ref_label,
            'mean_reversion_k':       MEAN_REVERSION_K,
        },

        'market_signals':         {k: v for k, v in market_signals.items() if k != 'details'},
        'market_signals_details': market_signals.get('details', {}),

        'inflation':        inflation,
        'smic':             smic,
        'chomage':          chomage,
        'scenarios':        scenarios,
        'whatif_scenarios': whatif,
        'notes_lecture':    notes,

        'uncertainty_decomposition': uncertainty,
        'drift_analysis':            drift,
        'backtesting':               backtesting_result,

        'sources': [
            'Banque de France — Projections macroéconomiques',
            'INSEE — IPC, emploi, salaires (volatilités dynamiques v6)',
            'Yahoo Finance / FRED — Marchés financiers',
            'DARES — Défaillances (référence adaptive v6)',
            'Code du travail — Articles L3231-4 à L3231-11',
            f'Modèle CFTC v6.0 — Monte Carlo ({N_SIMULATIONS} simulations)'
        ],

        'methodology': {
            'type':        'Monte Carlo avec calibrage dynamique et signaux marchés',
            'simulations': N_SIMULATIONS,
            'nouveautes_v6': [
                'Référence défaillances adaptive (moyenne glissante 12 mois)',
                'Volatilités dynamiques calculées sur séries INSEE historiques',
                "Mean reversion non-linéaire (force proportionnelle à l'écart)",
                'Signal confiance ménages → inflation services',
                'Signal taux immobilier → chômage construction',
                'Signal SMB sectoriel → inflation salariale',
                'Cache + analyse de dérive semaine précédente',
                'Backtesting automatique avec archivage historique',
                "Décomposition de l'intervalle de confiance (3 sources)",
            ]
        },

        'disclaimer': (
            "Prévisions probabilistes Monte Carlo enrichi par données de marché "
            "en temps réel et calibrage dynamique."
        )
    }

    return predictions


# ============================================================================
# MAIN
# ============================================================================

def main(data_path: str = "public/data.json", output_path: str = None):
    print("=" * 65)
    print("🔮 CFTC Prévisions v6.0 — Calibrage dynamique + Backtesting")
    print("=" * 65)

    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    predictions = generate_predictions_v6(data)
    data['previsions_cftc'] = predictions

    # Nettoyer _final_values (usage interne uniquement)
    for section in ['inflation', 'chomage']:
        mc_key = 'mensuel' if section == 'inflation' else 'trimestriel'
        predictions.get(section, {}).get(mc_key, {}).pop('_final_values', None)

    output = output_path or data_path
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Prévisions v6 sauvegardées dans {output}")

    # Résumé
    print("\n" + "=" * 65)
    print("📊 RÉSUMÉ v6")
    print("=" * 65)

    dq  = predictions['data_quality']
    cal = predictions['calibrage']
    ms  = predictions['market_signals']
    inf = predictions['inflation']
    cho = predictions['chomage']
    sk  = predictions['smic']
    dr  = predictions['drift_analysis']
    bt  = predictions['backtesting']
    unc = predictions['uncertainty_decomposition']

    print(f"\n🔍 QUALITÉ DONNÉES : {dq['score']}/100 ({dq['niveau']})")

    print(f"\n⚙️  CALIBRAGE DYNAMIQUE")
    print(f"   Vol. inflation : {cal['volatilites']['inflation']} ({cal['volatilites_report']['inflation']['source']})")
    print(f"   Vol. chômage   : {cal['volatilites']['chomage']} ({cal['volatilites_report']['chomage']['source']})")
    print(f"   Réf. défaill.  : {cal['defaillances_ref']:,.0f} ({cal['defaillances_ref_label']})")

    print(f"\n📊 SIGNAUX MARCHÉS")
    print(f"   Ajust. inflation : {ms['inflation_adjustment']:+.3f}pt")
    print(f"   Ajust. chômage   : {ms['chomage_adjustment']:+.3f}pt")
    print(f"   Énergie          : {ms['energie_outlook']}")

    print(f"\n📈 INFLATION")
    print(f"   Actuelle    : {inf['actuel']}%")
    print(f"   Médiane 12m : {inf['prevision_12m']}%")
    print(f"   IC 80%      : [{inf['mensuel']['lower_bound'][-1]}% - {inf['mensuel']['upper_bound'][-1]}%]")
    print(f"   P(< 2%)     : {inf['probabilites']['inflation_sous_2pct']}%  ← sur {N_SIMULATIONS} simulations")
    unc_inf = unc['inflation']
    print(f"   IC décomposé : vol={unc_inf['sources']['volatilite_historique']['part_pct']}% "
          f"| marchés={unc_inf['sources']['signaux_marches']['part_pct']}% "
          f"| BDF={unc_inf['sources']['incertitude_bdf']['part_pct']}%")

    print(f"\n👥 CHÔMAGE")
    print(f"   Actuel    : {cho['actuel']}%")
    print(f"   Médian Q4 : {cho['prevision_q4']}%")
    print(f"   IC 80%    : [{cho['trimestriel']['lower_bound'][-1]}% - {cho['trimestriel']['upper_bound'][-1]}%]")
    print(f"   P(< 7%)   : {cho['probabilites']['chomage_sous_7pct']}%  ← sur {N_SIMULATIONS} simulations")

    print(f"\n💰 SMIC")
    if sk['events']:
        evt = sk['events'][0]
        f_  = evt.get('fourchette', {})
        print(f"   Janvier {evt['date'][:4]} : +{evt['estimated_increase_pct']}%")
        print(f"   Nouveau brut       : {evt['estimated_new_smic_brut']}€")
        print(f"   Fourchette p25/p75 : [{f_.get('min')}% - {f_.get('max')}%]")

    print(f"\n🔄 DÉRIVE")
    if dr.get('disponible'):
        d_inf = dr.get('inflation', {})
        print(f"   Inflation : {d_inf.get('precedent')}% → {d_inf.get('actuel')}% "
              f"({d_inf.get('direction')}{abs(d_inf.get('derive_pt', 0) or 0):.2f}pt)")
        print(f"   Cause     : {dr.get('cause_principale', '—')}")
    else:
        print(f"   {dr.get('message', '—')}")

    print(f"\n📈 BACKTESTING")
    if bt.get('disponible'):
        m = bt.get('metriques', {}).get('inflation', {})
        print(f"   MAE inflation : {m.get('mae_pt', '—')}pt | Biais : {m.get('biais_pt', '—')}pt")
    else:
        print(f"   {bt.get('message', '—')}")

    print("\n📝 NOTES")
    for note in predictions['notes_lecture'][:5]:
        print(f"   • {note[:85]}...")

    print("\n" + "=" * 65)
    return data


if __name__ == "__main__":
    import sys
    data_path   = sys.argv[1] if len(sys.argv) > 1 else "public/data.json"
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    try:
        main(data_path, output_path)
    except FileNotFoundError:
        print(f"❌ Fichier non trouvé : {data_path}")
        exit(1)
    except Exception as e:
        print(f"❌ Erreur : {e}")
        import traceback
        traceback.print_exc()
        exit(1)
