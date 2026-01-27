#!/usr/bin/env python3
"""
🔮 Module de Prévisions Économiques CFTC v2.0
=============================================

Intégré au pipeline fetch_data.py
Génère des prévisions basées sur :
- Données historiques (régression, moyennes mobiles)
- Indicateurs avancés (climat affaires, confiance ménages, énergie)
- Règles légales (SMIC)
- Prévisions institutionnelles (Banque de France, INSEE)

À appeler après fetch_data.py pour enrichir le data.json
"""

import json
import math
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional
import statistics

# ============================================================================
# CONFIGURATION
# ============================================================================

# Pondération des facteurs pour l'inflation
INFLATION_WEIGHTS = {
    'energie': 0.25,          # Prix énergie (très volatile)
    'alimentation': 0.15,     # Prix alimentaires
    'services': 0.35,         # Services (inertie salariale)
    'tendance': 0.25          # Tendance historique
}

# Paramètres du modèle de chômage (Loi d'Okun adaptée France)
OKUN_COEFFICIENT = -0.35      # Δchômage ≈ -0.35 × (croissance PIB - 1.3%)
POTENTIAL_GROWTH = 1.3        # Croissance potentielle France (%)

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

def moving_average(data: List[float], window: int = 3) -> List[float]:
    """Calcule la moyenne mobile"""
    if len(data) < window:
        return data
    result = []
    for i in range(len(data)):
        start = max(0, i - window + 1)
        result.append(sum(data[start:i+1]) / (i - start + 1))
    return result


def linear_regression(x: List[float], y: List[float]) -> Tuple[float, float]:
    """Régression linéaire simple, retourne (pente, ordonnée)"""
    n = len(x)
    if n < 2:
        return (0, y[0] if y else 0)
    
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi ** 2 for xi in x)
    
    denom = n * sum_x2 - sum_x ** 2
    if denom == 0:
        return (0, sum_y / n)
    
    slope = (n * sum_xy - sum_x * sum_y) / denom
    intercept = (sum_y - slope * sum_x) / n
    
    return (slope, intercept)


def calculate_volatility(data: List[float]) -> float:
    """Calcule l'écart-type des variations"""
    if len(data) < 3:
        return 0.5
    variations = [data[i] - data[i-1] for i in range(1, len(data))]
    return statistics.stdev(variations) if len(variations) > 1 else 0.5


def confidence_interval(predictions: List[float], volatility: float, confidence: float = 0.95) -> Tuple[List[float], List[float]]:
    """Calcule l'intervalle de confiance (95% par défaut)"""
    z = 1.96 if confidence == 0.95 else 1.645  # 95% ou 90%
    
    lower, upper = [], []
    for i, pred in enumerate(predictions):
        # L'incertitude croît avec √temps
        uncertainty = volatility * z * math.sqrt(i + 1) / 2
        lower.append(round(max(pred - uncertainty, -5), 2))  # Plancher à -5%
        upper.append(round(pred + uncertainty, 2))
    
    return lower, upper


# ============================================================================
# MODÈLE D'INFLATION
# ============================================================================

def predict_inflation_monthly(
    historical_annual: List[Dict],  # [{"annee": "2024", "inflation": 2.0}, ...]
    current_monthly: float,         # Dernière inflation mensuelle glissement annuel
    energy_outlook: str = "stable", # "hausse", "baisse", "stable"
    horizon_months: int = 12
) -> Dict:
    """
    Prédit l'inflation mensuelle sur l'horizon donné.
    
    Utilise :
    - La tendance des données annuelles
    - L'inflation mensuelle actuelle comme point de départ
    - Les anticipations sur l'énergie
    """
    
    # Extraire la tendance des données annuelles
    years = [int(h['annee']) for h in historical_annual[-5:]]
    values = [h['inflation'] for h in historical_annual[-5:]]
    
    if len(values) < 2:
        slope = 0
    else:
        x = list(range(len(values)))
        slope, _ = linear_regression(x, values)
    
    # Impact de l'énergie sur les prévisions
    energy_impact = {
        'hausse': 0.3,    # +0.3 pts si hausse énergie
        'baisse': -0.3,   # -0.3 pts si baisse
        'stable': 0
    }.get(energy_outlook, 0)
    
    # Point de départ : inflation actuelle
    current = current_monthly
    
    # Cible à moyen terme (convergence vers 2% BCE)
    target = 2.0
    convergence_speed = 0.08  # 8% de convergence par mois vers la cible
    
    predictions = []
    now = datetime.now()
    periods = []
    
    for i in range(1, horizon_months + 1):
        month_date = now + timedelta(days=30 * i)
        periods.append(month_date.strftime("%Y-%m"))
        
        # Modèle de convergence avec chocs
        # L'inflation converge lentement vers la cible BCE
        current = current + convergence_speed * (target - current)
        
        # Ajouter l'impact énergie (décroissant)
        decay = math.exp(-i / 6)
        current += energy_impact * decay * 0.1
        
        # Ajouter la tendance historique (faible poids)
        current += slope * 0.05
        
        # Saisonnalité légère
        month = month_date.month
        seasonal = 0.1 * math.sin((month - 3) * math.pi / 6)  # Pic en été
        
        pred = current + seasonal
        pred = max(-1, min(10, pred))  # Bornes réalistes
        predictions.append(round(pred, 2))
    
    # Volatilité et intervalle de confiance
    volatility = calculate_volatility(values) if len(values) > 2 else 0.8
    lower, upper = confidence_interval(predictions, volatility)
    
    # Score de confiance
    confidence_score = 0.85 - (horizon_months * 0.02)
    confidence_score = max(0.5, min(0.92, confidence_score))
    
    return {
        "predictions": predictions,
        "lower_bound": lower,
        "upper_bound": upper,
        "periods": periods,
        "confidence": round(confidence_score, 2),
        "current": current_monthly,
        "target_bce": target,
        "energy_outlook": energy_outlook,
        "methodology": "Convergence BCE + tendance historique + choc énergie"
    }


# ============================================================================
# MODÈLE SMIC - RÈGLES LÉGALES COMPLÈTES
# ============================================================================

def predict_smic_revalorisations(
    current_smic_brut: float,
    current_smic_net: float,
    last_revalorisation_date: str,  # "2026-01-01"
    inflation_forecast: List[float],
    inflation_periods: List[str],
    inflation_20pct_modifier: float = 0.3  # L'inflation des 20% les + modestes est souvent +0.3pts
) -> Dict:
    """
    Prédit les revalorisations du SMIC selon le Code du travail.
    
    RÈGLES LÉGALES (art. L3231-4 à L3231-11) :
    1. Revalorisation OBLIGATOIRE au 1er janvier de chaque année
       - Base = inflation des 20% les plus modestes depuis dernière reva
       - + 50% du gain de pouvoir d'achat du SHBOE (si positif)
    
    2. Revalorisation AUTOMATIQUE en cours d'année
       - Si l'IPC (ménages 20% les + modestes) augmente de +2% depuis dernière reva
       - Déclenchée le 1er du mois suivant le dépassement
    
    3. Coup de pouce gouvernemental possible (non prévisible)
    
    Cette fonction garantit : AU MINIMUM une revalorisation au 1er janvier prochain.
    """
    
    events = []
    running_smic_brut = current_smic_brut
    running_smic_net = current_smic_net
    
    # Parser la date de dernière revalorisation
    last_reva = datetime.strptime(last_revalorisation_date, "%Y-%m-%d")
    now = datetime.now()
    
    # Calculer l'inflation cumulée depuis la dernière revalorisation
    cumul_inflation = 0.0
    
    # Trouver le prochain 1er janvier
    next_january = datetime(now.year + 1, 1, 1)
    if now.month == 1 and now.day == 1:
        next_january = datetime(now.year + 1, 1, 1)
    elif now >= datetime(now.year, 1, 1) and last_reva >= datetime(now.year, 1, 1):
        # La reva de cette année a déjà eu lieu
        next_january = datetime(now.year + 1, 1, 1)
    
    # Parcourir les prévisions d'inflation
    for i, (period, inflation_ga) in enumerate(zip(inflation_periods, inflation_forecast)):
        year, month = map(int, period.split('-')[:2])
        period_date = datetime(year, month, 1)
        
        # Inflation mensuelle approximative
        monthly_inflation = inflation_ga / 12
        cumul_inflation += monthly_inflation
        
        # Inflation ajustée pour les 20% les plus modestes
        cumul_inflation_20pct = cumul_inflation + inflation_20pct_modifier * (i + 1) / 12
        
        # RÈGLE 2 : Vérifier le seuil des 2%
        if cumul_inflation_20pct >= 2.0:
            # Revalorisation automatique le 1er du mois suivant
            trigger_date = datetime(year, month, 1) + timedelta(days=32)
            trigger_date = datetime(trigger_date.year, trigger_date.month, 1)
            
            # Ne pas déclencher si c'est trop proche du 1er janvier (< 2 mois)
            days_to_january = (next_january - trigger_date).days
            if days_to_january > 60 and trigger_date > now:
                # Probabilité décroissante avec l'horizon
                months_ahead = i + 1
                prob = max(0.4, 0.90 - months_ahead * 0.08)
                
                increase_pct = round(cumul_inflation_20pct, 1)
                new_brut = round(running_smic_brut * (1 + increase_pct / 100), 2)
                new_net = round(new_brut * 0.792, 2)  # Ratio net/brut ~79.2%
                
                events.append({
                    "date": trigger_date.strftime("%Y-%m-%d"),
                    "type": "automatique",
                    "probability": round(prob, 2),
                    "estimated_increase_pct": increase_pct,
                    "estimated_new_smic_brut": new_brut,
                    "estimated_new_smic_net": new_net,
                    "trigger": f"Seuil 2% atteint : inflation cumulée {cumul_inflation_20pct:.1f}%",
                    "legal_basis": "Code du travail, art. L3231-5",
                    "confidence": "moyenne" if prob > 0.6 else "basse"
                })
                
                # Si probabilité élevée, mettre à jour pour la suite
                if prob > 0.7:
                    running_smic_brut = new_brut
                    running_smic_net = new_net
                    cumul_inflation = 0
                    last_reva = trigger_date
                    next_january = datetime(trigger_date.year + 1, 1, 1)
        
        # RÈGLE 1 : Revalorisation du 1er janvier
        if month == 1 and period_date >= next_january and period_date.year == next_january.year:
            # Estimation de l'augmentation : inflation prévue + éventuel rattrapage
            # On prend l'inflation cumulée depuis la dernière reva, ajustée
            estimated_inflation = max(cumul_inflation_20pct, sum(inflation_forecast[:i+1]) / (i+1))
            
            # Minimum historique ~1%, maximum réaliste ~4%
            increase_pct = round(max(1.0, min(4.0, estimated_inflation + 0.5)), 1)
            
            new_brut = round(running_smic_brut * (1 + increase_pct / 100), 2)
            new_net = round(new_brut * 0.792, 2)
            
            events.append({
                "date": f"{next_january.year}-01-01",
                "type": "janvier",
                "probability": 1.0,  # CERTAIN
                "estimated_increase_pct": increase_pct,
                "estimated_new_smic_brut": new_brut,
                "estimated_new_smic_net": new_net,
                "trigger": "Revalorisation annuelle légale obligatoire",
                "legal_basis": "Code du travail, art. L3231-4 et L3231-5",
                "confidence": "haute",
                "composition": {
                    "inflation_base": round(cumul_inflation_20pct, 1),
                    "ajustement_pouvoir_achat": round(increase_pct - cumul_inflation_20pct, 1)
                }
            })
            
            # Mettre à jour pour la suite
            running_smic_brut = new_brut
            running_smic_net = new_net
            cumul_inflation = 0
            last_reva = next_january
            next_january = datetime(next_january.year + 1, 1, 1)
    
    # S'assurer qu'il y a AU MOINS la reva du prochain janvier
    january_events = [e for e in events if e['type'] == 'janvier']
    if not january_events:
        # Ajouter la reva de janvier par défaut
        avg_inflation = sum(inflation_forecast) / len(inflation_forecast) if inflation_forecast else 1.5
        increase_pct = round(max(1.0, avg_inflation + 0.5), 1)
        new_brut = round(current_smic_brut * (1 + increase_pct / 100), 2)
        new_net = round(new_brut * 0.792, 2)
        
        events.insert(0, {
            "date": f"{next_january.year}-01-01",
            "type": "janvier",
            "probability": 1.0,
            "estimated_increase_pct": increase_pct,
            "estimated_new_smic_brut": new_brut,
            "estimated_new_smic_net": new_net,
            "trigger": "Revalorisation annuelle légale obligatoire",
            "legal_basis": "Code du travail, art. L3231-4",
            "confidence": "haute"
        })
        running_smic_brut = new_brut
        running_smic_net = new_net
    
    # Trier par date
    events.sort(key=lambda x: x['date'])
    
    # Calcul du total sur 12 mois
    total_increase = ((running_smic_brut / current_smic_brut) - 1) * 100
    
    return {
        "current": {
            "brut": current_smic_brut,
            "net": current_smic_net,
            "horaire_brut": round(current_smic_brut / 151.67, 2),
            "last_revalorisation": last_revalorisation_date
        },
        "events": events,
        "forecast_12m": {
            "total_increase_pct": round(total_increase, 1),
            "final_smic_brut": round(running_smic_brut, 2),
            "final_smic_net": round(running_smic_net, 2),
            "final_horaire_brut": round(running_smic_brut / 151.67, 2)
        },
        "rules_summary": {
            "janvier": "Revalorisation OBLIGATOIRE chaque 1er janvier",
            "seuil_2pct": "Revalorisation AUTO si inflation +2% depuis dernière reva",
            "base_calcul": "Inflation des 20% ménages les plus modestes",
            "coup_de_pouce": "Possible mais non prévisible"
        },
        "methodology": "Règles légales Code du travail (L3231-4 à L3231-11) + prévisions inflation"
    }


# ============================================================================
# MODÈLE CHÔMAGE
# ============================================================================

def predict_unemployment_quarterly(
    historical: List[Dict],  # [{"trimestre": "T1 2025", "taux": 7.4}, ...]
    gdp_forecast: float,     # Croissance PIB prévue (%)
    business_climate: float, # Indicateur climat des affaires (100 = moyenne)
    horizon_quarters: int = 4
) -> Dict:
    """
    Prédit le taux de chômage trimestriel.
    
    Utilise la loi d'Okun adaptée à la France :
    Δchômage ≈ -0.35 × (croissance PIB - 1.3%)
    
    + ajustement selon le climat des affaires
    """
    
    # Extraire les valeurs historiques
    values = [h['taux'] for h in historical[-8:]]
    
    if len(values) < 2:
        return {"error": "Données historiques insuffisantes"}
    
    # Tendance récente (sur 4 trimestres)
    recent_trend = (values[-1] - values[-4]) / 4 if len(values) >= 4 else 0
    
    # Impact du PIB (loi d'Okun)
    okun_impact = OKUN_COEFFICIENT * (gdp_forecast - POTENTIAL_GROWTH)
    
    # Impact du climat des affaires
    # Climat > 100 = optimisme = embauches = baisse chômage
    climate_impact = (100 - business_climate) * 0.015
    
    # Point de départ
    current = values[-1]
    
    # Parser le dernier trimestre
    last_period = historical[-1]['trimestre']  # "T3 2025"
    parts = last_period.split()
    quarter = int(parts[0].replace('T', ''))
    year = int(parts[1])
    
    predictions = []
    periods = []
    
    for i in range(1, horizon_quarters + 1):
        quarter += 1
        if quarter > 4:
            quarter = 1
            year += 1
        
        periods.append(f"T{quarter} {year}")
        
        # Variation trimestrielle
        delta = (okun_impact + climate_impact) / 4
        delta += recent_trend * 0.3  # Inertie
        
        current = current + delta
        current = max(5.0, min(12.0, current))  # Bornes réalistes France
        
        predictions.append(round(current, 1))
        
        # Mise à jour pour le trimestre suivant (inertie)
        recent_trend = delta
    
    # Intervalle de confiance
    volatility = calculate_volatility(values) * 0.5  # Moins volatile que l'inflation
    lower, upper = confidence_interval(predictions, volatility)
    
    return {
        "predictions": predictions,
        "lower_bound": lower,
        "upper_bound": upper,
        "periods": periods,
        "current": values[-1],
        "factors": {
            "pib_forecast": gdp_forecast,
            "okun_impact": round(okun_impact, 2),
            "climate_index": business_climate,
            "climate_impact": round(climate_impact, 2),
            "recent_trend": round(recent_trend, 2)
        },
        "methodology": f"Loi d'Okun (coef={OKUN_COEFFICIENT}, potentiel={POTENTIAL_GROWTH}%) + climat affaires"
    }


# ============================================================================
# GÉNÉRATION DES PRÉVISIONS POUR data.json
# ============================================================================

def generate_predictions_for_data(data: Dict) -> Dict:
    """
    Génère les prévisions et les ajoute à la structure data existante.
    
    Args:
        data: Le dictionnaire data.json chargé
    
    Returns:
        Les prévisions à fusionner dans data['previsions_cftc']
    """
    
    now = datetime.now()
    
    # Récupérer les données nécessaires
    indicateurs = data.get('indicateurs_cles', {})
    inflation_hist = data.get('inflation_salaires', [])
    chomage_hist = data.get('chomage', [])
    smic = data.get('smic', {})
    prev_bdf = data.get('previsions', {}).get('banque_de_france', {})
    
    # === 1. PRÉVISIONS D'INFLATION ===
    current_inflation = indicateurs.get('inflation_annuelle', 1.5)
    
    # Déterminer l'outlook énergie basé sur le contexte
    prix_gazole = indicateurs.get('prix_gazole', 1.7)
    energy_outlook = 'baisse' if prix_gazole < 1.6 else 'hausse' if prix_gazole > 1.8 else 'stable'
    
    inflation_pred = predict_inflation_monthly(
        historical_annual=inflation_hist,
        current_monthly=current_inflation,
        energy_outlook=energy_outlook,
        horizon_months=12
    )
    
    # === 2. PRÉVISIONS SMIC ===
    current_smic_brut = smic.get('montant_brut', 1823.03)
    current_smic_net = smic.get('montant_net', 1443.11)
    last_reva = smic.get('date_vigueur', f"{now.year}-01-01")
    
    smic_pred = predict_smic_revalorisations(
        current_smic_brut=current_smic_brut,
        current_smic_net=current_smic_net,
        last_revalorisation_date=last_reva,
        inflation_forecast=inflation_pred['predictions'],
        inflation_periods=inflation_pred['periods']
    )
    
    # === 3. PRÉVISIONS CHÔMAGE ===
    gdp_forecast = prev_bdf.get('pib_croissance', {}).get(str(now.year), 1.0)
    if isinstance(gdp_forecast, str):
        gdp_forecast = float(gdp_forecast)
    business_climate = indicateurs.get('climat_affaires', 99)
    
    chomage_pred = predict_unemployment_quarterly(
        historical=chomage_hist,
        gdp_forecast=gdp_forecast,
        business_climate=business_climate,
        horizon_quarters=4
    )
    
    # === 4. SCÉNARIOS ===
    scenarios = {
        "optimiste": {
            "hypotheses": "Baisse énergie prolongée, reprise économique européenne",
            "inflation_12m": round(inflation_pred['lower_bound'][-1], 1),
            "chomage_q4": round(chomage_pred['lower_bound'][-1], 1),
            "smic_increase": "+2.5%",
            "pib": "+1.5%"
        },
        "central": {
            "hypotheses": "Scénario Banque de France / Consensus",
            "inflation_12m": round(inflation_pred['predictions'][-1], 1),
            "chomage_q4": round(chomage_pred['predictions'][-1], 1),
            "smic_increase": f"+{smic_pred['forecast_12m']['total_increase_pct']}%",
            "pib": f"+{gdp_forecast}%"
        },
        "pessimiste": {
            "hypotheses": "Tensions géopolitiques, hausse énergie, ralentissement mondial",
            "inflation_12m": round(inflation_pred['upper_bound'][-1], 1),
            "chomage_q4": round(chomage_pred['upper_bound'][-1], 1),
            "smic_increase": "+1.2%",
            "pib": "+0.5%"
        }
    }
    
    # === 5. ARGUMENTS NAO ===
    avg_inflation_6m = sum(inflation_pred['predictions'][:6]) / 6
    nao_arguments = {
        "argument_principal": f"Avec une inflation prévue autour de {avg_inflation_6m:.1f}% et un SMIC en hausse de {smic_pred['forecast_12m']['total_increase_pct']}% au 1er janvier, une augmentation d'au moins {max(2.0, avg_inflation_6m + 1):.1f}% est nécessaire pour maintenir le pouvoir d'achat et valoriser l'engagement des salariés.",
        "points_cles": [
            f"📈 Inflation prévue à 6 mois : {inflation_pred['predictions'][5]:.1f}% [IC 95%: {inflation_pred['lower_bound'][5]:.1f}% - {inflation_pred['upper_bound'][5]:.1f}%]",
            f"💰 SMIC prévu au 1er janvier {smic_pred['events'][0]['date'][:4]} : {smic_pred['events'][0]['estimated_new_smic_brut']:.0f}€ brut (+{smic_pred['events'][0]['estimated_increase_pct']}%)",
            f"👥 Chômage prévu fin {chomage_pred['periods'][-1]} : {chomage_pred['predictions'][-1]}% - le marché reste tendu",
            f"🏢 {indicateurs.get('difficultes_recrutement', 60)}% des entreprises ont des difficultés de recrutement"
        ],
        "phrase_choc": f"L'inflation cumulée depuis 2022 est de ~12%. Sans augmentation conséquente, les salariés continuent de perdre du pouvoir d'achat."
    }
    
    # === ASSEMBLER ===
    predictions = {
        "generated_at": now.isoformat(),
        "model_version": "CFTC v2.0",
        "horizon": "12 mois",
        
        "inflation": {
            "actuel": current_inflation,
            "prevision_6m": round(inflation_pred['predictions'][5], 1),
            "prevision_12m": round(inflation_pred['predictions'][-1], 1),
            "tendance": "hausse" if inflation_pred['predictions'][-1] > current_inflation else "baisse",
            "confidence": inflation_pred['confidence'],
            "mensuel": inflation_pred,
            "insight": f"L'inflation devrait {'remonter vers' if inflation_pred['predictions'][-1] > current_inflation else 'se stabiliser autour de'} {inflation_pred['predictions'][-1]:.1f}% d'ici fin {now.year}."
        },
        
        "smic": smic_pred,
        
        "chomage": {
            "actuel": indicateurs.get('taux_chomage_actuel', 7.5),
            "prevision_q4": chomage_pred['predictions'][-1],
            "tendance": "hausse" if chomage_pred['predictions'][-1] > indicateurs.get('taux_chomage_actuel', 7.5) + 0.2 else "baisse" if chomage_pred['predictions'][-1] < indicateurs.get('taux_chomage_actuel', 7.5) - 0.2 else "stable",
            "trimestriel": chomage_pred,
            "insight": f"Le marché du travail devrait rester {'tendu' if chomage_pred['predictions'][-1] < 8 else 'difficile'} avec un taux autour de {chomage_pred['predictions'][-1]}%."
        },
        
        "scenarios": scenarios,
        "nao_arguments": nao_arguments,
        
        "disclaimer": "Ces prévisions sont produites par un modèle statistique CFTC. Elles sont indicatives et ne constituent pas des conseils financiers. Les prévisions institutionnelles (Banque de France, INSEE) restent la référence officielle.",
        "sources": "Modèle CFTC basé sur : données INSEE, prévisions Banque de France, Code du travail"
    }
    
    return predictions


# ============================================================================
# FONCTION PRINCIPALE
# ============================================================================

def main(data_path: str = "public/data.json", output_path: str = None):
    """
    Charge data.json, génère les prévisions, et sauvegarde le résultat.
    """
    
    print("🔮 Génération des prévisions CFTC...")
    
    # Charger les données
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Générer les prévisions
    predictions = generate_predictions_for_data(data)
    
    # Ajouter au data
    data['previsions_cftc'] = predictions
    
    # Sauvegarder
    output = output_path or data_path
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Prévisions ajoutées à {output}")
    
    # Afficher un résumé
    print("\n" + "=" * 60)
    print("🔮 RÉSUMÉ DES PRÉVISIONS CFTC")
    print("=" * 60)
    
    print(f"\n📈 INFLATION")
    print(f"   Actuelle : {predictions['inflation']['actuel']}%")
    print(f"   Prévue 6 mois : {predictions['inflation']['prevision_6m']}%")
    print(f"   Tendance : {predictions['inflation']['tendance']}")
    
    print(f"\n💰 SMIC")
    if predictions['smic']['events']:
        evt = predictions['smic']['events'][0]
        print(f"   Prochaine revalorisation : {evt['date']}")
        print(f"   Type : {evt['type'].upper()}")
        print(f"   Hausse estimée : +{evt['estimated_increase_pct']}%")
        print(f"   Nouveau SMIC brut : {evt['estimated_new_smic_brut']:.2f}€")
        print(f"   Probabilité : {evt['probability'] * 100:.0f}%")
    
    print(f"\n👥 CHÔMAGE")
    print(f"   Actuel : {predictions['chomage']['actuel']}%")
    print(f"   Prévu Q4 : {predictions['chomage']['prevision_q4']}%")
    print(f"   Tendance : {predictions['chomage']['tendance']}")
    
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
        print("   Exécutez d'abord fetch_data.py pour générer les données.")
        exit(1)
    except Exception as e:
        print(f"❌ Erreur : {e}")
        exit(1)
