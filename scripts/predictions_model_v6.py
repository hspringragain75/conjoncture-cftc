#!/usr/bin/env python3
"""
🔮 Module de Prévisions Économiques CFTC v5.0
=============================================

AMÉLIORATIONS vs v4 :
─────────────────────
1. CORRECTION BUG : conversion type BDF string→float (boucle cassée → fix direct)
2. CORRECTION BUG : probabilités chômage calculées sur les 1000 simulations, pas la médiane
3. DONNÉES RÉELLES → MODÈLE : Brent, gaz TTF, CAC 40, EUR/USD, défaillances, IRL
   sont désormais utilisées comme indicateurs avancés pour ajuster les cibles
4. SMIC : hausse estimée liée aux percentiles MC de l'inflation (p25/p75)
5. VALIDATION : détection des données API échouées avant simulation
6. QUALITÉ DONNÉES : rapport de confiance injecté dans le JSON de sortie

ARCHITECTURE :
─────────────
- Tous les calculs lourds côté Python (GitHub Actions / serveur)
- Frontend reçoit des résultats JSON pré-calculés
- Seed journalière pour reproductibilité intra-journée

Auteur: CFTC
Version: 5.0
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

VOLATILITY = {
    'inflation': 0.5,
    'chomage': 0.4,
    'pib': 0.8
}

SEASONAL_INFLATION = {
    1: 0.10, 2: 0.00, 3: 0.00, 4: 0.05,
    5: 0.00, 6: 0.00, 7: 0.08, 8: 0.08,
    9: 0.12, 10: 0.00, 11: 0.00, 12: -0.05
}

ELASTICITIES = {
    'petrole_10pct': {'inflation': 0.15, 'chomage': 0.05},
    'gaz_50pct': {'inflation': 0.30, 'chomage': 0.08},
    'climat_affaires_10pts': {'chomage': -0.20},
    'taux_bce_1pt': {'inflation': -0.15, 'chomage': 0.25},
}

SMIC_AUTO_THRESHOLD = 2.0

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


def normalize_zero(value: float) -> float:
    return 0.0 if value == 0 else value


def get_month_year(offset_months: int = 0) -> Tuple[int, int]:
    now = datetime.now()
    target = now + timedelta(days=offset_months * 30)
    return target.month, target.year


def safe_float(value, default: float = 0.0) -> float:
    """Conversion sécurisée vers float (corrige le bug de la v4)."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


# ============================================================================
# VALIDATION DES DONNÉES ENTRANTES
# ============================================================================

def validate_data_quality(data: Dict) -> Dict:
    """
    Vérifie la qualité des données avant la simulation.
    Retourne un rapport avec un score de confiance 0-100.
    """
    issues = []
    warnings = []
    score = 100

    indicateurs = data.get('indicateurs_cles', {})
    marches = data.get('marches_financiers', {})
    prev = data.get('previsions', {}).get('banque_de_france', {})

    # Vérif indicateurs clés
    if not indicateurs.get('inflation_annuelle'):
        issues.append("inflation_annuelle manquante — valeur par défaut utilisée")
        score -= 15
    if not indicateurs.get('taux_chomage_actuel'):
        issues.append("taux_chomage_actuel manquant — valeur par défaut utilisée")
        score -= 15
    if not indicateurs.get('climat_affaires'):
        warnings.append("climat_affaires absent — impact sur ajustements du modèle")
        score -= 5

    # Vérif prévisions BDF
    if not prev.get('inflation_ipch', {}).get('2026'):
        issues.append("Prévisions BDF inflation 2026 absentes — cible fixe utilisée")
        score -= 10
    if not prev.get('taux_chomage', {}).get('2026'):
        issues.append("Prévisions BDF chômage 2026 absentes — cible fixe utilisée")
        score -= 10

    # Vérif marchés financiers (indicateurs avancés)
    brent = marches.get('petrole_brent', {})
    if brent.get('valeur'):
        brent_source = brent.get('source', 'inconnu')
        if 'fallback' in brent_source.lower() or 'statique' in brent_source.lower():
            warnings.append(f"Brent: données statiques (source: {brent_source})")
            score -= 3
    else:
        warnings.append("Brent non disponible — ajustement énergie désactivé")
        score -= 3

    gaz = marches.get('gaz_naturel', {})
    if not gaz.get('valeur'):
        warnings.append("Gaz TTF non disponible")
        score -= 2

    defaillances = data.get('defaillances', {})
    if not defaillances.get('cumul_12_mois'):
        warnings.append("Défaillances non disponibles — signal avancé chômage manquant")
        score -= 2

    irl = data.get('irl', {})
    if not irl.get('glissement_annuel'):
        warnings.append("IRL non disponible — signal loyers manquant")
        score -= 2

    return {
        'score': max(0, score),
        'niveau': 'excellent' if score >= 85 else 'bon' if score >= 70 else 'dégradé' if score >= 50 else 'faible',
        'issues': issues,
        'warnings': warnings,
        'timestamp': datetime.now().isoformat()
    }


# ============================================================================
# EXTRACTION DES INDICATEURS AVANCÉS DES MARCHÉS
# ============================================================================

def extract_market_signals(data: Dict) -> Dict:
    """
    Extrait les signaux des marchés financiers et données réelles
    pour enrichir les prévisions du modèle Monte Carlo.

    Retourne un dict avec les ajustements à appliquer aux cibles.
    """
    marches = data.get('marches_financiers', {})
    defaillances = data.get('defaillances', {})
    irl = data.get('irl', {})
    carburants = data.get('carburants', {})
    indicateurs = data.get('indicateurs_cles', {})

    signals = {
        'inflation_adjustment': 0.0,
        'chomage_adjustment': 0.0,
        'energie_outlook': 'stable',
        'details': {}
    }

    # ── Signal 1 : Prix du Brent (impact inflation énergie) ──────────────────
    brent = marches.get('petrole_brent', {})
    brent_val = safe_float(brent.get('valeur'))
    brent_var_an = safe_float(brent.get('variations', {}).get('ytd') or brent.get('variations', {}).get('an'))

    if brent_val > 0:
        # Référence neutre ~75$/baril. Chaque 10$ de déviation = ±0.10pt d'inflation
        brent_ref = 75.0
        brent_deviation = (brent_val - brent_ref) / 10.0
        brent_impact = brent_deviation * 0.10
        signals['inflation_adjustment'] += brent_impact
        signals['details']['brent'] = {
            'valeur': brent_val,
            'ref': brent_ref,
            'variation_ytd_pct': brent_var_an,
            'impact_inflation_pt': round(brent_impact, 3)
        }
        if brent_var_an and brent_var_an > 15:
            signals['energie_outlook'] = 'hausse'
        elif brent_var_an and brent_var_an < -10:
            signals['energie_outlook'] = 'baisse'

    # ── Signal 2 : Prix du gaz TTF ────────────────────────────────────────────
    gaz = marches.get('gaz_naturel', {})
    gaz_val = safe_float(gaz.get('valeur'))
    if gaz_val > 0:
        # Référence neutre ~35€/MWh. Impact modéré sur inflation services énergie
        gaz_ref = 35.0
        gaz_deviation = (gaz_val - gaz_ref) / 10.0
        gaz_impact = gaz_deviation * 0.05  # Moins direct que le Brent pour l'IPC
        signals['inflation_adjustment'] += gaz_impact
        signals['details']['gaz_ttf'] = {
            'valeur': gaz_val,
            'ref': gaz_ref,
            'impact_inflation_pt': round(gaz_impact, 3)
        }
        if gaz_val > 50:
            signals['energie_outlook'] = 'hausse'

    # ── Signal 3 : EUR/USD (inflation importée) ───────────────────────────────
    eurusd = marches.get('eurusd', {})
    eurusd_val = safe_float(eurusd.get('valeur'))
    if eurusd_val > 0:
        # Euro faible → importations plus chères → inflation
        eurusd_ref = 1.08  # Référence neutre
        eurusd_deviation = (eurusd_ref - eurusd_val) / eurusd_ref
        # 5% de dépréciation = ~0.15pt d'inflation sur les importations
        eurusd_impact = eurusd_deviation * 3.0 * 0.05
        signals['inflation_adjustment'] += eurusd_impact
        signals['details']['eurusd'] = {
            'valeur': eurusd_val,
            'ref': eurusd_ref,
            'impact_inflation_pt': round(eurusd_impact, 3)
        }

    # ── Signal 4 : Défaillances d'entreprises (signal avancé chômage) ─────────
    cumul_def = safe_float(defaillances.get('cumul_12_mois'))
    var_def = safe_float(defaillances.get('variation_an'))

    if cumul_def > 0:
        # Hausse des défaillances précède le chômage de 2-3 trimestres
        # Référence: ~45 000 défaillances = neutre. +10 000 = +0.15pt chômage anticipé
        def_ref = 45000
        def_impact = (cumul_def - def_ref) / 10000 * 0.15
        signals['chomage_adjustment'] += max(-0.3, min(0.4, def_impact))
        signals['details']['defaillances'] = {
            'cumul_12m': cumul_def,
            'variation_an_pct': var_def,
            'impact_chomage_pt': round(signals['chomage_adjustment'], 3)
        }

    # ── Signal 5 : IRL (signal loyers → services → inflation) ────────────────
    irl_glissement = safe_float(irl.get('glissement_annuel'))
    if irl_glissement > 0:
        # L'IRL reflète l'inflation passée (6 mois décalé) → signal structurel services
        if irl_glissement > 3.0:
            signals['inflation_adjustment'] += 0.05  # Pression services logement
        elif irl_glissement < 1.0:
            signals['inflation_adjustment'] -= 0.03  # Détente services
        signals['details']['irl'] = {
            'glissement': irl_glissement,
            'signal': 'haussier' if irl_glissement > 3 else 'neutre' if irl_glissement > 1 else 'baissier'
        }

    # ── Signal 6 : CAC 40 (proxie confiance économique → chômage) ────────────
    cac = marches.get('cac40', {})
    cac_var_ytd = safe_float(cac.get('variations', {}).get('ytd'))
    if cac_var_ytd != 0:
        # CAC fortement négatif anticipé sur chômage (+6 mois)
        if cac_var_ytd < -10:
            signals['chomage_adjustment'] += 0.10
        elif cac_var_ytd > 10:
            signals['chomage_adjustment'] -= 0.05
        signals['details']['cac40_ytd'] = {
            'variation_ytd_pct': cac_var_ytd,
            'signal_chomage': 'dégradé' if cac_var_ytd < -10 else 'bon' if cac_var_ytd > 10 else 'neutre'
        }

    # ── Signal 7 : Prix carburants (impact pouvoir d'achat → inflation ressentie) ──
    sp95 = carburants.get('sp95', {})
    sp95_var_an = safe_float(sp95.get('variation_an'))
    if sp95_var_an != 0:
        carb_impact = sp95_var_an / 100 * 0.4  # Énergie pèse ~8% de l'IPC, élasticité 0.5
        signals['inflation_adjustment'] += carb_impact * 0.08
        signals['details']['carburants_sp95'] = {
            'variation_annuelle_pct': sp95_var_an,
            'impact_inflation_pt': round(carb_impact * 0.08, 3)
        }

    # Borner les ajustements pour éviter les valeurs aberrantes
    signals['inflation_adjustment'] = round(
        max(-0.5, min(0.8, signals['inflation_adjustment'])), 3)
    signals['chomage_adjustment'] = round(
        max(-0.3, min(0.5, signals['chomage_adjustment'])), 3)

    return signals


# ============================================================================
# SIMULATION MONTE CARLO
# ============================================================================

def monte_carlo_simulation(
    current: float,
    target: float,
    volatility: float,
    horizon: int,
    n_sims: int = N_SIMULATIONS,
    mean_reversion_speed: float = 0.15,
    seasonal_factors: Dict[int, float] = None,
    start_month: int = None
) -> Dict:
    if start_month is None:
        start_month, _ = get_month_year()

    trajectories = []

    for _ in range(n_sims):
        path = [current]
        month = start_month

        for h in range(horizon):
            month = (month % 12) + 1
            drift = mean_reversion_speed * (target - path[-1])
            monthly_vol = volatility / math.sqrt(12)
            shock = random.gauss(0, monthly_vol)
            seasonal = seasonal_factors.get(month, 0) if seasonal_factors else 0
            next_val = path[-1] + drift + shock + seasonal
            next_val = max(-2.0, min(next_val, 15.0))
            path.append(round(next_val, 2))

        trajectories.append(path[1:])

    results = {
        'p10': [], 'p25': [], 'p50': [],
        'p75': [], 'p90': [], 'mean': [], 'std': []
    }

    for h in range(horizon):
        values_at_h = [t[h] for t in trajectories]
        results['p10'].append(round(percentile(values_at_h, 10), 1))
        results['p25'].append(round(percentile(values_at_h, 25), 1))
        results['p50'].append(round(percentile(values_at_h, 50), 1))
        results['p75'].append(round(percentile(values_at_h, 75), 1))
        results['p90'].append(round(percentile(values_at_h, 90), 1))
        results['mean'].append(round(mean(values_at_h), 1))
        results['std'].append(round(stdev(values_at_h), 2))

    # ── CORRECTION v5 : probabilités sur les 1000 valeurs finales ──────────────
    final_values = [t[-1] for t in trajectories]
    results['probabilities'] = {
        'below_1pct': round(sum(1 for v in final_values if v < 1.0) / n_sims * 100, 1),
        'below_2pct': round(sum(1 for v in final_values if v < 2.0) / n_sims * 100, 1),
        'above_2pct': round(sum(1 for v in final_values if v > 2.0) / n_sims * 100, 1),
        'above_3pct': round(sum(1 for v in final_values if v > 3.0) / n_sims * 100, 1),
        'above_4pct': round(sum(1 for v in final_values if v > 4.0) / n_sims * 100, 1),
    }

    # Stocker les trajectoires individuelles pour les probabilités chômage
    results['_final_values'] = final_values

    return results


# ============================================================================
# PRÉVISION D'INFLATION (v5)
# ============================================================================

def predict_inflation_v5(
    current_inflation: float,
    bdf_target_2026: float,
    bdf_target_2027: float,
    climat_affaires: float = 100,
    market_signals: Dict = None
) -> Dict:
    month, year = get_month_year()

    base_target = bdf_target_2026 if year <= 2026 else bdf_target_2027

    # Ajustement climat des affaires
    climat_adjustment = (climat_affaires - 100) * 0.01

    # Ajustement via marchés financiers (nouveau en v5)
    market_adj = 0.0
    energie_outlook = 'stable'
    if market_signals:
        market_adj = market_signals.get('inflation_adjustment', 0.0)
        energie_outlook = market_signals.get('energie_outlook', 'stable')

    adjusted_target = base_target + climat_adjustment + market_adj
    adjusted_target = max(0.0, min(adjusted_target, 6.0))

    mc_results = monte_carlo_simulation(
        current=current_inflation,
        target=adjusted_target,
        volatility=VOLATILITY['inflation'],
        horizon=HORIZON_MONTHS,
        mean_reversion_speed=0.12,
        seasonal_factors=SEASONAL_INFLATION,
        start_month=month
    )

    periods = []
    m, y = month, year
    for _ in range(HORIZON_MONTHS):
        m += 1
        if m > 12:
            m = 1
            y += 1
        periods.append(f"{y}-{m:02d}")

    return {
        'actuel': current_inflation,
        'prevision_6m': mc_results['p50'][5],
        'prevision_12m': mc_results['p50'][-1],
        'tendance': (
            'hausse' if mc_results['p50'][-1] > current_inflation + 0.2
            else 'baisse' if mc_results['p50'][-1] < current_inflation - 0.2
            else 'stable'
        ),
        'confidence': 0.85,

        'mensuel': {
            'predictions': mc_results['p50'],
            'lower_bound': mc_results['p10'],
            'upper_bound': mc_results['p90'],
            'p25': mc_results['p25'],
            'p75': mc_results['p75'],
            'periods': periods,
            'methodology': f'Monte Carlo ({N_SIMULATIONS} simulations) + saisonnalité + marchés financiers (v5)'
        },

        'probabilites': {
            'inflation_sous_2pct': mc_results['probabilities']['below_2pct'],
            'inflation_cible_bce': mc_results['probabilities']['below_2pct'],
            'inflation_au_dessus_3pct': mc_results['probabilities']['above_3pct'],
            'inflation_au_dessus_4pct': mc_results['probabilities']['above_4pct'],
            'description': (
                f"{mc_results['probabilities']['below_2pct']}% de chances que l'inflation reste "
                f"sous 2% à 12 mois"
            )
        },

        'facteurs': {
            'cible_bdf': base_target,
            'ajustement_climat': round(climat_adjustment, 3),
            'ajustement_marches': round(market_adj, 3),
            'energie_outlook': energie_outlook,
            'cible_ajustee': round(adjusted_target, 3)
        },

        'insight': (
            f"Inflation médiane à 12 mois : {mc_results['p50'][-1]}% "
            f"[IC 80% : {mc_results['p10'][-1]}% - {mc_results['p90'][-1]}%]. "
            f"{mc_results['probabilities']['below_2pct']}% de probabilité de rester sous 2%."
        )
    }


# ============================================================================
# PRÉVISION DU CHÔMAGE (v5)
# ============================================================================

def predict_chomage_v5(
    current_chomage: float,
    bdf_target_2026: float,
    bdf_target_2027: float,
    climat_affaires: float = 100,
    difficultes_recrutement: float = 50,
    market_signals: Dict = None
) -> Dict:
    month, year = get_month_year()
    quarter = (month - 1) // 3 + 1

    base_target = bdf_target_2026 if year <= 2026 else bdf_target_2027

    # Ajustements habituels
    climat_adjustment = (100 - climat_affaires) * 0.02
    recrutement_adjustment = (50 - difficultes_recrutement) * 0.01

    # Ajustement via signaux marchés (nouveau en v5)
    market_adj = 0.0
    if market_signals:
        market_adj = market_signals.get('chomage_adjustment', 0.0)

    adjusted_target = base_target + climat_adjustment + recrutement_adjustment + market_adj
    adjusted_target = max(5.0, min(adjusted_target, 12.0))

    mc_results = monte_carlo_simulation(
        current=current_chomage,
        target=adjusted_target,
        volatility=VOLATILITY['chomage'],
        horizon=HORIZON_QUARTERS,
        mean_reversion_speed=0.20,
        seasonal_factors=None
    )

    periods = []
    q, y = quarter, year
    for _ in range(HORIZON_QUARTERS):
        q += 1
        if q > 4:
            q = 1
            y += 1
        periods.append(f"T{q} {y}")

    # ── CORRECTION v5 : probabilités sur les final_values ──────────────────────
    final_values = mc_results['_final_values']
    prob_sous_7 = round(sum(1 for v in final_values if v < 7.0) / N_SIMULATIONS * 100, 1)
    prob_au_dessus_8 = round(sum(1 for v in final_values if v > 8.0) / N_SIMULATIONS * 100, 1)
    prob_sous_75 = round(sum(1 for v in final_values if v < 7.5) / N_SIMULATIONS * 100, 1)

    return {
        'actuel': current_chomage,
        'prevision_q4': mc_results['p50'][-1],
        'tendance': (
            'hausse' if mc_results['p50'][-1] > current_chomage + 0.2
            else 'baisse' if mc_results['p50'][-1] < current_chomage - 0.2
            else 'stable'
        ),
        'confidence': 0.80,

        'trimestriel': {
            'predictions': mc_results['p50'],
            'lower_bound': mc_results['p10'],
            'upper_bound': mc_results['p90'],
            'p25': mc_results['p25'],
            'p75': mc_results['p75'],
            'periods': periods,
            'methodology': f'Monte Carlo ({N_SIMULATIONS} simulations) + marchés + défaillances (v5)'
        },

        'probabilites': {
            'chomage_sous_7pct': prob_sous_7,       # ← CORRIGÉ v5 (sur 1000 simulations)
            'chomage_sous_75pct': prob_sous_75,
            'chomage_au_dessus_8pct': prob_au_dessus_8,
        },

        'facteurs': {
            'cible_bdf': base_target,
            'ajustement_climat': round(climat_adjustment, 3),
            'ajustement_recrutement': round(recrutement_adjustment, 3),
            'ajustement_marches': round(market_adj, 3),
            'cible_ajustee': round(adjusted_target, 3)
        },

        'insight': (
            f"Chômage médian à Q4 : {mc_results['p50'][-1]}% "
            f"[IC 80% : {mc_results['p10'][-1]}% - {mc_results['p90'][-1]}%]. "
            f"{prob_sous_7}% de probabilité de rester sous 7%."
        )
    }


# ============================================================================
# PRÉVISION DU SMIC (v5)
# ============================================================================

def predict_smic_v5(
    current_smic_brut: float,
    current_smic_net: float,
    inflation_forecast: Dict,
    bdf_inflation_2027: float
) -> Dict:
    month, year = get_month_year()

    events = []
    running_brut = current_smic_brut

    # Janvier : revalorisation obligatoire
    next_january = year + 1 if month >= 1 else year

    # ── v5 : Hausse estimée basée sur les percentiles MC (p25 = optimiste, p75 = pessimiste)
    inflation_prevue_p50 = safe_float(inflation_forecast.get('prevision_12m'), 1.5)
    inflation_prevue_p25 = safe_float(
        inflation_forecast.get('mensuel', {}).get('p25', [None])[-1], inflation_prevue_p50 - 0.3)
    inflation_prevue_p75 = safe_float(
        inflation_forecast.get('mensuel', {}).get('p75', [None])[-1], inflation_prevue_p50 + 0.3)

    # Estimation centrale basée sur la médiane + marge historique (~0.3-0.5%)
    estimated_increase = round(max(1.0, inflation_prevue_p50 + 0.4), 1)
    fourchette_min = round(max(0.8, inflation_prevue_p25 + 0.2), 1)
    fourchette_max = round(max(1.5, inflation_prevue_p75 + 0.6), 1)

    new_brut = round(running_brut * (1 + estimated_increase / 100), 2)
    new_net = round(new_brut * 0.792, 2)

    events.append({
        'date': f"{next_january}-01-01",
        'type': 'janvier',
        'probability': 1.0,
        'estimated_increase_pct': estimated_increase,
        'estimated_new_smic_brut': new_brut,
        'estimated_new_smic_net': new_net,
        'trigger': 'Revalorisation annuelle obligatoire',
        'legal_basis': 'Code du travail, art. L3231-5',
        'confidence': 'haute',
        'fourchette': {
            'min': fourchette_min,
            'max': fourchette_max,
            'source': 'Percentiles p25/p75 Monte Carlo inflation'
        }
    })

    running_brut = new_brut

    # Revalorisation automatique (si scénario haut inflation)
    inflation_upper = safe_float(
        inflation_forecast.get('mensuel', {}).get('upper_bound', [2.0])[-1], 2.0)

    if inflation_upper >= SMIC_AUTO_THRESHOLD:
        prob_auto = min(0.4, (inflation_upper - SMIC_AUTO_THRESHOLD) * 0.3)
        if prob_auto > 0.1:
            auto_increase = round(inflation_upper - 0.5, 1)
            events.append({
                'date': f"{next_january}-07-01",
                'type': 'automatique',
                'probability': round(prob_auto, 2),
                'estimated_increase_pct': auto_increase,
                'estimated_new_smic_brut': round(running_brut * (1 + auto_increase / 100), 2),
                'estimated_new_smic_net': round(running_brut * (1 + auto_increase / 100) * 0.792, 2),
                'trigger': f'Inflation cumulée > 2% (scénario haut — p90: {inflation_upper}%)',
                'legal_basis': 'Code du travail, art. L3231-5',
                'confidence': 'basse'
            })

    return {
        'current': {
            'brut': current_smic_brut,
            'net': current_smic_net,
            'horaire_brut': round(current_smic_brut / 151.67, 2)
        },
        'events': events,
        'forecast_12m': {
            'total_increase_pct': events[0]['estimated_increase_pct'],
            'final_smic_brut': events[0]['estimated_new_smic_brut'],
            'final_smic_net': events[0]['estimated_new_smic_net'],
            'fourchette': events[0]['fourchette']
        },
        'methodology': f'Règles légales + Monte Carlo inflation v5 (p25/p75 percentiles)'
    }


# ============================================================================
# SCÉNARIOS WHAT-IF
# ============================================================================

def generate_whatif_scenarios(
    base_inflation: float,
    base_chomage: float,
    bdf_inflation: float,
    bdf_chomage: float
) -> Dict:
    scenarios = {}

    scenarios['choc_petrolier'] = {
        'nom': '🛢️ Choc pétrolier (+30%)',
        'description': 'Hausse brutale du prix du pétrole de 30%',
        'hypotheses': {'petrole': '+30%', 'gaz': '+20%'},
        'impact': {
            'inflation_12m': round(bdf_inflation + ELASTICITIES['petrole_10pct']['inflation'] * 3, 1),
            'chomage_q4': round(bdf_chomage + ELASTICITIES['petrole_10pct']['chomage'] * 3, 1),
            'smic_supp': '+0.5%'
        },
        'probabilite': '15%',
        'declencheur': 'Tensions géopolitiques Moyen-Orient'
    }

    scenarios['recession_ue'] = {
        'nom': '📉 Récession zone euro',
        'description': 'Contraction économique en Allemagne et Italie',
        'hypotheses': {'pib_ue': '-0.5%', 'climat': '-15pts'},
        'impact': {
            'inflation_12m': round(bdf_inflation - 0.4, 1),
            'chomage_q4': round(bdf_chomage + 0.5, 1),
            'smic_supp': '0%'
        },
        'probabilite': '20%',
        'declencheur': 'Crise industrielle allemande'
    }

    scenarios['hausse_taux'] = {
        'nom': '🏦 Hausse taux BCE (+1pt)',
        'description': 'Resserrement monétaire inattendu',
        'hypotheses': {'taux_bce': '+1pt', 'credit': '-10%'},
        'impact': {
            'inflation_12m': round(bdf_inflation + ELASTICITIES['taux_bce_1pt']['inflation'], 1),
            'chomage_q4': round(bdf_chomage + ELASTICITIES['taux_bce_1pt']['chomage'], 1),
            'smic_supp': '0%'
        },
        'probabilite': '10%',
        'declencheur': 'Inflation zone euro persistante'
    }

    scenarios['reprise_forte'] = {
        'nom': '🚀 Reprise économique forte',
        'description': 'Consommation et investissement repartent',
        'hypotheses': {'pib': '+2%', 'climat': '+10pts'},
        'impact': {
            'inflation_12m': round(bdf_inflation + 0.3, 1),
            'chomage_q4': round(bdf_chomage - 0.4, 1),
            'smic_supp': '+0.3% (coup de pouce possible)'
        },
        'probabilite': '25%',
        'declencheur': 'Confiance ménages, baisse épargne'
    }

    scenarios['crise_energie'] = {
        'nom': '⚡ Crise énergétique',
        'description': 'Rupture approvisionnement gaz',
        'hypotheses': {'gaz': '+100%', 'electricite': '+50%'},
        'impact': {
            'inflation_12m': round(bdf_inflation + ELASTICITIES['gaz_50pct']['inflation'] * 2, 1),
            'chomage_q4': round(bdf_chomage + ELASTICITIES['gaz_50pct']['chomage'] * 2, 1),
            'smic_supp': '+1% (revalorisation automatique probable)'
        },
        'probabilite': '10%',
        'declencheur': 'Conflit Russie-Ukraine escalade'
    }

    return scenarios


# ============================================================================
# NOTES DE LECTURE
# ============================================================================

def generate_notes_lecture_v5(
    inflation: Dict,
    smic: Dict,
    chomage: Dict,
    whatif: Dict,
    data_quality: Dict,
    market_signals: Dict
) -> List[str]:
    notes = []

    prob_sous_2 = inflation.get('probabilites', {}).get('inflation_sous_2pct', 50)
    notes.append(
        f"📈 Inflation médiane à 12 mois : {inflation['prevision_12m']}% "
        f"[{inflation['mensuel']['lower_bound'][-1]}% - {inflation['mensuel']['upper_bound'][-1]}%] — "
        f"{prob_sous_2}% de chances de rester sous 2%"
    )

    if smic.get('events'):
        evt = smic['events'][0]
        fourchet = evt.get('fourchette', {})
        notes.append(
            f"💰 SMIC janvier {evt['date'][:4]} : {evt['estimated_new_smic_brut']:.0f}€ brut "
            f"(+{evt['estimated_increase_pct']}%, fourchette {fourchet.get('min', '?')}-{fourchet.get('max', '?')}%) — Certain"
        )

    notes.append(
        f"👥 Chômage Q4 : {chomage['prevision_q4']}% "
        f"[{chomage['trimestriel']['lower_bound'][-1]}% - {chomage['trimestriel']['upper_bound'][-1]}%] — "
        f"Tendance {chomage['tendance']}"
    )

    if inflation['mensuel']['upper_bound'][-1] > 2.5:
        notes.append(
            f"⚠️ Risque haussier inflation : {inflation['mensuel']['upper_bound'][-1]}% "
            f"en scénario défavorable (p90)"
        )

    # Note sur les signaux marchés
    market_adj_inf = market_signals.get('inflation_adjustment', 0)
    market_adj_cho = market_signals.get('chomage_adjustment', 0)
    if abs(market_adj_inf) > 0.05 or abs(market_adj_cho) > 0.05:
        details = []
        if abs(market_adj_inf) > 0.05:
            details.append(f"marchés {'↑' if market_adj_inf > 0 else '↓'} inflation de {abs(market_adj_inf):.2f}pt")
        if abs(market_adj_cho) > 0.05:
            details.append(f"{'↑' if market_adj_cho > 0 else '↓'} chômage de {abs(market_adj_cho):.2f}pt")
        notes.append(f"📊 Signaux marchés : " + ", ".join(details))

    most_likely = max(whatif.values(), key=lambda x: float(x['probabilite'].replace('%', '')))
    notes.append(
        f"🎲 Scénario à surveiller : {most_likely['nom']} ({most_likely['probabilite']} de probabilité)"
    )

    inflation_prev = inflation['prevision_12m']
    smic_increase = smic['events'][0]['estimated_increase_pct'] if smic.get('events') else 2.0
    recommandation = max(inflation_prev + 0.5, smic_increase)
    notes.append(
        f"💡 Recommandation NAO : demander au minimum +{recommandation:.1f}% pour préserver le pouvoir d'achat"
    )

    if data_quality['score'] < 70:
        notes.append(
            f"⚠️ Qualité données : {data_quality['score']}/100 ({data_quality['niveau']}) — "
            f"{len(data_quality['issues'])} problème(s) détecté(s)"
        )

    return notes


# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def generate_predictions_v5(data: Dict) -> Dict:
    """Génère les prévisions CFTC v5 avec Monte Carlo + signaux marchés."""
    now = datetime.now()

    # ── 1. Validation qualité des données ─────────────────────────────────────
    print("🔍 Validation de la qualité des données...")
    data_quality = validate_data_quality(data)
    print(f"   Score: {data_quality['score']}/100 ({data_quality['niveau']})")
    for issue in data_quality['issues']:
        print(f"   ❌ {issue}")
    for warning in data_quality['warnings']:
        print(f"   ⚠️  {warning}")

    # ── 2. Extraction des signaux marchés ────────────────────────────────────
    print("📊 Extraction des signaux marchés...")
    market_signals = extract_market_signals(data)
    sig_inf = market_signals['inflation_adjustment']
    sig_cho = market_signals['chomage_adjustment']
    print(f"   Ajustement inflation : {sig_inf:+.3f}pt")
    print(f"   Ajustement chômage  : {sig_cho:+.3f}pt")
    print(f"   Énergie outlook      : {market_signals['energie_outlook']}")

    # ── 3. Extraction des paramètres ─────────────────────────────────────────
    indicateurs = data.get('indicateurs_cles', {})
    smic_data = data.get('smic', {})
    prev_bdf = data.get('previsions', {}).get('banque_de_france', {})
    climat = data.get('climat_affaires', {})

    inflation_actuel = safe_float(indicateurs.get('inflation_annuelle'), 1.5)
    chomage_actuel = safe_float(indicateurs.get('taux_chomage_actuel'), 7.5)
    climat_affaires = safe_float(indicateurs.get('climat_affaires') or climat.get('valeur_actuelle'), 100)
    difficultes_recrutement = safe_float(indicateurs.get('difficultes_recrutement'), 50)

    # ── CORRECTION v5 : conversion directe (la boucle de la v4 était cassée) ──
    bdf_inflation_2026 = safe_float(prev_bdf.get('inflation_ipch', {}).get('2026'), 1.4)
    bdf_inflation_2027 = safe_float(prev_bdf.get('inflation_ipch', {}).get('2027'), 1.6)
    bdf_chomage_2026 = safe_float(prev_bdf.get('taux_chomage', {}).get('2026'), 7.7)
    bdf_chomage_2027 = safe_float(prev_bdf.get('taux_chomage', {}).get('2027'), 7.5)

    current_smic_brut = safe_float(smic_data.get('montant_brut'), 1823.03)
    current_smic_net = safe_float(smic_data.get('montant_net'), 1443.11)

    # ── 4. Simulations Monte Carlo ────────────────────────────────────────────
    print("🎲 Simulation Monte Carlo inflation (v5)...")
    inflation = predict_inflation_v5(
        current_inflation=inflation_actuel,
        bdf_target_2026=bdf_inflation_2026,
        bdf_target_2027=bdf_inflation_2027,
        climat_affaires=climat_affaires,
        market_signals=market_signals
    )

    print("🎲 Simulation Monte Carlo chômage (v5)...")
    chomage = predict_chomage_v5(
        current_chomage=chomage_actuel,
        bdf_target_2026=bdf_chomage_2026,
        bdf_target_2027=bdf_chomage_2027,
        climat_affaires=climat_affaires,
        difficultes_recrutement=difficultes_recrutement,
        market_signals=market_signals
    )

    print("📋 Calcul SMIC v5 (percentiles MC)...")
    smic = predict_smic_v5(
        current_smic_brut=current_smic_brut,
        current_smic_net=current_smic_net,
        inflation_forecast=inflation,
        bdf_inflation_2027=bdf_inflation_2027
    )

    print("🎯 Génération scénarios what-if...")
    whatif = generate_whatif_scenarios(
        base_inflation=inflation_actuel,
        base_chomage=chomage_actuel,
        bdf_inflation=bdf_inflation_2026,
        bdf_chomage=bdf_chomage_2026
    )

    # Scénarios compatibles v3
    scenarios = {
        'optimiste': {
            'inflation_12m': inflation['mensuel']['p25'][-1],
            'chomage_q4': chomage['trimestriel']['p25'][-1],
            'smic_increase': f"+{round(smic['events'][0]['estimated_increase_pct'] + 0.3, 1)}%",
            'pib': f"+{round(safe_float(prev_bdf.get('pib_croissance', {}).get('2026'), 1.0) + 0.5, 1)}%",
            'hypotheses': 'Scénario favorable (percentile 25)'
        },
        'central': {
            'inflation_12m': inflation['prevision_12m'],
            'chomage_q4': chomage['prevision_q4'],
            'smic_increase': f"+{smic['events'][0]['estimated_increase_pct']}%",
            'pib': f"+{prev_bdf.get('pib_croissance', {}).get('2026', 1.0)}%",
            'hypotheses': 'Scénario médian (Banque de France + marchés v5)'
        },
        'pessimiste': {
            'inflation_12m': inflation['mensuel']['p75'][-1],
            'chomage_q4': chomage['trimestriel']['p75'][-1],
            'smic_increase': f"+{round(smic['events'][0]['estimated_increase_pct'] - 0.2, 1)}%",
            'pib': f"+{round(safe_float(prev_bdf.get('pib_croissance', {}).get('2026'), 1.0) - 0.5, 1)}%",
            'hypotheses': 'Scénario défavorable (percentile 75)'
        }
    }

    notes = generate_notes_lecture_v5(inflation, smic, chomage, whatif, data_quality, market_signals)

    # ── 5. Assemblage final ───────────────────────────────────────────────────
    predictions = {
        'generated_at': now.isoformat(),
        'model_version': 'CFTC v5.0 (Monte Carlo + marchés)',
        'n_simulations': N_SIMULATIONS,
        'horizon': '12 mois',

        'data_quality': data_quality,
        'market_signals': {
            k: v for k, v in market_signals.items() if k != 'details'
        },
        'market_signals_details': market_signals.get('details', {}),

        'inflation': inflation,
        'smic': smic,
        'chomage': chomage,
        'scenarios': scenarios,
        'whatif_scenarios': whatif,
        'notes_lecture': notes,

        'sources': [
            'Banque de France — Projections macroéconomiques',
            'INSEE — Indices des prix et climat des affaires',
            'Yahoo Finance / FRED — Marchés financiers (Brent, gaz, CAC)',
            'Code du travail — Articles L3231-4 à L3231-11',
            f'Modèle CFTC v5.0 — Monte Carlo ({N_SIMULATIONS} simulations) + signaux marchés'
        ],

        'methodology': {
            'type': 'Monte Carlo avec mean reversion + indicateurs marchés',
            'simulations': N_SIMULATIONS,
            'nouveautes_v5': [
                'Bug fix: conversion types BDF string→float',
                'Bug fix: probabilités chômage sur 1000 simulations (vs médiane)',
                'Ajustement cibles via marchés financiers réels (Brent, gaz, EUR/USD, CAC)',
                'Ajustement chômage via défaillances et signaux boursiers',
                'Fourchette SMIC basée sur percentiles p25/p75 inflation MC',
                'Rapport de qualité des données avant simulation',
            ],
            'features': [
                'Saisonnalité mensuelle (inflation)',
                'Indicateurs avancés : marchés financiers, défaillances, IRL',
                'Intervalles de confiance probabilistes (p10/p25/p50/p75/p90)',
                'Scénarios what-if pré-calculés',
                'Validation qualité données avant simulation'
            ]
        },

        'disclaimer': (
            "Prévisions probabilistes basées sur simulations Monte Carlo enrichies par les "
            "données de marché en temps réel. Les probabilités reflètent l'incertitude du modèle."
        )
    }

    return predictions


# ============================================================================
# MAIN
# ============================================================================

def main(data_path: str = "public/data.json", output_path: str = None):
    print("=" * 65)
    print("🔮 CFTC Prévisions v5.0 — Monte Carlo")
    print("=" * 65)

    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    predictions = generate_predictions_v5(data)
    data['previsions_cftc'] = predictions

    # Nettoyer les _final_values (volumineuses, usage interne uniquement)
    for section in ['inflation', 'chomage']:
        mc = predictions.get(section, {}).get(
            'mensuel' if section == 'inflation' else 'trimestriel', {})
        mc.pop('_final_values', None)

    output = output_path or data_path
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Prévisions v5 sauvegardées dans {output}")

    # Résumé
    print("\n" + "=" * 65)
    print("📊 RÉSUMÉ v5")
    print("=" * 65)

    inf = predictions['inflation']
    dq = predictions['data_quality']
    ms = predictions['market_signals']

    print(f"\n🔍 QUALITÉ DONNÉES : {dq['score']}/100 ({dq['niveau']})")
    if dq['issues']:
        print(f"   {len(dq['issues'])} issue(s) | {len(dq['warnings'])} warning(s)")

    print(f"\n📊 SIGNAUX MARCHÉS")
    print(f"   Ajust. inflation  : {ms['inflation_adjustment']:+.3f}pt")
    print(f"   Ajust. chômage    : {ms['chomage_adjustment']:+.3f}pt")
    print(f"   Énergie           : {ms['energie_outlook']}")

    print(f"\n📈 INFLATION")
    print(f"   Actuelle : {inf['actuel']}%")
    print(f"   Médiane 12m : {inf['prevision_12m']}%")
    print(f"   IC 80% : [{inf['mensuel']['lower_bound'][-1]}% - {inf['mensuel']['upper_bound'][-1]}%]")
    print(f"   P(< 2%) : {inf['probabilites']['inflation_sous_2pct']}%  ← sur 1000 simulations")

    cho = predictions['chomage']
    print(f"\n👥 CHÔMAGE")
    print(f"   Actuel : {cho['actuel']}%")
    print(f"   Médian Q4 : {cho['prevision_q4']}%")
    print(f"   IC 80% : [{cho['trimestriel']['lower_bound'][-1]}% - {cho['trimestriel']['upper_bound'][-1]}%]")
    print(f"   P(< 7%) : {cho['probabilites']['chomage_sous_7pct']}%  ← CORRIGÉ v5 (sur 1000 simulations)")

    smic = predictions['smic']
    if smic['events']:
        evt = smic['events'][0]
        fourchet = evt.get('fourchette', {})
        print(f"\n💰 SMIC")
        print(f"   Janvier {evt['date'][:4]} : +{evt['estimated_increase_pct']}%")
        print(f"   Nouveau brut : {evt['estimated_new_smic_brut']}€")
        print(f"   Fourchette p25/p75 : [{fourchet.get('min')}% - {fourchet.get('max')}%]  ← v5")

    print("\n📝 NOTES")
    for note in predictions['notes_lecture'][:4]:
        print(f"   • {note[:75]}...")

    print("\n" + "=" * 65)
    return data


if __name__ == "__main__":
    import sys
    data_path = sys.argv[1] if len(sys.argv) > 1 else "public/data.json"
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
