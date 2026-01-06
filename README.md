# 📊 Tableau de Bord Conjoncture Économique - CFTC

Un tableau de bord interactif affichant les indicateurs économiques clés pour les salariés, avec mise à jour automatique des données.

![Capture d'écran](https://via.placeholder.com/800x400?text=Conjoncture+CFTC)

## ✨ Fonctionnalités

- **Pouvoir d'achat** : Évolution comparée inflation/SMIC/salaires
- **Emploi** : Taux de chômage global et des jeunes
- **Inflation détaillée** : Par poste de dépense
- **Mise à jour automatique** : Chaque lundi via GitHub Actions

## 🚀 Déploiement sur GitHub Pages

### Étape 1 : Créer le repository GitHub

1. Allez sur [github.com](https://github.com) et connectez-vous
2. Cliquez sur **"New repository"** (bouton vert)
3. Nommez-le `conjoncture-cftc`
4. Laissez-le **Public**
5. Cliquez sur **"Create repository"**

### Étape 2 : Uploader les fichiers

**Option A - Via l'interface web (plus simple) :**

1. Sur la page de votre nouveau repo, cliquez sur **"uploading an existing file"**
2. Glissez-déposez tout le contenu du dossier `conjoncture-cftc`
3. Cliquez sur **"Commit changes"**

**Option B - Via Git (si vous connaissez) :**

```bash
cd conjoncture-cftc
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/conjoncture-cftc.git
git push -u origin main
```

### Étape 3 : Activer GitHub Pages

1. Allez dans **Settings** > **Pages** (menu de gauche)
2. Sous "Build and deployment" :
   - Source : **GitHub Actions**
3. C'est tout ! Le workflow se lance automatiquement.

### Étape 4 : Accéder à votre site

Après quelques minutes, votre site sera accessible à :

```
https://VOTRE-USERNAME.github.io/conjoncture-cftc/
```

## 🔄 Mise à jour automatique

Le workflow GitHub Actions (`update-and-deploy.yml`) :

- S'exécute **chaque lundi à 8h** (heure de Paris)
- Récupère les dernières données INSEE
- Met à jour le fichier `data.json`
- Redéploie le site automatiquement

Vous pouvez aussi déclencher une mise à jour manuelle :
1. Allez dans **Actions** > **Update Economic Data**
2. Cliquez sur **"Run workflow"**

## 📁 Structure du projet

```
conjoncture-cftc/
├── .github/
│   └── workflows/
│       └── update-and-deploy.yml   # Automatisation
├── public/
│   └── data.json                   # Données économiques
├── scripts/
│   └── fetch_data.py               # Script de récupération
├── src/
│   ├── App.jsx                     # Composant principal
│   ├── main.jsx                    # Point d'entrée
│   └── index.css                   # Styles
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🛠️ Développement local

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Mettre à jour les données manuellement
python scripts/fetch_data.py

# Construire pour la production
npm run build
```

## 📈 Sources de données

- **INSEE** : Inflation, chômage, emploi
- **Banque de France** : Négociations salariales
- **DARES** : Statistiques du marché du travail

## 📝 Personnalisation

### Modifier les données affichées

Éditez `public/data.json` ou améliorez `scripts/fetch_data.py` pour récupérer d'autres indicateurs.

### Changer la fréquence de mise à jour

Dans `.github/workflows/update-and-deploy.yml`, modifiez la ligne `cron` :

```yaml
schedule:
  - cron: '0 7 * * 1'  # Lundi 8h (Paris)
  # Exemples :
  # '0 7 * * *'     # Tous les jours à 8h
  # '0 7 1 * *'     # Le 1er de chaque mois
  # '0 7 * * 1,4'   # Lundi et jeudi
```

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

MIT - Libre d'utilisation et de modification.

---

Développé avec ❤️ pour la CFTC
