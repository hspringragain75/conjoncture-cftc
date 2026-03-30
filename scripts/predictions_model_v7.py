#!/usr/bin/env python3
"""
🔮 Module de Prévisions Économiques CFTC v7.0
=============================================

AMÉLIORATIONS vs v6 :
─────────────────────
MODÉLISATION
  1. Simulation bivariée inflation/chômage (corrélation de Phillips, Cholesky)
  2. Distribution log-normale pour l'inflation (asymétrie réaliste)
  3. Pondération temporelle des signaux marchés (décroissance exponentielle)

NOUVELLES PRÉVISIONS
  4. Pouvoir d'achat SMIC réel (gain/perte en % et en €/mois)

HÉRITAGE v6 (conservé intégralement)
  - Référence défaillances adaptive
  - Volatilités dynamiques sur séries INSEE
  - Mean reversion non-linéaire
  - Signaux : confiance ménages, taux immobilier, SMB sectoriel
  - Cache + analyse de dérive
  - Backtesting automatique
  - Décomposition de l'intervalle de confiance
"""

import json
import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from statistics import mean, stdev

# ============================================================================
# CONFIGURATION
# ============================================================================

random.seed(int(datetime.now().strftime('%Y%m%d')))

N_SIMULATIONS   = 1000
HORIZON_MONTHS  = 12
HORIZON_QUARTERS = 4

VOLATILITY_DEFAULTS = {'inflation': 0.5, 'chomage': 0.4}
VOLATILITY_BOUNDS   = {'inflation': (0.3, 1.2), 'chomage': (0.25, 0.9)}

MEAN_REVERSION_K = 0.3

# Corrélation de Phillips inflation/chômage (empirique France 20 ans)
PHILLIPS_CORRELATION = -0.35

# Pondération temporelle des signaux : demi-vie 14 jours
SIGNAL_DECAY_LAMBDA = 0.05

# Offset log-normale : évite log(0) et capture l'asymétrie
LOGNORMAL_OFFSET = 3.0

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

SMIC_AUTO_THRESHOLD  = 2.0
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


def cholesky_corr(rho: float) -> Tuple[float, float, float]:
    """
    Décomposition de Cholesky pour 2 variables corrélées.
    Retourne (L11, L21, L22) tels que :
      Z1 = L11 * u1
      Z2 = L21 * u1 + L22 * u2
    avec u1, u2 ~ N(0,1) indépendants.
    """
    L11 = 1.0
    L21 = rho
    L22 = math.sqrt(max(0.0, 1.0 - rho ** 2))
    return L11, L21, L22


def temporal_weight(date_str: str) -> float:
    """
    Poids temporel d'un signal selon son ancienneté.
    poids = exp(-lambda * jours) — demi-vie ~14 jours.
    Retourne 1.0 si date inconnue (pas de pénalité par défaut).
    """
    if not date_str:
        return 1.0
    try:
        dt = datetime.strptime(date_str[:10], '%Y-%m-%d')
        jours = (datetime.now() - dt).days
        return round(math.exp(-SIGNAL_DECAY_LAMBDA * max(0, jours)), 3)
    except (ValueError, TypeError):
        return 1.0


# ============================================================================
# CALIBRAGE DYNAMIQUE (hérité v6)
# ============================================================================

def compute_dynamic_volatilities(data: Dict) -> Tuple[Dict, Dict]:
    result = dict(VOLATILITY_DEFAULTS)
    report = {}

    inf_series = data.get('inflation_salaires', [])
    inf_values = [safe_float(e.get('inflation')) for e in inf_series
                  if e.get('inflation') is not None]

    if len(inf_values) >= 6:
        vol_inf = stdev(inf_values)
        vol_inf = max(VOLATILITY_BOUNDS['inflation'][0],
                      min(VOLATILITY_BOUNDS['inflation'][1], vol_inf))
        result['inflation'] = round(vol_inf, 3)
        report['inflation'] = {
            'source': 'historique INSEE', 'n_points': len(inf_values),
            'std_brut': round(stdev(inf_values), 3), 'vol_retenu': result['inflation']
        }
    else:
        report['inflation'] = {
            'source': 'fallback (historique insuffisant)',
            'n_points': len(inf_values), 'vol_retenu': result['inflation']
        }

    cho_series = data.get('chomage', [])
    cho_values = [safe_float(e.get('taux')) for e in cho_series
                  if e.get('taux') is not None]

    if len(cho_values) >= 6:
        vol_cho = stdev(cho_values)
        vol_cho = max(VOLATILITY_BOUNDS['chomage'][0],
                      min(VOLATILITY_BOUNDS['chomage'][1], vol_cho))
        result['chomage'] = round(vol_cho, 3)
        report['chomage'] = {
            'source': 'historique INSEE', 'n_points': len(cho_values),
            'std_brut': round(stdev(cho_values), 3), 'vol_retenu': result['chomage']
        }
    else:
        report['chomage'] = {
            'source': 'fallback (historique insuffisant)',
            'n_points': len(cho_values), 'vol_retenu': result['chomage']
        }

    return result, report


def compute_adaptive_defaillances_ref(data: Dict) -> Tuple[float, str]:
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
    ecart = abs(current - target)
    return base_speed * (1.0 + k * ecart)


# ============================================================================
# VALIDATION DES DONNÉES
# ============================================================================

def validate_data_quality(data: Dict) -> Dict:
    issues, warnings = [], []
    score = 100

    indicateurs = data.get('indicateurs_cles', {})
    marches     = data.get('marches_financiers', {})
    prev        = data.get('previsions', {}).get('banque_de_france', {})

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
    if not data.get('climat_affaires', {}).get('confiance_menages'):
        warnings.append("Confiance ménages absente"); score -= 1
    if not marches.get('taux_immobilier', {}).get('valeur'):
        warnings.append("Taux immobilier absent"); score -= 1
    if not data.get('salaires_secteur'):
        warnings.append("SMB sectoriels absents"); score -= 1

    return {
        'score':   max(0, score),
        'niveau':  ('excellent' if score >= 85 else 'bon' if score >= 70
                    else 'dégradé' if score >= 50 else 'faible'),
        'issues':   issues,
        'warnings': warnings,
        'timestamp': datetime.now().isoformat()
    }


# ============================================================================
# EXTRACTION DES SIGNAUX MARCHÉS (v7 : pondération temporelle)
# ============================================================================

def extract_market_signals(data: Dict, def_ref: float) -> Dict:
    marches      = data.get('marches_financiers', {})
    defaillances = data.get('defaillances', {})
    irl          = data.get('irl', {})
    carburants   = data.get('carburants', {})
    climat       = data.get('climat_affaires', {})

    signals = {
        'inflation_adjustment': 0.0,
        'chomage_adjustment':   0.0,
        'energie_outlook':      'stable',
        'details':              {},
        'ponderation_temporelle': {}
    }

    # ── Brent ──────────────────────────────────────────────────────────────
    brent     = marches.get('petrole_brent', {})
    brent_val = safe_float(brent.get('valeur'))
    brent_var = safe_float(brent.get('variations', {}).get('ytd'))
    brent_date = brent.get('date') or brent.get('timestamp', '')
    brent_w   = temporal_weight(brent_date)
    if brent_val > 0:
        impact = ((brent_val - 75.0) / 10.0) * 0.10 * brent_w
        signals['inflation_adjustment'] += impact
        signals['details']['brent'] = {
            'valeur': brent_val, 'ref': 75.0, 'variation_ytd_pct': brent_var,
            'impact_inflation_pt': round(impact, 3), 'poids_temporel': brent_w
        }
        signals['ponderation_temporelle']['brent'] = brent_w
        if brent_var > 15:  signals['energie_outlook'] = 'hausse'
        elif brent_var < -10: signals['energie_outlook'] = 'baisse'

    # ── Gaz TTF ────────────────────────────────────────────────────────────
    gaz      = marches.get('gaz_naturel', {})
    gaz_val  = safe_float(gaz.get('valeur'))
    gaz_date = gaz.get('date') or gaz.get('timestamp', '')
    gaz_w    = temporal_weight(gaz_date)
    if gaz_val > 0:
        impact = ((gaz_val - 35.0) / 10.0) * 0.05 * gaz_w
        signals['inflation_adjustment'] += impact
        signals['details']['gaz_ttf'] = {
            'valeur': gaz_val, 'ref': 35.0,
            'impact_inflation_pt': round(impact, 3), 'poids_temporel': gaz_w
        }
        signals['ponderation_temporelle']['gaz_ttf'] = gaz_w
        if gaz_val > 50: signals['energie_outlook'] = 'hausse'

    # ── EUR/USD ────────────────────────────────────────────────────────────
    eurusd      = marches.get('eurusd', {})
    eurusd_val  = safe_float(eurusd.get('valeur'))
    eurusd_date = eurusd.get('date') or eurusd.get('timestamp', '')
    eurusd_w    = temporal_weight(eurusd_date)
    if eurusd_val > 0:
        impact = ((1.08 - eurusd_val) / 1.08) * 3.0 * 0.05 * eurusd_w
        signals['inflation_adjustment'] += impact
        signals['details']['eurusd'] = {
            'valeur': eurusd_val, 'ref': 1.08,
            'impact_inflation_pt': round(impact, 3), 'poids_temporel': eurusd_w
        }
        signals['ponderation_temporelle']['eurusd'] = eurusd_w

    # ── Défaillances (référence adaptive) ─────────────────────────────────
    cumul_def  = safe_float(defaillances.get('cumul_12_mois'))
    var_def    = safe_float(defaillances.get('variation_an'))
    def_date   = defaillances.get('date') or defaillances.get('timestamp', '')
    def_w      = temporal_weight(def_date)
    if cumul_def > 0:
        impact = (cumul_def - def_ref) / 10_000 * 0.15 * def_w
        impact = max(-0.3, min(0.4, impact))
        signals['chomage_adjustment'] += impact
        signals['details']['defaillances'] = {
            'cumul_12m': cumul_def, 'ref_adaptive': def_ref,
            'variation_an_pct': var_def,
            'impact_chomage_pt': round(impact, 3), 'poids_temporel': def_w
        }
        signals['ponderation_temporelle']['defaillances'] = def_w

    # ── IRL ────────────────────────────────────────────────────────────────
    irl_gl = safe_float(irl.get('glissement_annuel'))
    if irl_gl > 0:
        if irl_gl > 3.0:   signals['inflation_adjustment'] += 0.05
        elif irl_gl < 1.0: signals['inflation_adjustment'] -= 0.03
        signals['details']['irl'] = {
            'glissement': irl_gl,
            'signal': 'haussier' if irl_gl > 3 else 'neutre' if irl_gl > 1 else 'baissier'
        }

    # ── CAC 40 ─────────────────────────────────────────────────────────────
    cac     = marches.get('cac40', {})
    cac_ytd = safe_float(cac.get('variations', {}).get('ytd'))
    if cac_ytd != 0:
        if cac_ytd < -10:  signals['chomage_adjustment'] += 0.10
        elif cac_ytd > 10: signals['chomage_adjustment'] -= 0.05
        signals['details']['cac40_ytd'] = {
            'variation_ytd_pct': cac_ytd,
            'signal_chomage': ('dégradé' if cac_ytd < -10 else 'bon' if cac_ytd > 10 else 'neutre')
        }

    # ── Carburants ─────────────────────────────────────────────────────────
    sp95_var = safe_float(carburants.get('sp95', {}).get('variation_an'))
    if sp95_var != 0:
        impact = (sp95_var / 100) * 0.4 * 0.08
        signals['inflation_adjustment'] += impact
        signals['details']['carburants_sp95'] = {
            'variation_annuelle_pct': sp95_var,
            'impact_inflation_pt': round(impact, 3)
        }

    # ── Confiance ménages ──────────────────────────────────────────────────
    confiance = safe_float(climat.get('confiance_menages'))
    if confiance > 0:
        impact = max(-0.15, min(0.15, (confiance - 100) * 0.02))
        signals['inflation_adjustment'] += impact
        signals['details']['confiance_menages'] = {
            'valeur': confiance, 'ref': 100,
            'impact_inflation_pt': round(impact, 3),
            'interpretation': ('stimule consommation → inflation services' if impact > 0
                               else 'freine consommation → désinflationniste')
        }

    # ── Taux immobilier ────────────────────────────────────────────────────
    taux_immo = safe_float(marches.get('taux_immobilier', {}).get('valeur'))
    if taux_immo > 0:
        impact = max(-0.15, min(0.25, (taux_immo - 2.5) * 0.08))
        signals['chomage_adjustment'] += impact
        signals['details']['taux_immobilier'] = {
            'valeur': taux_immo, 'ref': 2.5,
            'impact_chomage_pt': round(impact, 3),
            'interpretation': ('comprime construction → chômage' if impact > 0
                               else 'détente immobilière → soutient emploi')
        }

    # ── SMB sectoriel ──────────────────────────────────────────────────────
    salaires_secteur = data.get('salaires_secteur', [])
    smb_evolutions   = [safe_float(s.get('evolution'))
                        for s in salaires_secteur if s.get('evolution') is not None]
    if smb_evolutions:
        smb_moyen       = mean(smb_evolutions)
        inflation_act   = safe_float(data.get('indicateurs_cles', {}).get('inflation_annuelle'), 1.5)
        ecart_smb_inf   = smb_moyen - inflation_act
        impact          = min(0.10, (ecart_smb_inf - 1.0) * 0.05) if ecart_smb_inf > 1.0 else 0.0
        signals['inflation_adjustment'] += impact
        signals['details']['smb_sectoriel'] = {
            'evolution_moyenne_pct': round(smb_moyen, 2),
            'inflation_actuelle':    inflation_act,
            'ecart_smb_inflation':   round(ecart_smb_inf, 2),
            'impact_inflation_pt':   round(impact, 3),
            'n_secteurs':            len(smb_evolutions)
        }

    signals['inflation_adjustment'] = round(max(-0.6, min(1.0, signals['inflation_adjustment'])), 3)
    signals['chomage_adjustment']   = round(max(-0.3, min(0.6, signals['chomage_adjustment'])), 3)
    return signals


# ============================================================================
# SIMULATION BIVARIÉE (NOUVEAU v7)
# ============================================================================

def monte_carlo_bivariate(
    current_inf:   float, target_inf:   float, vol_inf:   float,
    current_cho:   float, target_cho:   float, vol_cho:   float,
    horizon_inf:   int = HORIZON_MONTHS,
    horizon_cho:   int = HORIZON_QUARTERS,
    n_sims:        int = N_SIMULATIONS,
    mr_inf:        float = 0.12,
    mr_cho:        float = 0.20,
    seasonal_inf:  Dict[int, float] = None,
    start_month:   int = None,
    rho:           float = PHILLIPS_CORRELATION,
    lognormal:     bool = True,
    offset:        float = LOGNORMAL_OFFSET
) -> Tuple[Dict, Dict]:
    """
    Simulation Monte Carlo bivariée inflation + chômage avec :
    - Corrélation de Phillips via décomposition de Cholesky
    - Distribution log-normale pour l'inflation (asymétrie réaliste)
    - Mean reversion non-linéaire (hérité v6)

    Retourne (results_inf, results_cho) au format identique à l'ancienne
    monte_carlo_simulation() pour compatibilité totale avec le reste du code.
    """
    if start_month is None:
        start_month, _ = get_month_year()

    L11, L21, L22 = cholesky_corr(rho)

    # Horizon max pour aligner les chocs communs
    horizon_max = max(horizon_inf, horizon_cho)

    traj_inf = []
    traj_cho = []

    # Paramètres log-normale inflation
    # On simule log(inf + offset) puis on repasse en niveau
    if lognormal and current_inf + offset > 0:
        log_current = math.log(current_inf + offset)
        log_target  = math.log(max(0.01, target_inf + offset))
        log_vol     = vol_inf / (current_inf + offset + 1e-6)
        log_vol     = max(0.01, min(log_vol, 0.5))
        use_lognormal = True
    else:
        use_lognormal = False

    for _ in range(n_sims):
        path_inf = [current_inf]
        path_cho = [current_cho]
        month    = start_month

        for h in range(horizon_max):
            month = (month % 12) + 1

            # Chocs corrélés via Cholesky
            u1 = random.gauss(0, 1)
            u2 = random.gauss(0, 1)
            z_inf = L11 * u1                  # choc inflation
            z_cho = L21 * u1 + L22 * u2       # choc chômage (corrélé)

            # ── Inflation (log-normale) ────────────────────────────────────
            if h < horizon_inf:
                if use_lognormal:
                    log_val  = math.log(max(0.001, path_inf[-1] + offset))
                    speed    = nonlinear_mean_reversion(mr_inf, log_val, log_target)
                    drift    = speed * (log_target - log_val)
                    monthly_log_vol = log_vol / math.sqrt(12)
                    shock    = z_inf * monthly_log_vol
                    seasonal = seasonal_inf.get(month, 0) if seasonal_inf else 0
                    next_log = log_val + drift + shock
                    next_inf = math.exp(next_log) - offset + seasonal
                else:
                    speed    = nonlinear_mean_reversion(mr_inf, path_inf[-1], target_inf)
                    drift    = speed * (target_inf - path_inf[-1])
                    monthly_vol = vol_inf / math.sqrt(12)
                    seasonal = seasonal_inf.get(month, 0) if seasonal_inf else 0
                    next_inf = path_inf[-1] + drift + z_inf * monthly_vol + seasonal

                next_inf = max(-2.0, min(next_inf, 15.0))
                path_inf.append(round(next_inf, 2))

            # ── Chômage (gaussien, trimestriel) ───────────────────────────
            if h < horizon_cho:
                speed    = nonlinear_mean_reversion(mr_cho, path_cho[-1], target_cho)
                drift    = speed * (target_cho - path_cho[-1])
                monthly_vol = vol_cho / math.sqrt(12)
                next_cho = path_cho[-1] + drift + z_cho * monthly_vol
                next_cho = max(5.0, min(next_cho, 15.0))
                path_cho.append(round(next_cho, 2))

        traj_inf.append(path_inf[1:horizon_inf + 1])
        traj_cho.append(path_cho[1:horizon_cho + 1])

    def build_results(trajectories, horizon, n):
        res = {'p10': [], 'p25': [], 'p50': [], 'p75': [], 'p90': [], 'mean': [], 'std': []}
        for h in range(horizon):
            vals = [t[h] for t in trajectories if h < len(t)]
            res['p10'].append(round(percentile(vals, 10), 1))
            res['p25'].append(round(percentile(vals, 25), 1))
            res['p50'].append(round(percentile(vals, 50), 1))
            res['p75'].append(round(percentile(vals, 75), 1))
            res['p90'].append(round(percentile(vals, 90), 1))
            res['mean'].append(round(mean(vals), 1))
            res['std'].append(round(stdev(vals), 2))
        final = [t[-1] for t in trajectories if t]
        res['probabilities'] = {
            'below_1pct': round(sum(1 for v in final if v < 1.0) / n * 100, 1),
            'below_2pct': round(sum(1 for v in final if v < 2.0) / n * 100, 1),
            'above_2pct': round(sum(1 for v in final if v > 2.0) / n * 100, 1),
            'above_3pct': round(sum(1 for v in final if v > 3.0) / n * 100, 1),
            'above_4pct': round(sum(1 for v in final if v > 4.0) / n * 100, 1),
        }
        res['_final_values'] = final
        # Mesure d'asymétrie de l'IC
        p50_last = res['p50'][-1]
        res['asymetrie'] = {
            'queue_haute': round(res['p90'][-1] - p50_last, 2),
            'queue_basse': round(p50_last - res['p10'][-1], 2),
            'ratio':       round((res['p90'][-1] - p50_last) /
                                 max(0.01, p50_last - res['p10'][-1]), 2)
        }
        return res

    results_inf = build_results(traj_inf, horizon_inf, n_sims)
    results_cho = build_results(traj_cho, horizon_cho, n_sims)

    return results_inf, results_cho


# ============================================================================
# DÉCOMPOSITION DE L'IC (adaptée v7 — simulation bivariée)
# ============================================================================

def compute_uncertainty_decomposition(
    current_inf: float, target_inf: float, vol_inf: float,
    current_cho: float, target_cho: float, vol_cho: float,
    market_signals: Dict, bdf_uncertainty: float = 0.3
) -> Dict:
    """
    Décomposition en deux parties distinctes :

    1. CONTRIBUTION À LA MÉDIANE — ce qui déplace le centre de la prévision
       - Signaux marchés : ajustement direct de la cible
       - Incertitude BDF : fourchette autour de la cible BDF

    2. CONTRIBUTION À L'IC (p90-p10) — ce qui élargit la bande d'incertitude
       - Volatilité historique : source dominante de l'IC
       - Signaux marchés : contribution mesurée par ablation
    """
    month, _ = get_month_year()
    mkt_adj_inf = market_signals.get('inflation_adjustment', 0)
    mkt_adj_cho = market_signals.get('chomage_adjustment', 0)
    t_inf_full  = target_inf + mkt_adj_inf
    t_cho_full  = target_cho + mkt_adj_cho

    # ── PARTIE 1 : contribution à la médiane ──────────────────────────────
    # Signaux marchés : déplacement direct de la cible
    contrib_mkt_median_inf = round(mkt_adj_inf, 3)
    contrib_mkt_median_cho = round(mkt_adj_cho, 3)

    # Incertitude BDF : fourchette ±1σ autour de la cible
    bdf_sigma_inf = round(bdf_uncertainty * 0.5, 3)
    bdf_sigma_cho = round(bdf_uncertainty * 0.35, 3)

    # ── PARTIE 2 : contribution à l'IC par ablation ───────────────────────
    def run_ic(v_inf, v_cho, t_inf, t_cho, n=N_SIMULATIONS):
        ri, rc = monte_carlo_bivariate(
            current_inf=current_inf, target_inf=t_inf, vol_inf=v_inf,
            current_cho=current_cho, target_cho=t_cho, vol_cho=v_cho,
            n_sims=n, start_month=month, seasonal_inf=SEASONAL_INFLATION
        )
        return (round(ri['p90'][-1] - ri['p10'][-1], 2),
                round(rc['p90'][-1] - rc['p10'][-1], 2))

    VOL_MIN = 0.04

    # Run A : complet (vol réelle + signaux marchés)
    ic_a_inf, ic_a_cho = run_ic(vol_inf, vol_cho, t_inf_full, t_cho_full)

    # Run B : sans signaux marchés
    ic_b_inf, ic_b_cho = run_ic(vol_inf, vol_cho, target_inf, target_cho)

    # Run C : vol minimale (mesure contribution vol par différence)
    ic_c_inf, ic_c_cho = run_ic(VOL_MIN, VOL_MIN, t_inf_full, t_cho_full)

    # Contributions à l'IC
    contrib_vol_ic_inf = max(0.0, round(ic_a_inf - ic_c_inf, 2))
    contrib_mkt_ic_inf = max(0.0, round(ic_a_inf - ic_b_inf, 2))
    contrib_res_ic_inf = max(0.0, round(ic_c_inf, 2))  # résiduel (structure log-normale)

    contrib_vol_ic_cho = max(0.0, round(ic_a_cho - ic_c_cho, 2))
    contrib_mkt_ic_cho = max(0.0, round(ic_a_cho - ic_b_cho, 2))
    contrib_res_ic_cho = max(0.0, round(ic_c_cho, 2))

    # Normalisation à l'IC total
    def normalize(vol, mkt, res, total):
        s = vol + mkt + res
        if s <= 0: return vol, mkt, res
        scale = total / s
        return round(vol*scale, 2), round(mkt*scale, 2), round(res*scale, 2)

    cv_inf, cm_inf, cr_inf = normalize(
        contrib_vol_ic_inf, contrib_mkt_ic_inf, contrib_res_ic_inf, ic_a_inf)
    cv_cho, cm_cho, cr_cho = normalize(
        contrib_vol_ic_cho, contrib_mkt_ic_cho, contrib_res_ic_cho, ic_a_cho)

    def pct(part, total):
        return round(part / max(total, 0.01) * 100, 1)

    return {
        'inflation': {
            'ic_total_pts': ic_a_inf,
            'sources': {
                'volatilite_historique': {
                    'ic_pts': cv_inf,
                    'part_pct': pct(cv_inf, ic_a_inf),
                    'label': "Variabilité passée de l'inflation"
                },
                'signaux_marches': {
                    'ic_pts': cm_inf,
                    'part_pct': pct(cm_inf, ic_a_inf),
                    'label': 'Brent, gaz, EUR/USD, SMB...'
                },
                'incertitude_bdf': {
                    'ic_pts': cr_inf,
                    'part_pct': pct(cr_inf, ic_a_inf),
                    'label': 'Structure log-normale + résiduel'
                }
            },
            'contribution_mediane': {
                'signaux_marches_pt': contrib_mkt_median_inf,
                'incertitude_bdf_sigma': bdf_sigma_inf,
                'label': 'Déplacement de la prévision centrale'
            }
        },
        'chomage': {
            'ic_total_pts': ic_a_cho,
            'sources': {
                'volatilite_historique': {
                    'ic_pts': cv_cho,
                    'part_pct': pct(cv_cho, ic_a_cho),
                    'label': 'Variabilité passée du chômage'
                },
                'signaux_marches': {
                    'ic_pts': cm_cho,
                    'part_pct': pct(cm_cho, ic_a_cho),
                    'label': 'Défaillances, taux immo, CAC 40...'
                },
                'incertitude_bdf': {
                    'ic_pts': cr_cho,
                    'part_pct': pct(cr_cho, ic_a_cho),
                    'label': 'Structure log-normale + résiduel'
                }
            },
            'contribution_mediane': {
                'signaux_marches_pt': contrib_mkt_median_cho,
                'incertitude_bdf_sigma': bdf_sigma_cho,
                'label': 'Déplacement de la prévision centrale'
            }
        },
        'correlation_phillips': PHILLIPS_CORRELATION,
        'note': (
            f'IC = intervalle p90-p10 à 12 mois. 3 × {N_SIMULATIONS} simulations bivariées (corrélation Phillips ρ={PHILLIPS_CORRELATION}).'
        )
    }


# ============================================================================
# BACKTESTING ET CACHE (hérité v6)
# ============================================================================

def archive_current_predictions(data: Dict, predictions: Dict) -> None:
    historique = data.get('previsions_historique', [])
    inf_mc = predictions.get('inflation', {}).get('mensuel', {})
    cho_mc = predictions.get('chomage', {}).get('trimestriel', {})

    entry = {
        'date':              datetime.now().strftime('%Y-%m-%d'),
        'semaine':           datetime.now().strftime('%Y-W%W'),
        'inflation_p50_12m': predictions.get('inflation', {}).get('prevision_12m'),
        'inflation_p10_12m': inf_mc.get('lower_bound', [None])[-1],
        'inflation_p90_12m': inf_mc.get('upper_bound', [None])[-1],
        'chomage_p50_q4':    predictions.get('chomage', {}).get('prevision_q4'),
        'chomage_p10_q4':    cho_mc.get('lower_bound', [None])[-1],
        'chomage_p90_q4':    cho_mc.get('upper_bound', [None])[-1],
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
    historique = data.get('previsions_historique', [])
    if not historique:
        return {'disponible': False, 'message': 'Première exécution — aucun historique disponible'}

    prev     = historique[-1]
    cur_inf  = safe_float(current_predictions.get('inflation', {}).get('prevision_12m'))
    cur_cho  = safe_float(current_predictions.get('chomage', {}).get('prevision_q4'))
    prev_inf = safe_float(prev.get('inflation_p50_12m'))
    prev_cho = safe_float(prev.get('chomage_p50_q4'))

    drift_inf = round(cur_inf - prev_inf, 2) if prev_inf else None
    drift_cho = round(cur_cho - prev_cho, 2) if prev_cho else None

    cur_ms  = current_predictions.get('market_signals', {})
    prev_ms = prev.get('market_signals', {})
    deltas  = {}
    for key in ('inflation_adj', 'chomage_adj'):
        if cur_ms.get(key) is not None and prev_ms.get(key) is not None:
            deltas[f'signaux_{key}'] = round(
                safe_float(cur_ms[key]) - safe_float(prev_ms[key]), 3)

    cause_principale = None
    if deltas:
        cause_key = max(deltas, key=lambda k: abs(deltas[k]))
        cause_val = deltas[cause_key]
        if abs(cause_val) > 0.02:
            cause_principale = (
                f"{cause_key.replace('_', ' ')} : "
                f"{'↑' if cause_val > 0 else '↓'}{abs(cause_val):.3f}pt"
            )

    return {
        'disponible':     True,
        'date_reference': prev.get('date'),
        'inflation': {
            'precedent': prev_inf, 'actuel': cur_inf, 'derive_pt': drift_inf,
            'direction': ('↑' if drift_inf and drift_inf > 0.05
                          else '↓' if drift_inf and drift_inf < -0.05 else '→')
        },
        'chomage': {
            'precedent': prev_cho, 'actuel': cur_cho, 'derive_pt': drift_cho,
            'direction': ('↑' if drift_cho and drift_cho > 0.05
                          else '↓' if drift_cho and drift_cho < -0.05 else '→')
        },
        'cause_principale': cause_principale or 'Dérive mineure (<0.02pt)',
        'energie_change':   (f"{prev_ms['energie']} → {cur_ms['energie']}"
                             if cur_ms.get('energie') != prev_ms.get('energie')
                             and prev_ms.get('energie') else None),
        'deltas_signaux': deltas
    }


def compute_backtesting(data: Dict) -> Dict:
    historique = data.get('previsions_historique', [])
    if len(historique) < 4:
        return {
            'disponible': False,
            'message': (
                f'Historique insuffisant ({len(historique)} semaine(s)). '
                f'Backtesting disponible dans ~{4 - len(historique)} semaine(s) '
                f'(significatif après 26).'
            ),
            'semaines_archivees': len(historique), 'semaines_necessaires': 26
        }

    inf_series   = data.get('inflation_salaires', [])
    inf_realises = {str(e.get('annee')): safe_float(e.get('inflation'))
                    for e in inf_series if e.get('inflation') is not None}

    erreurs_inf  = []
    comparaisons = []

    for entry in historique:
        date_prev = entry.get('date', '')
        if not date_prev:
            continue
        try:
            dt = datetime.strptime(date_prev, '%Y-%m-%d')
        except ValueError:
            continue

        annee_cible = str(dt.year + 1) if dt.month >= 7 else str(dt.year)
        realise_inf = inf_realises.get(annee_cible)
        prevu_inf   = safe_float(entry.get('inflation_p50_12m'))

        comparaison = {
            'date_prevision': date_prev, 'horizon_cible': annee_cible,
            'inflation': {'prevu': prevu_inf, 'realise': realise_inf, 'erreur': None}
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
        direction = ('sur-estime' if biais_inf > 0.1 else
                     'sous-estime' if biais_inf < -0.1 else 'non biaisé')
        interpretation.append(f"Biais inflation : {biais_inf:+.2f}pt ({direction})")

    return {
        'disponible': True,
        'semaines_archivees': len(historique),
        'comparaisons_evaluees': len([c for c in comparaisons if c['inflation']['erreur'] is not None]),
        'metriques': {'inflation': {'mae_pt': mae_inf, 'biais_pt': biais_inf, 'n_observations': len(erreurs_inf)}},
        'interpretation': interpretation,
        'detail_comparaisons': comparaisons[-6:],
        'avertissement': ('Significativité statistique augmente avec le nombre d\'observations.'
                          if len(erreurs_inf) < 10 else None)
    }


# ============================================================================
# PRÉVISIONS INFLATION + CHÔMAGE (v7 — bivariées)
# ============================================================================

def predict_inflation_chomage_v7(
    current_inflation: float, bdf_inf_2026: float, bdf_inf_2027: float,
    current_chomage:   float, bdf_cho_2026: float, bdf_cho_2027: float,
    climat_affaires:   float = 100, difficultes_recrutement: float = 50,
    market_signals:    Dict = None, volatilites: Dict = None
) -> Tuple[Dict, Dict]:
    """
    Simulation bivariée unique — inflation et chômage corrélés (Phillips).
    """
    month, year = get_month_year()
    quarter     = (month - 1) // 3 + 1

    # Cibles inflation
    base_inf          = bdf_inf_2026 if year <= 2026 else bdf_inf_2027
    climat_adj_inf    = (climat_affaires - 100) * 0.01
    market_adj_inf    = market_signals.get('inflation_adjustment', 0.0) if market_signals else 0.0
    target_inf        = max(0.0, min(6.0, base_inf + climat_adj_inf + market_adj_inf))
    vol_inf           = (volatilites or VOLATILITY_DEFAULTS)['inflation']

    # Cibles chômage
    base_cho          = bdf_cho_2026 if year <= 2026 else bdf_cho_2027
    climat_adj_cho    = (100 - climat_affaires) * 0.02
    recrutement_adj   = (50 - difficultes_recrutement) * 0.01
    market_adj_cho    = market_signals.get('chomage_adjustment', 0.0) if market_signals else 0.0
    target_cho        = max(5.0, min(12.0, base_cho + climat_adj_cho + recrutement_adj + market_adj_cho))
    vol_cho           = (volatilites or VOLATILITY_DEFAULTS)['chomage']

    print(f"   Cible inflation ajustée : {round(target_inf, 3)}% | Cible chômage : {round(target_cho, 3)}%")

    mc_inf, mc_cho = monte_carlo_bivariate(
        current_inf=current_inflation, target_inf=target_inf, vol_inf=vol_inf,
        current_cho=current_chomage,   target_cho=target_cho, vol_cho=vol_cho,
        horizon_inf=HORIZON_MONTHS, horizon_cho=HORIZON_QUARTERS,
        n_sims=N_SIMULATIONS, start_month=month,
        seasonal_inf=SEASONAL_INFLATION
    )

    # ── Construction résultats inflation ───────────────────────────────────
    periods_inf = []
    m, y = month, year
    for _ in range(HORIZON_MONTHS):
        m += 1
        if m > 12: m = 1; y += 1
        periods_inf.append(f"{y}-{m:02d}")

    asymetrie = mc_inf.get('asymetrie', {})

    inflation_result = {
        'actuel':        current_inflation,
        'prevision_6m':  mc_inf['p50'][5],
        'prevision_12m': mc_inf['p50'][-1],
        'tendance': ('hausse' if mc_inf['p50'][-1] > current_inflation + 0.2
                     else 'baisse' if mc_inf['p50'][-1] < current_inflation - 0.2 else 'stable'),
        'confidence': 0.85,
        'mensuel': {
            'predictions': mc_inf['p50'],
            'lower_bound': mc_inf['p10'],
            'upper_bound': mc_inf['p90'],
            'p25':         mc_inf['p25'],
            'p75':         mc_inf['p75'],
            'periods':     periods_inf,
            'methodology': (f'Monte Carlo bivarié ({N_SIMULATIONS} sim.) + '
                            f'log-normale + Phillips ρ={PHILLIPS_CORRELATION} (v7)')
        },
        'probabilites': {
            'inflation_sous_2pct':      mc_inf['probabilities']['below_2pct'],
            'inflation_cible_bce':      mc_inf['probabilities']['below_2pct'],
            'inflation_au_dessus_3pct': mc_inf['probabilities']['above_3pct'],
            'inflation_au_dessus_4pct': mc_inf['probabilities']['above_4pct'],
            'description': (
                f"{mc_inf['probabilities']['below_2pct']}% de chances que "
                f"l'inflation reste sous 2% à 12 mois"
            )
        },
        'facteurs': {
            'cible_bdf':           base_inf,
            'ajustement_climat':   round(climat_adj_inf, 3),
            'ajustement_marches':  round(market_adj_inf, 3),
            'energie_outlook':     market_signals.get('energie_outlook', 'stable') if market_signals else 'stable',
            'cible_ajustee':       round(target_inf, 3),
            'volatilite_utilisee': round(vol_inf, 3)
        },
        'asymetrie_ic': asymetrie,
        'insight': (
            f"Inflation médiane à 12 mois : {mc_inf['p50'][-1]}% "
            f"[IC 80% : {mc_inf['p10'][-1]}% - {mc_inf['p90'][-1]}%]. "
            f"Asymétrie : queue haute {asymetrie.get('queue_haute', '?')}pt "
            f"vs basse {asymetrie.get('queue_basse', '?')}pt. "
            f"{mc_inf['probabilities']['below_2pct']}% de probabilité de rester sous 2%."
        )
    }

    # ── Construction résultats chômage ─────────────────────────────────────
    periods_cho = []
    q, y = quarter, year
    for _ in range(HORIZON_QUARTERS):
        q += 1
        if q > 4: q = 1; y += 1
        periods_cho.append(f"T{q} {y}")

    final_cho    = mc_cho['_final_values']
    prob_sous_7  = round(sum(1 for v in final_cho if v < 7.0) / N_SIMULATIONS * 100, 1)
    prob_sous_75 = round(sum(1 for v in final_cho if v < 7.5) / N_SIMULATIONS * 100, 1)
    prob_sup_8   = round(sum(1 for v in final_cho if v > 8.0) / N_SIMULATIONS * 100, 1)

    chomage_result = {
        'actuel':       current_chomage,
        'prevision_q4': mc_cho['p50'][-1],
        'tendance': ('hausse' if mc_cho['p50'][-1] > current_chomage + 0.2
                     else 'baisse' if mc_cho['p50'][-1] < current_chomage - 0.2 else 'stable'),
        'confidence': 0.80,
        'trimestriel': {
            'predictions': mc_cho['p50'],
            'lower_bound': mc_cho['p10'],
            'upper_bound': mc_cho['p90'],
            'p25':         mc_cho['p25'],
            'p75':         mc_cho['p75'],
            'periods':     periods_cho,
            'methodology': (f'Monte Carlo bivarié ({N_SIMULATIONS} sim.) + '
                            f'Phillips ρ={PHILLIPS_CORRELATION} (v7)')
        },
        'probabilites': {
            'chomage_sous_7pct':      prob_sous_7,
            'chomage_sous_75pct':     prob_sous_75,
            'chomage_au_dessus_8pct': prob_sup_8,
        },
        'facteurs': {
            'cible_bdf':              base_cho,
            'ajustement_climat':      round(climat_adj_cho, 3),
            'ajustement_recrutement': round(recrutement_adj, 3),
            'ajustement_marches':     round(market_adj_cho, 3),
            'cible_ajustee':          round(target_cho, 3),
            'volatilite_utilisee':    round(vol_cho, 3),
            'correlation_phillips':   PHILLIPS_CORRELATION
        },
        'insight': (
            f"Chômage médian à Q4 : {mc_cho['p50'][-1]}% "
            f"[IC 80% : {mc_cho['p10'][-1]}% - {mc_cho['p90'][-1]}%]. "
            f"{prob_sous_7}% de probabilité de rester sous 7%."
        )
    }

    return inflation_result, chomage_result


# ============================================================================
# PRÉVISION SMIC + POUVOIR D'ACHAT RÉEL (nouveau v7)
# ============================================================================

def predict_smic_v7(
    current_smic_brut: float, current_smic_net: float,
    inflation_forecast: Dict, bdf_inflation_2027: float
) -> Dict:
    month, year = get_month_year()
    next_january = year + 1

    inflation_p50 = safe_float(inflation_forecast.get('prevision_12m'), 1.5)
    inflation_p10 = safe_float(inflation_forecast.get('mensuel', {}).get('lower_bound', [None])[-1],
                                inflation_p50 - 0.4)
    inflation_p25 = safe_float(inflation_forecast.get('mensuel', {}).get('p25', [None])[-1],
                                inflation_p50 - 0.3)
    inflation_p75 = safe_float(inflation_forecast.get('mensuel', {}).get('p75', [None])[-1],
                                inflation_p50 + 0.3)
    inflation_p90 = safe_float(inflation_forecast.get('mensuel', {}).get('upper_bound', [None])[-1],
                                inflation_p50 + 0.4)

    estimated_increase = round(max(1.0, inflation_p50 + 0.4), 1)
    fourchette_min     = round(max(0.8, inflation_p25 + 0.2), 1)
    fourchette_max     = round(max(1.5, inflation_p75 + 0.6), 1)

    new_brut = round(current_smic_brut * (1 + estimated_increase / 100), 2)
    new_net  = round(new_brut * 0.792, 2)

    # ── NOUVEAU v7 : Pouvoir d'achat SMIC réel ────────────────────────────
    # hausse_reelle = hausse_nominale - inflation_prevue (par percentile)
    pa_p50 = round(estimated_increase - inflation_p50, 2)
    pa_p10 = round(fourchette_min - inflation_p90, 2)   # pessimiste : SMIC bas, inflation haute
    pa_p90 = round(fourchette_max - inflation_p10, 2)   # optimiste  : SMIC haut, inflation basse

    # Gain/perte mensuel en euros bruts
    gain_euros_p50 = round(current_smic_brut * pa_p50 / 100, 1)
    gain_euros_p10 = round(current_smic_brut * pa_p10 / 100, 1)
    gain_euros_p90 = round(current_smic_brut * pa_p90 / 100, 1)

    pouvoir_achat_reel = {
        'hausse_reelle_p50_pct': pa_p50,
        'hausse_reelle_p10_pct': pa_p10,
        'hausse_reelle_p90_pct': pa_p90,
        'gain_mensuel_brut_p50_euros': gain_euros_p50,
        'gain_mensuel_brut_p10_euros': gain_euros_p10,
        'gain_mensuel_brut_p90_euros': gain_euros_p90,
        'interpretation': (
            f"En scénario médian, le pouvoir d'achat SMIC "
            f"{'progresse' if pa_p50 >= 0 else 'recule'} de "
            f"{abs(pa_p50):.1f}% en {next_january} "
            f"({'+' if gain_euros_p50 >= 0 else ''}{gain_euros_p50}€/mois brut). "
            f"Fourchette : [{pa_p10:+.1f}% ; {pa_p90:+.1f}%]."
        ),
        'alerte_nao': (
            pa_p50 < 0.3
        ),
        'message_nao': (
            f"⚠️ Pouvoir d'achat en risque : demander +{round(estimated_increase + 0.5, 1)}% "
            f"minimum pour sécuriser un gain réel."
            if pa_p50 < 0.3 else
            f"✅ La revalorisation prévue (+{estimated_increase}%) préserve le pouvoir d'achat."
        )
    }

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
            'min': fourchette_min, 'max': fourchette_max,
            'source': 'Percentiles p25/p75 Monte Carlo inflation (v7)'
        }
    }]

    if inflation_p90 >= SMIC_AUTO_THRESHOLD:
        prob_auto = min(0.4, (inflation_p90 - SMIC_AUTO_THRESHOLD) * 0.3)
        if prob_auto > 0.1:
            auto_increase = round(inflation_p90 - 0.5, 1)
            events.append({
                'date':                    f"{next_january}-07-01",
                'type':                    'automatique',
                'probability':             round(prob_auto, 2),
                'estimated_increase_pct':  auto_increase,
                'estimated_new_smic_brut': round(current_smic_brut * (1 + auto_increase / 100), 2),
                'estimated_new_smic_net':  round(current_smic_brut * (1 + auto_increase / 100) * 0.792, 2),
                'trigger':     f'Inflation cumulée > 2% (p90: {inflation_p90}%)',
                'legal_basis': 'Code du travail, art. L3231-5',
                'confidence':  'basse'
            })

    return {
        'current': {
            'brut':         current_smic_brut,
            'net':          current_smic_net,
            'horaire_brut': round(current_smic_brut / 151.67, 2)
        },
        'events':       events,
        'forecast_12m': {
            'total_increase_pct': events[0]['estimated_increase_pct'],
            'final_smic_brut':    events[0]['estimated_new_smic_brut'],
            'final_smic_net':     events[0]['estimated_new_smic_net'],
            'fourchette':         events[0]['fourchette']
        },
        'pouvoir_achat_reel': pouvoir_achat_reel,
        'methodology': 'Règles légales + percentiles p10/p25/p75/p90 MC + pouvoir d\'achat réel (v7)'
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
# NOTES DE LECTURE (v7)
# ============================================================================

def generate_notes_lecture_v7(inflation, smic, chomage, whatif, data_quality,
                               market_signals, drift, backtesting, vol_report) -> List[str]:
    notes = []

    prob_sous_2 = inflation.get('probabilites', {}).get('inflation_sous_2pct', 50)
    asymetrie   = inflation.get('asymetrie_ic', {})
    notes.append(
        f"📈 Inflation médiane à 12 mois : {inflation['prevision_12m']}% "
        f"[{inflation['mensuel']['lower_bound'][-1]}% - {inflation['mensuel']['upper_bound'][-1]}%] — "
        f"{prob_sous_2}% de chances de rester sous 2%"
        + (f" (asymétrie : +{asymetrie.get('queue_haute','?')}pt / -{asymetrie.get('queue_basse','?')}pt)"
           if asymetrie else "")
    )

    if smic.get('events'):
        evt = smic['events'][0]
        f_  = evt.get('fourchette', {})
        pa  = smic.get('pouvoir_achat_reel', {})
        notes.append(
            f"💰 SMIC janvier {evt['date'][:4]} : {evt['estimated_new_smic_brut']:.0f}€ brut "
            f"(+{evt['estimated_increase_pct']}%, fourchette {f_.get('min','?')}-{f_.get('max','?')}%) — "
            f"Pouvoir d'achat réel : {pa.get('hausse_reelle_p50_pct', '?'):+.1f}% "
            f"({pa.get('gain_mensuel_brut_p50_euros', '?'):+.0f}€/mois)"
        )
        if pa.get('alerte_nao'):
            notes.append(f"⚠️ NAO : {pa.get('message_nao', '')}")

    notes.append(
        f"👥 Chômage Q4 : {chomage['prevision_q4']}% "
        f"[{chomage['trimestriel']['lower_bound'][-1]}% - {chomage['trimestriel']['upper_bound'][-1]}%] — "
        f"Tendance {chomage['tendance']} (corrélé Phillips ρ={PHILLIPS_CORRELATION})"
    )

    adj_inf = market_signals.get('inflation_adjustment', 0)
    adj_cho = market_signals.get('chomage_adjustment', 0)
    pond    = market_signals.get('ponderation_temporelle', {})
    if abs(adj_inf) > 0.05 or abs(adj_cho) > 0.05:
        parts = []
        if abs(adj_inf) > 0.05:
            parts.append(f"{'↑' if adj_inf > 0 else '↓'} inflation {abs(adj_inf):.2f}pt")
        if abs(adj_cho) > 0.05:
            parts.append(f"{'↑' if adj_cho > 0 else '↓'} chômage {abs(adj_cho):.2f}pt")
        poids_min = min(pond.values()) if pond else 1.0
        parts.append(f"(poids temporel min : {poids_min:.2f})")
        notes.append(f"📊 Signaux marchés : {', '.join(parts)}")

    vol_inf = vol_report.get('inflation', {})
    if vol_inf.get('source') == 'historique INSEE':
        notes.append(
            f"📉 Volatilité calculée sur {vol_inf.get('n_points','?')} pts INSEE : "
            f"{vol_inf.get('vol_retenu')} (dynamique v6+)"
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
    notes.append(f"🎲 Scénario à surveiller : {most_likely['nom']} ({most_likely['probabilite']})")

    inf_prev      = inflation['prevision_12m']
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

def generate_predictions_v7(data: Dict) -> Dict:
    now = datetime.now()

    # 1. Archiver les prévisions précédentes
    prev_predictions = data.get('previsions_cftc', {})
    if prev_predictions:
        print("📦 Archivage des prévisions précédentes...")
        archive_current_predictions(data, prev_predictions)
        print(f"   Historique : {len(data.get('previsions_historique', []))} entrée(s)")

    # 2. Validation qualité
    print("🔍 Validation de la qualité des données...")
    data_quality = validate_data_quality(data)
    print(f"   Score: {data_quality['score']}/100 ({data_quality['niveau']})")
    for issue in data_quality['issues']:   print(f"   ❌ {issue}")
    for warning in data_quality['warnings']: print(f"   ⚠️  {warning}")

    # 3. Calibrage dynamique
    print("⚙️  Calibrage dynamique (v7)...")
    volatilites, vol_report = compute_dynamic_volatilities(data)
    def_ref, def_ref_label  = compute_adaptive_defaillances_ref(data)
    print(f"   Vol. inflation : {volatilites['inflation']} ({vol_report['inflation']['source']})")
    print(f"   Vol. chômage   : {volatilites['chomage']} ({vol_report['chomage']['source']})")
    print(f"   Réf. défaill.  : {def_ref:,.0f} ({def_ref_label})")

    # 4. Signaux marchés (avec pondération temporelle)
    print("📊 Extraction des signaux marchés (v7 — pondération temporelle)...")
    market_signals = extract_market_signals(data, def_ref)
    print(f"   Ajust. inflation : {market_signals['inflation_adjustment']:+.3f}pt")
    print(f"   Ajust. chômage   : {market_signals['chomage_adjustment']:+.3f}pt")
    print(f"   Énergie          : {market_signals['energie_outlook']}")
    pond = market_signals.get('ponderation_temporelle', {})
    if pond:
        print(f"   Poids temporels  : { {k: v for k, v in list(pond.items())[:3]} }...")

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
    current_smic_brut  = safe_float(smic_data.get('montant_brut'), 1823.03)
    current_smic_net   = safe_float(smic_data.get('montant_net'), 1443.11)

    # 6. Simulation bivariée (NOUVEAU v7)
    print(f"🎲 Simulation Monte Carlo BIVARIÉE inflation+chômage (v7, ρ={PHILLIPS_CORRELATION})...")
    inflation, chomage = predict_inflation_chomage_v7(
        current_inflation=inflation_actuel,
        bdf_inf_2026=bdf_inflation_2026, bdf_inf_2027=bdf_inflation_2027,
        current_chomage=chomage_actuel,
        bdf_cho_2026=bdf_chomage_2026, bdf_cho_2027=bdf_chomage_2027,
        climat_affaires=climat_affaires_val,
        difficultes_recrutement=difficultes_recrutement,
        market_signals=market_signals, volatilites=volatilites
    )

    # 7. SMIC + pouvoir d'achat réel
    print("📋 Calcul SMIC v7 (pouvoir d'achat réel)...")
    smic = predict_smic_v7(
        current_smic_brut=current_smic_brut, current_smic_net=current_smic_net,
        inflation_forecast=inflation, bdf_inflation_2027=bdf_inflation_2027
    )
    pa = smic.get('pouvoir_achat_reel', {})
    print(f"   Hausse nominale : +{smic['events'][0]['estimated_increase_pct']}%")
    print(f"   Pouvoir d'achat réel (médian) : {pa.get('hausse_reelle_p50_pct', '?'):+.1f}% "
          f"({pa.get('gain_mensuel_brut_p50_euros', '?'):+.0f}€/mois brut)")

    # 8. Scénarios
    print("🎯 Scénarios what-if...")
    whatif = generate_whatif_scenarios(
        inflation_actuel, chomage_actuel, bdf_inflation_2026, bdf_chomage_2026)

    # 9. Décomposition IC (bivariée)
    print("🔬 Décomposition IC (3 × 1000 simulations bivariées)...")
    target_inf_base = max(0.0, min(6.0,
        bdf_inflation_2026 + (climat_affaires_val - 100) * 0.01))
    target_cho_base = max(5.0, min(12.0,
        bdf_chomage_2026 + (100 - climat_affaires_val) * 0.02
        + (50 - difficultes_recrutement) * 0.01))
    uncertainty = compute_uncertainty_decomposition(
        current_inf=inflation_actuel, target_inf=target_inf_base, vol_inf=volatilites['inflation'],
        current_cho=chomage_actuel,   target_cho=target_cho_base, vol_cho=volatilites['chomage'],
        market_signals=market_signals
    )

    # 10. Dérive et backtesting
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

    # 11. Scénarios compatibles v3
    scenarios = {
        'optimiste': {
            'inflation_12m': inflation['mensuel']['p25'][-1],
            'chomage_q4':    chomage['trimestriel']['p25'][-1],
            'smic_increase': f"+{round(smic['events'][0]['estimated_increase_pct'] + 0.3, 1)}%",
            'hypotheses':    'Scénario favorable (percentile 25)'
        },
        'central': {
            'inflation_12m': inflation['prevision_12m'],
            'chomage_q4':    chomage['prevision_q4'],
            'smic_increase': f"+{smic['events'][0]['estimated_increase_pct']}%",
            'hypotheses':    'Scénario médian (BDF + marchés v7)'
        },
        'pessimiste': {
            'inflation_12m': inflation['mensuel']['p75'][-1],
            'chomage_q4':    chomage['trimestriel']['p75'][-1],
            'smic_increase': f"+{round(smic['events'][0]['estimated_increase_pct'] - 0.2, 1)}%",
            'hypotheses':    'Scénario défavorable (percentile 75)'
        }
    }

    # 12. Notes de lecture
    notes = generate_notes_lecture_v7(
        inflation, smic, chomage, whatif, data_quality,
        market_signals, drift, backtesting_result, vol_report
    )

    # 13. Assemblage final
    predictions = {
        'generated_at':  now.isoformat(),
        'model_version': 'CFTC v7.0 (bivarié Phillips + log-normale + pondération temporelle)',
        'n_simulations': N_SIMULATIONS,
        'horizon':       '12 mois',

        'data_quality':  data_quality,

        'calibrage': {
            'volatilites':            volatilites,
            'volatilites_report':     vol_report,
            'defaillances_ref':       def_ref,
            'defaillances_ref_label': def_ref_label,
            'mean_reversion_k':       MEAN_REVERSION_K,
            'phillips_correlation':   PHILLIPS_CORRELATION,
            'signal_decay_lambda':    SIGNAL_DECAY_LAMBDA,
            'lognormal_offset':       LOGNORMAL_OFFSET,
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
            'INSEE — IPC, emploi, salaires (volatilités dynamiques)',
            'Yahoo Finance / FRED — Marchés financiers (pondération temporelle v7)',
            'DARES — Défaillances (référence adaptive)',
            'Code du travail — Articles L3231-4 à L3231-11',
            f'Modèle CFTC v7.0 — Monte Carlo bivarié ({N_SIMULATIONS} simulations)'
        ],

        'methodology': {
            'type':        'Monte Carlo bivarié avec corrélation de Phillips',
            'simulations': N_SIMULATIONS,
            'nouveautes_v7': [
                f'Simulation bivariée inflation/chômage (corrélation Phillips ρ={PHILLIPS_CORRELATION})',
                'Distribution log-normale pour l\'inflation (asymétrie réaliste)',
                f'Pondération temporelle des signaux (demi-vie {round(0.693/SIGNAL_DECAY_LAMBDA, 0):.0f}j)',
                'Pouvoir d\'achat SMIC réel (p10/p50/p90 + euros/mois)',
            ]
        },

        'disclaimer': (
            "Prévisions probabilistes Monte Carlo bivarié enrichi par données de marché "
            "en temps réel. Corrélation de Phillips empirique France 20 ans (ρ=-0.35)."
        )
    }

    return predictions


# ============================================================================
# MAIN
# ============================================================================

def main(data_path: str = "public/data.json", output_path: str = None):
    print("=" * 65)
    print("🔮 CFTC Prévisions v7.0 — Bivarié Phillips + Log-normale")
    print("=" * 65)

    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    predictions = generate_predictions_v7(data)
    data['previsions_cftc'] = predictions

    # Nettoyer _final_values
    for section in ['inflation', 'chomage']:
        mc_key = 'mensuel' if section == 'inflation' else 'trimestriel'
        predictions.get(section, {}).get(mc_key, {}).pop('_final_values', None)

    output = output_path or data_path
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Prévisions v7 sauvegardées dans {output}")

    # Résumé
    print("\n" + "=" * 65)
    print("📊 RÉSUMÉ v7")
    print("=" * 65)

    cal = predictions['calibrage']
    ms  = predictions['market_signals']
    inf = predictions['inflation']
    cho = predictions['chomage']
    sk  = predictions['smic']
    pa  = sk.get('pouvoir_achat_reel', {})
    dr  = predictions['drift_analysis']
    bt  = predictions['backtesting']
    unc = predictions['uncertainty_decomposition']
    dq  = predictions['data_quality']

    print(f"\n🔍 QUALITÉ DONNÉES : {dq['score']}/100 ({dq['niveau']})")

    print(f"\n⚙️  CALIBRAGE v7")
    print(f"   Vol. inflation    : {cal['volatilites']['inflation']}")
    print(f"   Vol. chômage      : {cal['volatilites']['chomage']}")
    print(f"   Réf. défaill.     : {cal['defaillances_ref']:,.0f}")
    print(f"   Corrélation φ     : {cal['phillips_correlation']} (Phillips)")
    print(f"   Demi-vie signaux  : {round(0.693/SIGNAL_DECAY_LAMBDA,0):.0f}j")

    print(f"\n📊 SIGNAUX MARCHÉS")
    print(f"   Ajust. inflation : {ms['inflation_adjustment']:+.3f}pt")
    print(f"   Ajust. chômage   : {ms['chomage_adjustment']:+.3f}pt")
    print(f"   Énergie          : {ms['energie_outlook']}")

    print(f"\n📈 INFLATION (log-normale, bivariée)")
    print(f"   Actuelle    : {inf['actuel']}%")
    print(f"   Médiane 12m : {inf['prevision_12m']}%")
    print(f"   IC 80%      : [{inf['mensuel']['lower_bound'][-1]}% - {inf['mensuel']['upper_bound'][-1]}%]")
    asym = inf.get('asymetrie_ic', {})
    print(f"   Asymétrie   : +{asym.get('queue_haute','?')}pt / -{asym.get('queue_basse','?')}pt (ratio {asym.get('ratio','?')})")
    print(f"   P(< 2%)     : {inf['probabilites']['inflation_sous_2pct']}%")
    unc_inf = unc['inflation']
    print(f"   IC décomposé: vol={unc_inf['sources']['volatilite_historique']['part_pct']}% "
          f"| marchés={unc_inf['sources']['signaux_marches']['part_pct']}% "
          f"| BDF={unc_inf['sources']['incertitude_bdf']['part_pct']}%")

    print(f"\n👥 CHÔMAGE (bivarié Phillips)")
    print(f"   Actuel    : {cho['actuel']}%")
    print(f"   Médian Q4 : {cho['prevision_q4']}%")
    print(f"   IC 80%    : [{cho['trimestriel']['lower_bound'][-1]}% - {cho['trimestriel']['upper_bound'][-1]}%]")
    print(f"   P(< 7%)   : {cho['probabilites']['chomage_sous_7pct']}%")

    print(f"\n💰 SMIC + POUVOIR D'ACHAT RÉEL")
    if sk['events']:
        evt = sk['events'][0]
        f_  = evt.get('fourchette', {})
        print(f"   Janvier {evt['date'][:4]}  : +{evt['estimated_increase_pct']}% nominal")
        print(f"   Nouveau brut    : {evt['estimated_new_smic_brut']}€")
        print(f"   Fourchette      : [{f_.get('min')}% - {f_.get('max')}%]")
        print(f"   PA réel médian  : {pa.get('hausse_reelle_p50_pct', '?'):+.1f}% "
              f"({pa.get('gain_mensuel_brut_p50_euros', '?'):+.0f}€/mois brut)")
        print(f"   Fourchette PA   : [{pa.get('hausse_reelle_p10_pct','?'):+.1f}% ; "
              f"{pa.get('hausse_reelle_p90_pct','?'):+.1f}%]")
        if pa.get('alerte_nao'):
            print(f"   ⚠️  ALERTE NAO : {pa.get('message_nao','')}")

    print(f"\n🔄 DÉRIVE")
    if dr.get('disponible'):
        d_inf = dr.get('inflation', {})
        print(f"   {d_inf.get('precedent')}% → {d_inf.get('actuel')}% "
              f"({d_inf.get('direction')}{abs(d_inf.get('derive_pt', 0) or 0):.2f}pt) — "
              f"{dr.get('cause_principale','—')}")
    else:
        print(f"   {dr.get('message','—')}")

    print(f"\n📈 BACKTESTING")
    if bt.get('disponible'):
        m = bt.get('metriques', {}).get('inflation', {})
        print(f"   MAE : {m.get('mae_pt','—')}pt | Biais : {m.get('biais_pt','—')}pt")
    else:
        print(f"   {bt.get('message','—')}")

    print("\n📝 NOTES")
    for note in predictions['notes_lecture'][:6]:
        print(f"   • {note[:90]}...")

    print("\n" + "=" * 65)
    return data


if __name__ == "__main__":
    import sys
    data_path   = sys.argv[1] if len(sys.argv) > 1 else "public/data.json"
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    try:
        main(data_path, output_path)
    except FileNotFoundError:
        print(f"❌ Fichier non trouvé : {data_path}"); exit(1)
    except Exception as e:
        print(f"❌ Erreur : {e}")
        import traceback; traceback.print_exc(); exit(1)
