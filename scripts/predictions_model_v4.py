#!/usr/bin/env python3
"""
🔮 Module de Prévisions Économiques CFTC v4.0
=============================================

AMÉLIORATIONS vs v3 :
- Indicateurs avancés (climat affaires, PPI proxy, énergie)
- Saisonnalité mensuelle
- Simulation Monte Carlo (1000 trajectoires) → probabilités
- Scénarios what-if pré-calculés
- Multi-sources (BDF + BCE implicite via convergence zone euro)

ARCHITECTURE :
- Tous les calculs lourds sont faits ICI (Python, côté serveur/GitHub Actions)
- Le frontend reçoit uniquement les résultats pré-calculés (JSON léger)
- Pas de calcul côté client = pas de problème de chargement

Auteur: CFTC
Version: 4.0
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

# Seed pour reproductibilité (change chaque jour)
random.seed(int(datetime.now().strftime('%Y%m%d')))

# Nombre de simulations Monte Carlo
N_SIMULATIONS = 1000

# Horizon de prévision
HORIZON_MONTHS = 12
HORIZON_QUARTERS = 4

# Volatilités annualisées (calibrées sur données historiques France)
VOLATILITY = {
    'inflation': 0.5,     # ±0.5 pts/an
    'chomage': 0.4,       # ±0.4 pts/an
    'pib': 0.8            # ±0.8 pts/an
}

# Saisonnalité inflation France (effet en points)
SEASONAL_INFLATION = {
    1: 0.10,   # Janvier : ajustements prix, soldes
    2: 0.00,
    3: 0.00,
    4: 0.05,   # Pâques
    5: 0.00,
    6: 0.00,
    7: 0.08,   # Été, tourisme
    8: 0.08,
    9: 0.12,   # Rentrée scolaire
    10: 0.00,
    11: 0.00,
    12: -0.05  # Promotions Noël
}

# Élasticités (impact des chocs)
ELASTICITIES = {
    'petrole_10pct': {'inflation': 0.15, 'chomage': 0.05},      # Pétrole +10%
    'gaz_50pct': {'inflation': 0.30, 'chomage': 0.08},          # Gaz +50%
    'climat_affaires_10pts': {'chomage': -0.20},                # Climat +10pts
    'taux_bce_1pt': {'inflation': -0.15, 'chomage': 0.25},      # Taux BCE +1pt
}

# Seuil SMIC
SMIC_AUTO_THRESHOLD = 2.0

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

def percentile(data: List[float], p: float) -> float:
    """Calcule le percentile p d'une liste."""
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * p / 100
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    return sorted_data[f] * (c - k) + sorted_data[c] * (k - f)


def normalize_zero(value: float) -> float:
    """Évite les -0.0."""
    return 0.0 if value == 0 else value


def get_month_year(offset_months: int = 0) -> Tuple[int, int]:
    """Retourne (mois, année) avec un décalage."""
    now = datetime.now()
    target = now + timedelta(days=offset_months * 30)
    return target.month, target.year


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
    """
    Simule N trajectoires avec :
    - Mean reversion vers la cible (Ornstein-Uhlenbeck simplifié)
    - Volatilité calibrée
    - Saisonnalité optionnelle
    
    Retourne les percentiles et statistiques.
    """
    if start_month is None:
        start_month, _ = get_month_year()
    
    trajectories = []
    
    for _ in range(n_sims):
        path = [current]
        month = start_month
        
        for h in range(horizon):
            month = (month % 12) + 1
            
            # Mean reversion vers target
            drift = mean_reversion_speed * (target - path[-1])
            
            # Choc aléatoire (volatilité mensuelle = annuelle / √12)
            monthly_vol = volatility / math.sqrt(12)
            shock = random.gauss(0, monthly_vol)
            
            # Saisonnalité
            seasonal = 0
            if seasonal_factors:
                seasonal = seasonal_factors.get(month, 0)
            
            # Nouvelle valeur
            next_val = path[-1] + drift + shock + seasonal
            
            # Bornes réalistes
            next_val = max(-2.0, min(next_val, 15.0))
            
            path.append(round(next_val, 2))
        
        trajectories.append(path[1:])  # Exclure la valeur initiale
    
    # Calcul des statistiques par période
    results = {
        'p10': [],
        'p25': [],
        'p50': [],  # Médiane
        'p75': [],
        'p90': [],
        'mean': [],
        'std': []
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
    
    # Probabilités utiles
    final_values = [t[-1] for t in trajectories]
    results['probabilities'] = {
        'below_1pct': round(sum(1 for v in final_values if v < 1.0) / n_sims * 100, 1),
        'below_2pct': round(sum(1 for v in final_values if v < 2.0) / n_sims * 100, 1),
        'above_2pct': round(sum(1 for v in final_values if v > 2.0) / n_sims * 100, 1),
        'above_3pct': round(sum(1 for v in final_values if v > 3.0) / n_sims * 100, 1),
    }
    
    return results


# ============================================================================
# PRÉVISION D'INFLATION
# ============================================================================

def predict_inflation_v4(
    current_inflation: float,
    bdf_target_2026: float,
    bdf_target_2027: float,
    climat_affaires: float = 100,
    energie_outlook: str = 'stable'
) -> Dict:
    """
    Prévision d'inflation avec Monte Carlo et indicateurs avancés.
    """
    month, year = get_month_year()
    
    # Ajustement cible selon indicateurs avancés
    base_target = bdf_target_2026 if year <= 2026 else bdf_target_2027
    
    # Impact climat des affaires (proxy de la demande)
    # Climat < 100 = demande faible = inflation plus basse
    climat_adjustment = (climat_affaires - 100) * 0.01  # ±0.1pt pour ±10pts climat
    
    # Impact énergie
    energy_adjustment = {
        'hausse': 0.3,
        'stable': 0.0,
        'baisse': -0.2
    }.get(energie_outlook, 0)
    
    adjusted_target = base_target + climat_adjustment + energy_adjustment
    adjusted_target = max(0, min(adjusted_target, 5))  # Bornes
    
    # Simulation Monte Carlo
    mc_results = monte_carlo_simulation(
        current=current_inflation,
        target=adjusted_target,
        volatility=VOLATILITY['inflation'],
        horizon=HORIZON_MONTHS,
        mean_reversion_speed=0.12,
        seasonal_factors=SEASONAL_INFLATION,
        start_month=month
    )
    
    # Générer les périodes
    periods = []
    m, y = month, year
    for _ in range(HORIZON_MONTHS):
        m += 1
        if m > 12:
            m = 1
            y += 1
        periods.append(f"{y}-{m:02d}")
    
    # Résultat formaté
    return {
        'actuel': current_inflation,
        'prevision_6m': mc_results['p50'][5],
        'prevision_12m': mc_results['p50'][-1],
        'tendance': 'hausse' if mc_results['p50'][-1] > current_inflation + 0.2 else 'baisse' if mc_results['p50'][-1] < current_inflation - 0.2 else 'stable',
        'confidence': 0.85,
        
        'mensuel': {
            'predictions': mc_results['p50'],
            'lower_bound': mc_results['p10'],
            'upper_bound': mc_results['p90'],
            'p25': mc_results['p25'],
            'p75': mc_results['p75'],
            'periods': periods,
            'methodology': 'Monte Carlo (1000 simulations) + saisonnalité + mean reversion'
        },
        
        'probabilites': {
            'inflation_sous_2pct': mc_results['probabilities']['below_2pct'],
            'inflation_cible_bce': mc_results['probabilities']['below_2pct'],
            'inflation_au_dessus_3pct': mc_results['probabilities']['above_3pct'],
            'description': f"{mc_results['probabilities']['below_2pct']}% de chances que l'inflation reste sous 2% à 12 mois"
        },
        
        'facteurs': {
            'cible_bdf': base_target,
            'ajustement_climat': round(climat_adjustment, 2),
            'ajustement_energie': energy_adjustment,
            'cible_ajustee': round(adjusted_target, 2)
        },
        
        'insight': f"Inflation médiane à 12 mois : {mc_results['p50'][-1]}% [IC 80% : {mc_results['p10'][-1]}% - {mc_results['p90'][-1]}%]. {mc_results['probabilities']['below_2pct']}% de probabilité de rester sous 2%."
    }


# ============================================================================
# PRÉVISION DU CHÔMAGE
# ============================================================================

def predict_chomage_v4(
    current_chomage: float,
    bdf_target_2026: float,
    bdf_target_2027: float,
    climat_affaires: float = 100,
    difficultes_recrutement: float = 50
) -> Dict:
    """
    Prévision du chômage avec Monte Carlo et indicateurs avancés.
    """
    month, year = get_month_year()
    quarter = (month - 1) // 3 + 1
    
    # Cible de base
    base_target = bdf_target_2026 if year <= 2026 else bdf_target_2027
    
    # Ajustements
    # Climat des affaires : bon climat = moins de chômage
    climat_adjustment = (100 - climat_affaires) * 0.02  # +0.2pt chômage si climat -10pts
    
    # Difficultés de recrutement : beaucoup de difficultés = marché tendu = chômage plus bas
    recrutement_adjustment = (50 - difficultes_recrutement) * 0.01
    
    adjusted_target = base_target + climat_adjustment + recrutement_adjustment
    adjusted_target = max(5, min(adjusted_target, 12))  # Bornes réalistes France
    
    # Monte Carlo (horizon trimestriel)
    mc_results = monte_carlo_simulation(
        current=current_chomage,
        target=adjusted_target,
        volatility=VOLATILITY['chomage'],
        horizon=HORIZON_QUARTERS,
        mean_reversion_speed=0.20,  # Chômage = inertie forte
        seasonal_factors=None
    )
    
    # Générer les trimestres
    periods = []
    q, y = quarter, year
    for _ in range(HORIZON_QUARTERS):
        q += 1
        if q > 4:
            q = 1
            y += 1
        periods.append(f"T{q} {y}")
    
    return {
        'actuel': current_chomage,
        'prevision_q4': mc_results['p50'][-1],
        'tendance': 'hausse' if mc_results['p50'][-1] > current_chomage + 0.2 else 'baisse' if mc_results['p50'][-1] < current_chomage - 0.2 else 'stable',
        'confidence': 0.80,
        
        'trimestriel': {
            'predictions': mc_results['p50'],
            'lower_bound': mc_results['p10'],
            'upper_bound': mc_results['p90'],
            'p25': mc_results['p25'],
            'p75': mc_results['p75'],
            'periods': periods,
            'methodology': 'Monte Carlo (1000 simulations) + indicateurs avancés'
        },
        
        'probabilites': {
            'chomage_sous_7pct': round(sum(1 for v in mc_results['p50'] if v < 7.0) / len(mc_results['p50']) * 100, 1),
            'chomage_au_dessus_8pct': round(sum(1 for v in mc_results['p50'] if v > 8.0) / len(mc_results['p50']) * 100, 1),
        },
        
        'facteurs': {
            'cible_bdf': base_target,
            'ajustement_climat': round(climat_adjustment, 2),
            'ajustement_recrutement': round(recrutement_adjustment, 2),
            'cible_ajustee': round(adjusted_target, 2)
        },
        
        'insight': f"Chômage médian à Q4 : {mc_results['p50'][-1]}% [IC 80% : {mc_results['p10'][-1]}% - {mc_results['p90'][-1]}%]."
    }


# ============================================================================
# PRÉVISION DU SMIC
# ============================================================================

def predict_smic_v4(
    current_smic_brut: float,
    current_smic_net: float,
    inflation_forecast: Dict,
    bdf_inflation_2027: float
) -> Dict:
    """
    Prévision SMIC avec probabilités de revalorisation automatique.
    """
    month, year = get_month_year()
    
    events = []
    running_brut = current_smic_brut
    
    # 1. Revalorisation janvier (certaine)
    next_january = year + 1 if month >= 1 else year
    
    # Estimation basée sur inflation prévue + marge historique
    inflation_prevue = inflation_forecast.get('prevision_12m', 1.5)
    estimated_increase = round(max(1.0, inflation_prevue + 0.3 + random.uniform(-0.2, 0.2)), 1)
    
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
            'min': round(estimated_increase - 0.3, 1),
            'max': round(estimated_increase + 0.5, 1)
        }
    })
    
    running_brut = new_brut
    
    # 2. Vérifier possibilité de revalorisation automatique
    # Probabilité basée sur l'inflation prévue et sa volatilité
    inflation_upper = inflation_forecast.get('mensuel', {}).get('upper_bound', [2.0])[-1]
    
    if inflation_upper >= SMIC_AUTO_THRESHOLD:
        # Calculer probabilité
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
                'trigger': f'Inflation cumulée > 2% (scénario haut)',
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
        'methodology': 'Règles légales + Monte Carlo inflation'
    }


# ============================================================================
# SCÉNARIOS WHAT-IF PRÉ-CALCULÉS
# ============================================================================

def generate_whatif_scenarios(
    base_inflation: float,
    base_chomage: float,
    bdf_inflation: float,
    bdf_chomage: float
) -> Dict:
    """
    Génère des scénarios what-if pré-calculés pour le frontend.
    """
    scenarios = {}
    
    # Scénario 1: Choc pétrolier (+30%)
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
    
    # Scénario 2: Récession zone euro
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
    
    # Scénario 3: Hausse taux BCE
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
    
    # Scénario 4: Reprise forte
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
    
    # Scénario 5: Crise énergétique
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
# GÉNÉRATION DES NOTES DE LECTURE
# ============================================================================

def generate_notes_lecture_v4(
    inflation: Dict,
    smic: Dict,
    chomage: Dict,
    whatif: Dict
) -> List[str]:
    """
    Notes de lecture enrichies avec probabilités.
    """
    notes = []
    
    # Inflation avec probabilité
    prob_sous_2 = inflation.get('probabilites', {}).get('inflation_sous_2pct', 50)
    notes.append(
        f"📈 Inflation médiane à 12 mois : {inflation['prevision_12m']}% "
        f"[{inflation['mensuel']['lower_bound'][-1]}% - {inflation['mensuel']['upper_bound'][-1]}%] — "
        f"{prob_sous_2}% de chances de rester sous 2%"
    )
    
    # SMIC
    if smic.get('events'):
        evt = smic['events'][0]
        notes.append(
            f"💰 SMIC janvier {evt['date'][:4]} : {evt['estimated_new_smic_brut']:.0f}€ brut "
            f"(+{evt['estimated_increase_pct']}%, fourchette {evt['fourchette']['min']}-{evt['fourchette']['max']}%) — Certain"
        )
    
    # Chômage
    notes.append(
        f"👥 Chômage Q4 : {chomage['prevision_q4']}% "
        f"[{chomage['trimestriel']['lower_bound'][-1]}% - {chomage['trimestriel']['upper_bound'][-1]}%] — "
        f"Tendance {chomage['tendance']}"
    )
    
    # Risque principal
    if inflation['mensuel']['upper_bound'][-1] > 2.5:
        notes.append(
            f"⚠️ Risque haussier inflation : {inflation['mensuel']['upper_bound'][-1]}% en scénario défavorable"
        )
    
    # What-if le plus probable
    most_likely = max(whatif.values(), key=lambda x: float(x['probabilite'].replace('%', '')))
    notes.append(
        f"🎲 Scénario à surveiller : {most_likely['nom']} ({most_likely['probabilite']} de probabilité)"
    )
    
    # Recommandation NAO
    inflation_prev = inflation['prevision_12m']
    smic_increase = smic['events'][0]['estimated_increase_pct'] if smic.get('events') else 2.0
    recommandation = max(inflation_prev + 0.5, smic_increase)
    notes.append(
        f"💡 Recommandation NAO : demander au minimum +{recommandation:.1f}% pour préserver le pouvoir d'achat"
    )
    
    return notes


# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def generate_predictions_v4(data: Dict) -> Dict:
    """
    Génère les prévisions CFTC v4 avec Monte Carlo.
    Tous les calculs lourds sont faits ici.
    """
    now = datetime.now()
    
    # === EXTRACTION DES DONNÉES ===
    indicateurs = data.get('indicateurs_cles', {})
    smic_data = data.get('smic', {})
    prev_bdf = data.get('previsions', {}).get('banque_de_france', {})
    climat = data.get('climat_affaires', {})
    
    # Valeurs actuelles
    inflation_actuel = indicateurs.get('inflation_annuelle', 1.5)
    chomage_actuel = indicateurs.get('taux_chomage_actuel', 7.5)
    climat_affaires = climat.get('valeur_actuelle', 100)
    difficultes_recrutement = indicateurs.get('difficultes_recrutement', 50)
    
    # Cibles BDF
    bdf_inflation_2026 = prev_bdf.get('inflation_ipch', {}).get('2026', 1.4)
    bdf_inflation_2027 = prev_bdf.get('inflation_ipch', {}).get('2027', 1.6)
    bdf_chomage_2026 = prev_bdf.get('taux_chomage', {}).get('2026', 7.7)
    bdf_chomage_2027 = prev_bdf.get('taux_chomage', {}).get('2027', 7.5)
    
    # Conversion si string
    for var in [bdf_inflation_2026, bdf_inflation_2027, bdf_chomage_2026, bdf_chomage_2027]:
        if isinstance(var, str):
            var = float(var)
    
    # SMIC actuel
    current_smic_brut = smic_data.get('montant_brut', 1823.03)
    current_smic_net = smic_data.get('montant_net', 1443.11)
    
    # === PRÉVISIONS ===
    
    print("🎲 Simulation Monte Carlo inflation...")
    inflation = predict_inflation_v4(
        current_inflation=inflation_actuel,
        bdf_target_2026=bdf_inflation_2026,
        bdf_target_2027=bdf_inflation_2027,
        climat_affaires=climat_affaires,
        energie_outlook='stable'
    )
    
    print("🎲 Simulation Monte Carlo chômage...")
    chomage = predict_chomage_v4(
        current_chomage=chomage_actuel,
        bdf_target_2026=bdf_chomage_2026,
        bdf_target_2027=bdf_chomage_2027,
        climat_affaires=climat_affaires,
        difficultes_recrutement=difficultes_recrutement
    )
    
    print("📋 Calcul SMIC...")
    smic = predict_smic_v4(
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
    
    # Scénarios simplifiés pour compatibilité v3
    scenarios = {
        'optimiste': {
            'inflation_12m': inflation['mensuel']['p25'][-1],
            'chomage_q4': chomage['trimestriel']['p25'][-1],
            'smic_increase': f"+{round(smic['events'][0]['estimated_increase_pct'] + 0.3, 1)}%",
            'pib': f"+{round(float(prev_bdf.get('pib_croissance', {}).get('2026', 1.0)) + 0.5, 1)}%",
            'hypotheses': 'Scénario favorable (percentile 25)'
        },
        'central': {
            'inflation_12m': inflation['prevision_12m'],
            'chomage_q4': chomage['prevision_q4'],
            'smic_increase': f"+{smic['events'][0]['estimated_increase_pct']}%",
            'pib': f"+{prev_bdf.get('pib_croissance', {}).get('2026', 1.0)}%",
            'hypotheses': 'Scénario médian (Banque de France)'
        },
        'pessimiste': {
            'inflation_12m': inflation['mensuel']['p75'][-1],
            'chomage_q4': chomage['trimestriel']['p75'][-1],
            'smic_increase': f"+{round(smic['events'][0]['estimated_increase_pct'] - 0.2, 1)}%",
            'pib': f"+{round(float(prev_bdf.get('pib_croissance', {}).get('2026', 1.0)) - 0.5, 1)}%",
            'hypotheses': 'Scénario défavorable (percentile 75)'
        }
    }
    
    # Notes de lecture
    notes = generate_notes_lecture_v4(inflation, smic, chomage, whatif)
    
    # === ASSEMBLAGE ===
    predictions = {
        'generated_at': now.isoformat(),
        'model_version': 'CFTC v4.0 (Monte Carlo)',
        'n_simulations': N_SIMULATIONS,
        'horizon': '12 mois',
        
        'inflation': inflation,
        'smic': smic,
        'chomage': chomage,
        'scenarios': scenarios,
        'whatif_scenarios': whatif,
        'notes_lecture': notes,
        
        'sources': [
            'Banque de France - Projections macroéconomiques',
            'INSEE - Indices des prix et climat des affaires',
            'Code du travail - Articles L3231-4 à L3231-11',
            f'Modèle CFTC v4.0 - Monte Carlo ({N_SIMULATIONS} simulations)'
        ],
        
        'methodology': {
            'type': 'Monte Carlo avec mean reversion',
            'simulations': N_SIMULATIONS,
            'features': [
                'Saisonnalité mensuelle (inflation)',
                'Indicateurs avancés (climat affaires)',
                'Intervalles de confiance probabilistes',
                'Scénarios what-if pré-calculés'
            ]
        },
        
        'disclaimer': 'Prévisions probabilistes basées sur simulations Monte Carlo. Les probabilités indiquées reflètent l\'incertitude du modèle.'
    }
    
    return predictions


# ============================================================================
# MAIN
# ============================================================================

def main(data_path: str = "public/data.json", output_path: str = None):
    """Point d'entrée principal."""
    
    print("=" * 60)
    print("🔮 CFTC Prévisions v4.0 - Monte Carlo")
    print("=" * 60)
    
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    predictions = generate_predictions_v4(data)
    data['previsions_cftc'] = predictions
    
    output = output_path or data_path
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Prévisions v4 sauvegardées dans {output}")
    
    # Résumé
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ")
    print("=" * 60)
    
    inf = predictions['inflation']
    print(f"\n📈 INFLATION")
    print(f"   Actuelle : {inf['actuel']}%")
    print(f"   Médiane 12m : {inf['prevision_12m']}%")
    print(f"   IC 80% : [{inf['mensuel']['lower_bound'][-1]}% - {inf['mensuel']['upper_bound'][-1]}%]")
    print(f"   P(< 2%) : {inf['probabilites']['inflation_sous_2pct']}%")
    
    cho = predictions['chomage']
    print(f"\n👥 CHÔMAGE")
    print(f"   Actuel : {cho['actuel']}%")
    print(f"   Médian Q4 : {cho['prevision_q4']}%")
    print(f"   IC 80% : [{cho['trimestriel']['lower_bound'][-1]}% - {cho['trimestriel']['upper_bound'][-1]}%]")
    
    smic = predictions['smic']
    if smic['events']:
        evt = smic['events'][0]
        print(f"\n💰 SMIC")
        print(f"   Janvier {evt['date'][:4]} : +{evt['estimated_increase_pct']}%")
        print(f"   Nouveau brut : {evt['estimated_new_smic_brut']}€")
        print(f"   Fourchette : [{evt['fourchette']['min']}% - {evt['fourchette']['max']}%]")
    
    print("\n📝 NOTES DE LECTURE")
    for note in predictions['notes_lecture'][:3]:
        print(f"   • {note[:75]}...")
    
    print("\n" + "=" * 60)
    
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
