# 📊 Tableau de Bord Économique CFTC - Guide d'Administration

> Tableau de bord interactif des indicateurs économiques pour les négociations salariales (NAO), avec mise à jour automatique des données.

---

## 📑 Table des matières

1. [Vue d'ensemble](#-vue-densemble)
2. [Architecture du projet](#-architecture-du-projet)
3. [Sources de données](#-sources-de-données)
4. [Données automatiques vs manuelles](#-données-automatiques-vs-manuelles)
5. [Guide de mise à jour des données](#-guide-de-mise-à-jour-des-données)
6. [Système d'alertes et changelog](#-système-dalertes-et-changelog)
7. [Déploiement](#-déploiement)
8. [Développement local](#-développement-local)
9. [Dépannage](#-dépannage)

---

## 🎯 Vue d'ensemble

### Fonctionnalités principales

| Onglet | Contenu |
|--------|---------|
| 📈 Conjoncture | PIB, climat des affaires, défaillances d'entreprises |
| 🔮 Prévisions | Projections Banque de France, INSEE, consensus |
| 📉 Évolutions | Graphiques historiques des indicateurs |
| 💰 Pouvoir d'achat | Inflation vs salaires, panier familial CFTC |
| 💵 Salaires | SMIC, salaire médian, écarts H/F, PPV |
| 👥 Emploi | Chômage, seniors, emplois vacants, tensions |
| ⚙️ Travail | Temps de travail, télétravail, formation |
| 🗺️ Territoires | Données régionales |
| 🏠 Conditions | IRL, immobilier, carburants, taux d'effort |
| 📊 Inflation | Détail par poste de dépense |
| 📋 Conventions | Grilles salariales, conformité SMIC |
| 🇪🇺 Europe | Comparaisons européennes (Eurostat) |
| 🧮 Simulateur | Calculateur coût employeur NAO |
| 📖 Aide | Glossaire 120+ termes, méthodologie |

---

## 📁 Architecture du projet

```
conjoncture-cftc/
│
├── 📂 .github/
│   └── workflows/
│       └── update-and-deploy.yml    # ⚙️ Automatisation GitHub Actions
│
├── 📂 public/
│   └── data.json                    # 📊 Données économiques (généré)
│
├── 📂 scripts/
│   └── fetch_data.py                # 🐍 Script de récupération des données
│
├── 📂 src/
│   ├── App.jsx                      # ⚛️ Application React principale
│   ├── main.jsx                     # Point d'entrée React
│   └── index.css                    # Styles Tailwind
│
├── index.html                       # Page HTML racine
├── package.json                     # Dépendances npm
├── vite.config.js                   # Configuration Vite
└── README.md                        # Ce fichier
```

---

## 📡 Sources de données

### APIs utilisées

| Source | API | Données récupérées |
|--------|-----|-------------------|
| **INSEE** | SDMX (BDM) | Inflation, chômage, PIB, emploi, salaires, IRL |
| **DARES** | OpenDataSoft | Emplois vacants, emplois occupés |
| **data.gouv.fr** | REST | Prix des carburants |
| **Banque de France** | - | Défaillances d'entreprises |

### Séries INSEE utilisées

```python
SERIES_IDS = {
    # Inflation
    "inflation_ensemble": "001759970",
    "inflation_alimentation": "001764565",
    "inflation_energie": "001764645",
    
    # Chômage
    "chomage_total": "001688526",
    "chomage_jeunes": "001688537",
    "chomage_seniors": "001688530",
    
    # Emploi
    "part_cdd_interim": "010605904",
    "difficultes_recrutement": "001586762",
    
    # Salaires
    "smb_ensemble": "001567234",
    "salaire_net_femmes": "010752373",
    "salaire_net_hommes": "010752374",
    
    # Conditions de vie
    "irl": "001515333",
    "prix_immobilier": "010001868",
    
    # Conjoncture
    "pib_volume": "011794859",
    "climat_affaires": "001565530",
    "defaillances_cvs": "001656092",
}
```

### Datasets DARES

| Dataset ID | Contenu |
|------------|---------|
| `dares_emploivacants_brut_emploisvacants` | Nombre d'emplois vacants |
| `dares_emploivacants_brut_emploisoccupes` | Nombre d'emplois occupés |

---

## 🔄 Données automatiques vs manuelles

### ✅ Données AUTOMATIQUES (APIs)

Ces données sont récupérées automatiquement chaque lundi à 8h :

| Donnée | Source | Fréquence source |
|--------|--------|------------------|
| Inflation (IPC) | INSEE | Mensuel |
| Taux de chômage | INSEE | Trimestriel |
| PIB | INSEE | Trimestriel |
| Climat des affaires | INSEE | Mensuel |
| Défaillances | Banque de France | Mensuel |
| IRL | INSEE | Trimestriel |
| Prix carburants | data.gouv.fr | Temps réel |
| Prix immobilier | INSEE | Trimestriel |
| Emplois vacants | DARES | Trimestriel |

### ✏️ Données MANUELLES (à mettre à jour dans `fetch_data.py`)

| Donnée | Période de MàJ | Source | Fonction à modifier |
|--------|----------------|--------|---------------------|
| **SMIC** | Janvier | Journal Officiel | `smic = {...}` (ligne ~2070) |
| **Salaire médian** | Octobre | INSEE | `build_salaire_median_data()` |
| **PPV** | Mars | Urssaf | `build_ppv_data()` |
| **Écart H/F poste comparable** | Mars | INSEE Focus | `build_ecart_hf_data()` |
| **Tensions métiers (BMO)** | Avril | France Travail | `build_tensions_metiers_data()` |
| **Créations/destructions emploi** | Trimestriel | DARES MMO | `build_creations_destructions_data()` |
| **Comparaison UE** | Semestriel | Eurostat | `build_comparaison_ue_data()` |
| **Conventions collectives** | Après SMIC | Légifrance | `conventions_collectives` |
| **Paramètres simulateur** | Janvier | CAF/Urssaf | `build_simulateur_nao_data()` |
| **Panier familial CFTC** | Janvier | Prix produits | `build_panier_familial_data()` |
| **Prévisions BdF** | Trimestriel | Banque de France | `previsions.banque_de_france` |

---

## 📝 Guide de mise à jour des données

### 1. Mettre à jour le SMIC (Janvier)

Dans `fetch_data.py`, chercher le bloc `smic = {` (vers ligne 2070) :

```python
smic = {
    "montant_brut": 1823.03,      # ← Modifier
    "montant_net": 1443.11,       # ← Modifier
    "taux_horaire": 12.02,        # ← Modifier
    "date_vigueur": "2026-01-01", # ← Modifier
    # ...
}
```

### 2. Mettre à jour les conventions collectives

Chercher `"conventions_collectives"` et modifier les grilles :

```python
"conventions_collectives": {
    "smic_reference": {
        "mensuel": 1426.30,  # ← SMIC net à mettre à jour
        "annuel": 17116,
        "date": "Janvier 2026"
    },
    "branches": [
        {
            "id": "metallurgie",
            "nom": "Métallurgie",
            "statut": "conforme",  # ou "non_conforme"
            "grille": [
                {"niveau": "A1", "minimum_mensuel": 1480},  # ← Modifier
                # ...
            ]
        },
        # ...
    ]
}
```

### 3. Mettre à jour les prévisions Banque de France

Chercher `"previsions"` :

```python
"previsions": {
    "banque_de_france": {
        "date_publication": "Décembre 2025",  # ← Modifier
        "pib_croissance": {"2024": 1.1, "2025": 0.9, "2026": 1.0},  # ← Modifier
        "inflation_ipch": {"2024": 2.4, "2025": 1.6, "2026": 1.4},
        "taux_chomage": {"2024": 7.4, "2025": 7.6, "2026": 7.7},
        # ...
    }
}
```

### 4. Calendrier récapitulatif

| Mois | Actions à faire |
|------|-----------------|
| **Janvier** | SMIC, paramètres simulateur, panier familial |
| **Mars** | PPV (Urssaf), écart H/F |
| **Avril** | Tensions métiers (BMO France Travail) |
| **Juillet** | Comparaison UE (Eurostat) |
| **Octobre** | Salaire médian (INSEE) |
| **Trimestriel** | Créations/destructions emploi, prévisions |
| **Après revalorisation SMIC** | Vérifier conformité conventions |

---

## 🔔 Système d'alertes et changelog

### Alertes automatiques

Les alertes sont générées automatiquement par `build_alertes_automatiques()` selon ces critères :

| Condition | Type d'alerte |
|-----------|---------------|
| Inflation > 2% | ⚠️ Warning |
| Inflation < 1.5% | ✅ Success |
| Variation chômage ≥ 0.3 pts | ⚠️ Warning / ✅ Success |
| Chômage jeunes > 18% | ⚠️ Warning |
| PIB < 0 | 🔴 Danger |
| PIB > 0.5% | ✅ Success |
| SMIC revalorisé (< 60 jours) | ℹ️ Info |
| IRL > 3% | ⚠️ Warning |
| Défaillances +10% | ⚠️ Warning |

### Changelog manuel

Pour ajouter une entrée au changelog, modifier `build_changelog()` dans `fetch_data.py` :

```python
def build_changelog():
    changelog = [
        # ⬇️ AJOUTER LES NOUVELLES VERSIONS EN HAUT ⬇️
        {
            "version": "2.2.0",
            "date": "2026-02-15",
            "modifications": [
                {
                    "type": "feature",  # feature | fix | data | breaking
                    "titre": "Titre de la modification",
                    "description": "Description détaillée."
                }
            ]
        },
        # Versions précédentes...
    ]
    return changelog
```

| Type | Emoji | Usage |
|------|-------|-------|
| `feature` | ✨ | Nouvelle fonctionnalité |
| `fix` | 🔧 | Correction de bug |
| `data` | 📊 | Mise à jour de données |
| `breaking` | ⚠️ | Changement important |

---

## 🚀 Déploiement

### Déploiement automatique

Le workflow GitHub Actions s'exécute :
- **Automatiquement** : Chaque lundi à 8h (Paris)
- **Manuellement** : Via Actions > "Update and Deploy" > "Run workflow"

### Modifier la fréquence

Dans `.github/workflows/update-and-deploy.yml` :

```yaml
schedule:
  - cron: '0 7 * * 1'  # Lundi 8h (UTC+1)
  
# Exemples :
# '0 7 * * *'     → Tous les jours à 8h
# '0 7 * * 1,4'   → Lundi et jeudi à 8h
# '0 7 1 * *'     → Le 1er de chaque mois
```

### Forcer une mise à jour

1. Aller dans **Actions** > **Update and Deploy**
2. Cliquer **"Run workflow"**
3. Attendre ~2 minutes

---

## 🛠️ Développement local

### Prérequis

- Node.js 18+
- Python 3.9+
- npm ou yarn

### Installation

```bash
# Cloner le repo
git clone https://github.com/VOTRE-USERNAME/conjoncture-cftc.git
cd conjoncture-cftc

# Installer les dépendances Node
npm install

# Installer les dépendances Python (aucune requise, stdlib uniquement)
```

### Commandes

```bash
# Lancer le serveur de dev
npm run dev

# Mettre à jour les données
python scripts/fetch_data.py

# Build production
npm run build

# Prévisualiser le build
npm run preview
```

### Workflow de développement

1. Modifier `src/App.jsx` ou `scripts/fetch_data.py`
2. Tester localement avec `npm run dev`
3. Commit et push
4. Le déploiement se fait automatiquement

---

## 🔧 Dépannage

### Les données ne se mettent pas à jour sur le site

**Cause probable** : Cache du navigateur

**Solutions** :
1. `Ctrl + Shift + R` (rechargement forcé)
2. Vider le cache du navigateur
3. Ajouter un cache-buster dans `App.jsx` ligne 444 :
   ```jsx
   fetch(`./data.json?v=${Date.now()}`)
   ```

### Erreur "NameError: name 'xxx' is not defined"

**Cause** : Variable utilisée avant d'être définie dans `fetch_data.py`

**Solution** : Vérifier l'ordre des instructions dans `main()`

### Les APIs INSEE ne répondent pas

**Cause** : Timeout ou serveur INSEE indisponible

**Solution** : Le script utilise des données par défaut. Relancer plus tard.

### Le workflow GitHub échoue

1. Aller dans **Actions** > Cliquer sur le workflow échoué
2. Lire les logs d'erreur
3. Corriger le code et re-push

### Erreur de syntaxe Python

**Vérifier** :
- Crochets `[]` et accolades `{}` fermés
- Virgules entre les éléments de liste/dict
- Indentation correcte

---

## 📧 Contact

Pour toute question ou suggestion :
- **Email** : hspringragain@cftc.fr
- **Issues GitHub** : [Ouvrir une issue](https://github.com/VOTRE-USERNAME/conjoncture-cftc/issues)

---

## 📄 Licence

MIT - Libre d'utilisation et de modification.

---

Développé avec ❤️ pour la CFTC
