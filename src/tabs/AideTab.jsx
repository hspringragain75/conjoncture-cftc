import { useState } from 'react';

export default function AideTab({darkMode}) {
  const [openSection, setOpenSection] = useState('glossaire');
  
  // GLOSSAIRE ENRICHI - 100+ termes organisés par catégories
  const glossaire = [
    // ===== SALAIRES ET RÉMUNÉRATION =====
    { terme: "SMIC", definition: "Salaire Minimum Interprofessionnel de Croissance. Salaire horaire minimum légal en France (11,88€ brut/h en 2026), revalorisé au 1er janvier. Peut être augmenté en cours d'année si l'inflation dépasse 2%.", categorie: "Salaires", importance: "haute" },
    { terme: "SMH", definition: "Salaire Minimum Hiérarchique. Salaire minimum fixé par une convention collective pour chaque niveau/coefficient. Doit toujours être ≥ au SMIC, sinon la grille est dite 'non conforme'.", categorie: "Salaires", importance: "haute" },
    { terme: "Salaire brut", definition: "Rémunération avant déduction des cotisations salariales. C'est le montant inscrit sur le contrat de travail.", categorie: "Salaires", importance: "haute" },
    { terme: "Salaire net", definition: "Montant effectivement perçu par le salarié après déduction de toutes les cotisations salariales (environ 22-25% du brut).", categorie: "Salaires", importance: "haute" },
    { terme: "Salaire net imposable", definition: "Salaire net + CSG/CRDS non déductibles + part patronale mutuelle. C'est la base de calcul de l'impôt sur le revenu.", categorie: "Salaires", importance: "moyenne" },
    { terme: "Superbrut", definition: "Coût total employeur = Salaire brut + Cotisations patronales (~43% du brut avant réductions). Représente le vrai coût d'un salarié pour l'entreprise.", categorie: "Salaires", importance: "haute" },
    { terme: "Salaire médian", definition: "Salaire qui partage la population en deux : 50% gagnent moins, 50% gagnent plus. En France : ~2 100€ net/mois (2024). Plus représentatif que la moyenne.", categorie: "Salaires", importance: "moyenne" },
    { terme: "Salaire moyen", definition: "Total des salaires divisé par le nombre de salariés. Tiré vers le haut par les hauts salaires (~2 600€ net en France).", categorie: "Salaires", importance: "moyenne" },
    { terme: "Décile (D1, D9)", definition: "D1 = seuil sous lequel gagnent les 10% les moins payés. D9 = seuil au-dessus duquel gagnent les 10% les mieux payés. Rapport D9/D1 = mesure des inégalités.", categorie: "Salaires", importance: "moyenne" },
    { terme: "SHBOE", definition: "Salaire Horaire de Base des Ouvriers et Employés. Indicateur INSEE mesurant l'évolution des salaires hors primes.", categorie: "Salaires", importance: "basse" },
    { terme: "SMB", definition: "Salaire Mensuel de Base. Salaire brut mensuel hors primes, heures supplémentaires et avantages.", categorie: "Salaires", importance: "basse" },
    { terme: "Masse salariale", definition: "Total des rémunérations brutes versées par une entreprise sur une période. Base de calcul de nombreuses cotisations.", categorie: "Salaires", importance: "moyenne" },
    { terme: "Ancienneté (prime)", definition: "Majoration de salaire liée à l'ancienneté dans l'entreprise. Souvent prévue par les conventions collectives (ex: +3% par tranche de 3 ans).", categorie: "Salaires", importance: "moyenne" },
    { terme: "13ème mois", definition: "Prime annuelle équivalente à un mois de salaire, versée en fin d'année. Prévue par certaines conventions ou accords d'entreprise.", categorie: "Salaires", importance: "moyenne" },
    
    // ===== PRIMES ET ÉPARGNE SALARIALE =====
    { terme: "PPV", definition: "Prime de Partage de la Valeur (ex-Prime Macron). Prime facultative exonérée de cotisations jusqu'à 3 000€ (6 000€ si intéressement). Conditions: ne pas substituer à un élément de salaire.", categorie: "Primes", importance: "haute" },
    { terme: "Intéressement", definition: "Prime collective liée aux performances de l'entreprise (CA, productivité, qualité...). Définie par accord pour 3 ans. Exonérée de cotisations, imposable (sauf placement PEE).", categorie: "Primes", importance: "haute" },
    { terme: "Participation", definition: "Part des bénéfices redistribuée aux salariés. Obligatoire si +50 salariés. Formule légale: RSP = ½ × (B - 5%C) × S/VA. Bloquée 5 ans sauf cas de déblocage.", categorie: "Primes", importance: "haute" },
    { terme: "PEE", definition: "Plan d'Épargne Entreprise. Système d'épargne collectif avec abondement possible de l'employeur. Sommes bloquées 5 ans. Exonéré d'impôt à la sortie.", categorie: "Primes", importance: "moyenne" },
    { terme: "PERCO/PERECO", definition: "Plan d'Épargne Retraite Collectif. Épargne bloquée jusqu'à la retraite (sauf cas exceptionnels). Abondement employeur possible.", categorie: "Primes", importance: "moyenne" },
    { terme: "Abondement", definition: "Versement complémentaire de l'employeur sur l'épargne salariale. Maximum 8% du PASS pour le PEE, 16% pour le PERCO.", categorie: "Primes", importance: "moyenne" },
    { terme: "Prime transport", definition: "Participation obligatoire de l'employeur (50%) aux frais de transports en commun. Prime forfaitaire possible pour les autres modes.", categorie: "Primes", importance: "moyenne" },
    { terme: "Prime panier", definition: "Indemnité de repas pour les salariés contraints de se restaurer sur leur lieu de travail. Montant fixé par convention ou usage.", categorie: "Primes", importance: "basse" },
    { terme: "Prime exceptionnelle", definition: "Prime ponctuelle versée à l'occasion d'un événement particulier (résultats, fusion...). Soumise à cotisations sauf PPV.", categorie: "Primes", importance: "moyenne" },
    
    // ===== COTISATIONS SOCIALES =====
    { terme: "RGDU", definition: "Réduction Générale Dégressive Unifiée. Nouveau dispositif 2026 remplaçant Fillon + bandeau maladie. Exonération dégressive des cotisations patronales jusqu'à 3 SMIC, avec paramètre P=1,75.", categorie: "Cotisations", importance: "haute" },
    { terme: "Réduction Fillon", definition: "Ancien dispositif (avant 2026) d'exonération de cotisations patronales pour les salaires ≤ 1,6 SMIC. Remplacé par le RGDU.", categorie: "Cotisations", importance: "moyenne" },
    { terme: "PMSS", definition: "Plafond Mensuel de la Sécurité Sociale. Seuil de référence pour le calcul de certaines cotisations (4 005€ en 2026). PASS = Plafond Annuel = 12 × PMSS.", categorie: "Cotisations", importance: "haute" },
    { terme: "CSG", definition: "Contribution Sociale Généralisée. Prélèvement de 9,2% sur les salaires (6,8% déductible, 2,4% non déductible) finançant la Sécurité sociale.", categorie: "Cotisations", importance: "haute" },
    { terme: "CRDS", definition: "Contribution au Remboursement de la Dette Sociale. Prélèvement de 0,5% sur les revenus finançant le remboursement de la dette de la Sécu. Non déductible.", categorie: "Cotisations", importance: "moyenne" },
    { terme: "URSSAF", definition: "Union de Recouvrement des cotisations de Sécurité Sociale et d'Allocations Familiales. Organisme collectant les cotisations sociales.", categorie: "Cotisations", importance: "moyenne" },
    { terme: "Cotisations patronales", definition: "Part des cotisations sociales à la charge de l'employeur (~43% du brut avant réductions): maladie, vieillesse, famille, chômage, retraite complémentaire, AT/MP...", categorie: "Cotisations", importance: "haute" },
    { terme: "Cotisations salariales", definition: "Part des cotisations à la charge du salarié (~22% du brut): vieillesse, retraite complémentaire, CSG, CRDS. Prélevées sur le brut.", categorie: "Cotisations", importance: "haute" },
    { terme: "AGIRC-ARRCO", definition: "Régime de retraite complémentaire obligatoire des salariés du privé. Cotisation: 7,87% (salarié + employeur) jusqu'au PMSS, 21,59% au-delà.", categorie: "Cotisations", importance: "moyenne" },
    { terme: "Taux AT/MP", definition: "Taux Accident du Travail / Maladie Professionnelle. Variable selon le secteur d'activité et la sinistralité de l'entreprise (0,9% à 6%+).", categorie: "Cotisations", importance: "basse" },
    { terme: "Forfait social", definition: "Contribution patronale de 20% sur certains revenus (intéressement, participation dans les grandes entreprises, abondement...).", categorie: "Cotisations", importance: "moyenne" },
    { terme: "Versement mobilité", definition: "Contribution patronale finançant les transports en commun. Taux variable selon les zones (jusqu'à 2,95% en Île-de-France).", categorie: "Cotisations", importance: "basse" },
    
    // ===== NÉGOCIATION COLLECTIVE =====
    { terme: "NAO", definition: "Négociation Annuelle Obligatoire. Obligation pour les entreprises avec délégué syndical de négocier chaque année sur: 1) salaires et temps de travail, 2) égalité pro, 3) QVCT.", categorie: "Négociation", importance: "haute" },
    { terme: "Accord d'entreprise", definition: "Accord collectif négocié entre l'employeur et les syndicats (ou élus/salariés mandatés). Peut déroger à la convention de branche sur certains sujets.", categorie: "Négociation", importance: "haute" },
    { terme: "Accord de branche", definition: "Accord négocié au niveau d'un secteur d'activité entre organisations patronales et syndicales. Étendu par arrêté, il s'applique à toutes les entreprises du secteur.", categorie: "Négociation", importance: "haute" },
    { terme: "Extension (arrêté)", definition: "Décision ministérielle rendant obligatoire un accord de branche pour toutes les entreprises du secteur, même non adhérentes aux organisations signataires.", categorie: "Négociation", importance: "moyenne" },
    { terme: "Dénonciation", definition: "Procédure par laquelle une partie met fin à un accord collectif. Préavis de 3 mois, puis survie de l'accord 12 mois minimum.", categorie: "Négociation", importance: "basse" },
    { terme: "Avenant", definition: "Accord modifiant ou complétant un accord existant. Même procédure de négociation et de validation que l'accord initial.", categorie: "Négociation", importance: "basse" },
    { terme: "Représentativité", definition: "Critères permettant à un syndicat de négocier et signer des accords: 10% des voix aux élections CSE au niveau où l'accord est négocié.", categorie: "Négociation", importance: "moyenne" },
    { terme: "Accord majoritaire", definition: "Depuis 2017, un accord d'entreprise doit être signé par des syndicats ayant obtenu >50% des voix aux élections CSE pour être valide.", categorie: "Négociation", importance: "moyenne" },
    { terme: "Droit d'opposition", definition: "Possibilité pour des syndicats majoritaires de s'opposer à un accord de branche dans les 15 jours suivant sa notification.", categorie: "Négociation", importance: "basse" },
    
    // ===== CONVENTIONS COLLECTIVES =====
    { terme: "CCN", definition: "Convention Collective Nationale. Accord de branche fixant les règles applicables aux salariés d'un secteur: grilles de salaires, classifications, congés, primes...", categorie: "Conventions", importance: "haute" },
    { terme: "IDCC", definition: "Identifiant de Convention Collective. Code à 4 chiffres identifiant chaque convention (ex: 3248 = Métallurgie, 2511 = Sport, 1486 = Bureaux d'études).", categorie: "Conventions", importance: "haute" },
    { terme: "Classification", definition: "Système hiérarchique organisant les emplois par niveaux/coefficients selon les compétences requises. Base du calcul des minima salariaux.", categorie: "Conventions", importance: "haute" },
    { terme: "Coefficient", definition: "Nombre attribué à chaque niveau de classification, multiplié par une valeur de point pour obtenir le salaire minimum. Ex: coef 200 × 5€ = 1 000€.", categorie: "Conventions", importance: "moyenne" },
    { terme: "Valeur du point", definition: "Montant en euros multiplié par le coefficient pour calculer le SMH. Négociée dans les accords de branche.", categorie: "Conventions", importance: "moyenne" },
    { terme: "Grille de salaires", definition: "Tableau fixant les salaires minima conventionnels pour chaque niveau de classification. Doit être ≥ SMIC à tous les niveaux.", categorie: "Conventions", importance: "haute" },
    { terme: "Branche professionnelle", definition: "Regroupement d'entreprises d'un même secteur d'activité couvertes par une même convention collective.", categorie: "Conventions", importance: "moyenne" },
    { terme: "Restructuration des branches", definition: "Politique de réduction du nombre de branches professionnelles (de 700+ à ~200 cibles) par fusion des petites branches.", categorie: "Conventions", importance: "basse" },
    { terme: "Hiérarchie des normes", definition: "Ordre d'application des règles: loi > accord de branche > accord d'entreprise > contrat. Mais certains sujets peuvent être négociés au niveau entreprise.", categorie: "Conventions", importance: "moyenne" },
    
    // ===== EMPLOI ET CHÔMAGE =====
    { terme: "Taux de chômage BIT", definition: "% de la population active sans emploi, disponible et en recherche active. Définition du Bureau International du Travail, comparable internationalement.", categorie: "Emploi", importance: "haute" },
    { terme: "Taux d'emploi", definition: "% des 15-64 ans occupant un emploi. France: ~69% (2024). Indicateur de dynamisme du marché du travail.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Population active", definition: "Ensemble des personnes en emploi ou au chômage (au sens BIT). Environ 30 millions de personnes en France.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Halo du chômage", definition: "Personnes sans emploi souhaitant travailler mais ne remplissant pas tous les critères BIT (non disponibles ou non en recherche active). ~2 millions de personnes.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Sous-emploi", definition: "Personnes en temps partiel subi ou au chômage technique. Indicateur de la qualité de l'emploi.", categorie: "Emploi", importance: "moyenne" },
    { terme: "DEFM", definition: "Demandeurs d'Emploi en Fin de Mois. Statistique France Travail des inscrits par catégorie (A: sans emploi, B/C: activité réduite...).", categorie: "Emploi", importance: "moyenne" },
    { terme: "Catégorie A", definition: "Demandeurs d'emploi sans aucune activité, tenus de faire des actes positifs de recherche d'emploi.", categorie: "Emploi", importance: "moyenne" },
    { terme: "France Travail", definition: "Service public de l'emploi (ex-Pôle Emploi depuis 2024). Inscription, indemnisation, accompagnement des demandeurs d'emploi.", categorie: "Emploi", importance: "haute" },
    { terme: "Tensions de recrutement", definition: "Indicateur DARES mesurant la difficulté des entreprises à recruter. Ratio offres/demandes par métier. >60% = forte tension.", categorie: "Emploi", importance: "haute" },
    { terme: "BMO", definition: "Besoins en Main-d'Œuvre. Enquête annuelle France Travail sur les intentions d'embauche des entreprises et les difficultés anticipées.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Offres d'emploi durables", definition: "CDI ou CDD de plus de 6 mois. Indicateur de la qualité des offres disponibles.", categorie: "Emploi", importance: "basse" },
    
    // ===== CONTRATS DE TRAVAIL =====
    { terme: "CDI", definition: "Contrat à Durée Indéterminée. Forme normale du contrat de travail. Peut être rompu par démission, licenciement ou rupture conventionnelle.", categorie: "Contrats", importance: "haute" },
    { terme: "CDD", definition: "Contrat à Durée Déterminée. Limité à 18 mois (renouvellements compris). Motifs légaux: remplacement, surcroît d'activité, saisonnier...", categorie: "Contrats", importance: "haute" },
    { terme: "CTT / Intérim", definition: "Contrat de Travail Temporaire. Le salarié est employé par l'agence d'intérim et mis à disposition de l'entreprise utilisatrice.", categorie: "Contrats", importance: "moyenne" },
    { terme: "Temps partiel", definition: "Durée de travail inférieure à la durée légale (35h) ou conventionnelle. Minimum 24h/semaine sauf dérogations.", categorie: "Contrats", importance: "moyenne" },
    { terme: "Forfait jours", definition: "Mode d'organisation du temps de travail pour les cadres autonomes. 218 jours/an maximum. Pas de décompte horaire.", categorie: "Contrats", importance: "moyenne" },
    { terme: "Période d'essai", definition: "Période initiale permettant à chaque partie de rompre librement le contrat. Durée max: 2 mois (ouvriers/employés) à 4 mois (cadres), renouvelable une fois.", categorie: "Contrats", importance: "moyenne" },
    { terme: "Rupture conventionnelle", definition: "Mode de rupture amiable du CDI, ouvrant droit aux allocations chômage. Homologation par la DREETS obligatoire.", categorie: "Contrats", importance: "haute" },
    { terme: "Licenciement économique", definition: "Licenciement pour motif non inhérent au salarié (difficultés économiques, mutations technologiques...). Procédure spécifique, PSE si +10 salariés.", categorie: "Contrats", importance: "moyenne" },
    
    // ===== TEMPS DE TRAVAIL =====
    { terme: "Durée légale", definition: "35 heures par semaine. Au-delà: heures supplémentaires majorées. Peut être modulée par accord (annualisation).", categorie: "Temps de travail", importance: "haute" },
    { terme: "Heures supplémentaires", definition: "Heures au-delà de 35h/semaine. Majorées de 25% (8 premières) puis 50%. Contingent annuel: 220h sauf accord.", categorie: "Temps de travail", importance: "haute" },
    { terme: "RTT", definition: "Réduction du Temps de Travail. Jours de repos compensant les heures au-delà de 35h dans les entreprises à 39h ou en forfait jours.", categorie: "Temps de travail", importance: "haute" },
    { terme: "Annualisation", definition: "Répartition du temps de travail sur l'année (1 607h) permettant de moduler les horaires selon l'activité.", categorie: "Temps de travail", importance: "moyenne" },
    { terme: "Repos compensateur", definition: "Temps de repos accordé en compensation d'heures supplémentaires, au lieu ou en plus de la majoration salariale.", categorie: "Temps de travail", importance: "basse" },
    { terme: "Astreinte", definition: "Période où le salarié doit rester joignable pour intervenir si nécessaire. Compensée financièrement ou en repos.", categorie: "Temps de travail", importance: "basse" },
    { terme: "Travail de nuit", definition: "Travail entre 21h et 6h (ou plage définie par accord). Compensations obligatoires (repos, majoration). Suivi médical renforcé.", categorie: "Temps de travail", importance: "moyenne" },
    { terme: "Compte Épargne Temps", definition: "Dispositif permettant d'accumuler des jours de congés ou des heures pour une utilisation ultérieure (congé, formation, retraite...).", categorie: "Temps de travail", importance: "moyenne" },
    
    // ===== INDICATEURS ÉCONOMIQUES =====
    { terme: "PIB", definition: "Produit Intérieur Brut. Valeur totale de la production de biens et services d'un pays sur une période. France: ~2 800 Mds€/an.", categorie: "Indicateurs", importance: "haute" },
    { terme: "Croissance", definition: "Variation du PIB en volume (hors inflation). Positive = création de richesse. France: ~1% par an en moyenne.", categorie: "Indicateurs", importance: "haute" },
    { terme: "Inflation", definition: "Hausse générale et durable des prix. Mesurée par l'IPC (INSEE). Cible BCE: 2%. Érode le pouvoir d'achat si > hausses de salaires.", categorie: "Indicateurs", importance: "haute" },
    { terme: "IPC", definition: "Indice des Prix à la Consommation. Mesure l'évolution moyenne des prix d'un panier de biens et services représentatif.", categorie: "Indicateurs", importance: "haute" },
    { terme: "IPCH", definition: "Indice des Prix à la Consommation Harmonisé. Version européenne de l'IPC, comparable entre pays de l'UE.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Inflation sous-jacente", definition: "Inflation hors éléments volatils (énergie, alimentation fraîche). Reflète les tendances de fond des prix.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Déflateur", definition: "Indice permettant de passer des valeurs nominales aux valeurs réelles (corrigées de l'inflation).", categorie: "Indicateurs", importance: "basse" },
    { terme: "IRL", definition: "Indice de Référence des Loyers. Calculé par l'INSEE, sert de base à la révision annuelle des loyers d'habitation.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "ICC", definition: "Indice du Coût de la Construction. Utilisé pour indexer les loyers commerciaux et certains contrats.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Climat des affaires", definition: "Indicateur INSEE synthétique de confiance des chefs d'entreprise. 100 = moyenne long terme. >100 = optimisme.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "PMI", definition: "Purchasing Managers Index. Indice d'activité basé sur une enquête auprès des directeurs d'achat. >50 = expansion.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Défaillances d'entreprises", definition: "Entreprises en cessation de paiements (redressement ou liquidation judiciaire). Indicateur de santé économique.", categorie: "Indicateurs", importance: "moyenne" },
    
    // ===== PARTAGE DE LA VALEUR =====
    { terme: "Valeur Ajoutée", definition: "Richesse créée par l'entreprise = Production - Consommations intermédiaires. Se répartit entre salaires, profits, impôts.", categorie: "Partage VA", importance: "haute" },
    { terme: "Partage de la VA", definition: "Répartition de la valeur ajoutée entre salaires (~60%), EBE/profits (~32%) et impôts (~8%). Indicateur clé des NAO.", categorie: "Partage VA", importance: "haute" },
    { terme: "EBE", definition: "Excédent Brut d'Exploitation. Profit de l'entreprise avant impôts, intérêts et amortissements. EBE = VA - Salaires - Impôts production.", categorie: "Partage VA", importance: "haute" },
    { terme: "Taux de marge", definition: "EBE / Valeur Ajoutée. Part des profits dans la richesse créée. France: ~32% (SNF). Niveau historiquement élevé = indicateur économique.", categorie: "Partage VA", importance: "haute" },
    { terme: "Résultat net", definition: "Bénéfice ou perte après toutes les charges (exploitation, financières, exceptionnelles, impôts). Base de la participation.", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Dividendes", definition: "Part des bénéfices distribuée aux actionnaires. Record en France: 67 Mds€ en 2023. Argument syndical sur le partage de la valeur.", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Rachats d'actions", definition: "Opération par laquelle une entreprise rachète ses propres actions, augmentant la valeur pour les actionnaires restants.", categorie: "Partage VA", importance: "basse" },
    { terme: "Investissement", definition: "Dépenses d'équipement, R&D, formation... Argument patronal pour modérer les hausses de salaires.", categorie: "Partage VA", importance: "moyenne" },
    
    // ===== PROTECTION SOCIALE =====
    { terme: "Sécurité sociale", definition: "Système de protection couvrant maladie, vieillesse, famille, accidents du travail. Financé par les cotisations et la CSG.", categorie: "Protection sociale", importance: "haute" },
    { terme: "Assurance chômage", definition: "Régime d'indemnisation des demandeurs d'emploi (ARE). Géré par l'UNEDIC, versé par France Travail. Financé par cotisations patronales.", categorie: "Protection sociale", importance: "haute" },
    { terme: "ARE", definition: "Allocation d'aide au Retour à l'Emploi. Indemnité chômage = 57% du salaire journalier de référence (plafonné). Durée variable selon l'âge et la durée cotisée.", categorie: "Protection sociale", importance: "haute" },
    { terme: "RSA", definition: "Revenu de Solidarité Active. Minimum social pour les personnes sans ressources (635€/mois pour une personne seule en 2026).", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Prime d'activité", definition: "Complément de revenus pour les travailleurs modestes. Versée par la CAF. Dépend des revenus et de la composition du foyer.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "UNEDIC", definition: "Organisme paritaire gérant l'assurance chômage. Négocie les règles d'indemnisation avec les partenaires sociaux.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Complémentaire santé", definition: "Mutuelle ou assurance complétant les remboursements de la Sécu. Obligatoire en entreprise avec participation employeur ≥50%.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Prévoyance", definition: "Garanties couvrant les risques lourds: décès, invalidité, incapacité. Souvent obligatoire pour les cadres, selon conventions.", categorie: "Protection sociale", importance: "moyenne" },
    
    // ===== INSTANCES REPRÉSENTATIVES =====
    { terme: "CSE", definition: "Comité Social et Économique. Instance unique de représentation du personnel depuis 2018 (fusion CE/DP/CHSCT). Obligatoire dès 11 salariés.", categorie: "IRP", importance: "haute" },
    { terme: "Délégué syndical", definition: "Représentant d'un syndicat représentatif dans l'entreprise. Seul habilité à négocier et signer des accords collectifs.", categorie: "IRP", importance: "haute" },
    { terme: "RSS", definition: "Représentant de Section Syndicale. Désigné par un syndicat non représentatif pour se faire connaître et préparer les élections.", categorie: "IRP", importance: "basse" },
    { terme: "Heures de délégation", definition: "Crédit d'heures rémunérées pour exercer les mandats de représentant du personnel. Variable selon les mandats et l'effectif.", categorie: "IRP", importance: "moyenne" },
    { terme: "CSSCT", definition: "Commission Santé, Sécurité et Conditions de Travail. Commission du CSE obligatoire dans les entreprises ≥300 salariés.", categorie: "IRP", importance: "moyenne" },
    { terme: "Base de Données Économiques et Sociales", definition: "BDES. Document regroupant les informations économiques et sociales que l'employeur doit mettre à disposition du CSE.", categorie: "IRP", importance: "moyenne" },
    
    // ===== SANTÉ ET SÉCURITÉ =====
    { terme: "AT/MP", definition: "Accident du Travail / Maladie Professionnelle. Accident survenu au travail ou maladie liée à l'activité professionnelle. Indemnisation spécifique.", categorie: "Santé-Sécurité", importance: "haute" },
    { terme: "Accident de trajet", definition: "Accident survenu sur le trajet domicile-travail. Régime proche de l'AT mais cotisation séparée.", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "Maladie professionnelle", definition: "Maladie figurant dans un tableau officiel ou reconnue comme liée au travail. TMS, amiante, troubles psychiques...", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "TMS", definition: "Troubles Musculo-Squelettiques. 1ère cause de maladie professionnelle (87%). Dos, épaules, coudes, poignets...", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "RPS", definition: "Risques Psycho-Sociaux. Stress, harcèlement, burn-out, violences... L'employeur doit les prévenir dans le DUERP.", categorie: "Santé-Sécurité", importance: "haute" },
    { terme: "DUERP", definition: "Document Unique d'Évaluation des Risques Professionnels. Obligatoire, liste les risques par unité de travail et les actions de prévention.", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "QVCT", definition: "Qualité de Vie et Conditions de Travail (ex-QVT). Thème de négociation obligatoire: organisation, équilibre vie pro/perso, santé...", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "Pénibilité", definition: "Exposition à des facteurs de risques professionnels (travail de nuit, bruit, postures, températures...). Compte C2P pour retraite anticipée.", categorie: "Santé-Sécurité", importance: "moyenne" },
    { terme: "C2P", definition: "Compte Professionnel de Prévention. Points acquis en cas d'exposition à des facteurs de pénibilité, utilisables pour formation, temps partiel ou retraite anticipée.", categorie: "Santé-Sécurité", importance: "basse" },
    
    // ===== ÉGALITÉ PROFESSIONNELLE =====
    { terme: "Index égalité F/H", definition: "Note sur 100 mesurant les écarts de rémunération et de carrière entre femmes et hommes. Publication obligatoire. <75 = pénalités possibles.", categorie: "Égalité", importance: "haute" },
    { terme: "Écart salarial F/H", definition: "Différence de salaire entre femmes et hommes. France: ~16% tous temps confondus, ~4% à poste et temps égal.", categorie: "Égalité", importance: "haute" },
    { terme: "Congé maternité", definition: "16 semaines minimum (6 avant + 10 après l'accouchement). Indemnisé à 100% du salaire (plafonné) par la Sécu.", categorie: "Égalité", importance: "moyenne" },
    { terme: "Congé paternité", definition: "28 jours (dont 7 obligatoires) à la naissance d'un enfant. Indemnisé comme le congé maternité.", categorie: "Égalité", importance: "moyenne" },
    { terme: "Congé parental", definition: "Congé pour élever un enfant (jusqu'à 3 ans). Non rémunéré mais possibilité de PreParE (CAF).", categorie: "Égalité", importance: "basse" },
    
    // ===== FORMATION =====
    { terme: "CPF", definition: "Compte Personnel de Formation. Crédit en euros (500€/an, max 5 000€) pour financer des formations certifiantes. Portable tout au long de la carrière.", categorie: "Formation", importance: "haute" },
    { terme: "Plan de développement des compétences", definition: "Programme de formation décidé par l'employeur pour adapter les compétences des salariés. Remplace le plan de formation.", categorie: "Formation", importance: "moyenne" },
    { terme: "VAE", definition: "Validation des Acquis de l'Expérience. Obtention d'un diplôme par la reconnaissance de l'expérience professionnelle (1 an minimum).", categorie: "Formation", importance: "moyenne" },
    { terme: "Bilan de compétences", definition: "Analyse des compétences et motivations pour définir un projet professionnel. Finançable par le CPF.", categorie: "Formation", importance: "basse" },
    { terme: "Pro-A", definition: "Reconversion ou Promotion par l'Alternance. Formation en alternance pour les salariés en CDI souhaitant évoluer ou se reconvertir.", categorie: "Formation", importance: "basse" },
    { terme: "OPCO", definition: "Opérateur de Compétences. Organisme collectant les contributions formation des entreprises et finançant les formations de branche.", categorie: "Formation", importance: "moyenne" },
    { terme: "Contribution formation", definition: "Obligation des employeurs: 0,55% (< 11 salariés) ou 1% (≥ 11) de la masse salariale pour financer la formation professionnelle.", categorie: "Formation", importance: "moyenne" },
    
    // ===== SOURCES ET ORGANISMES =====
    { terme: "INSEE", definition: "Institut National de la Statistique et des Études Économiques. Produit les données officielles sur l'économie, l'emploi, les prix, la démographie.", categorie: "Sources", importance: "haute" },
    { terme: "DARES", definition: "Direction de l'Animation de la Recherche, des Études et des Statistiques. Service statistique du Ministère du Travail.", categorie: "Sources", importance: "haute" },
    { terme: "Banque de France", definition: "Institution produisant des études économiques, les prévisions macroéconomiques et le suivi des défaillances d'entreprises.", categorie: "Sources", importance: "moyenne" },
    { terme: "DGT", definition: "Direction Générale du Travail. Administration centrale du Ministère du Travail, élabore la réglementation.", categorie: "Sources", importance: "basse" },
    { terme: "DREETS", definition: "Direction Régionale de l'Économie, de l'Emploi, du Travail et des Solidarités (ex-DIRECCTE). Administration déconcentrée, homologue les ruptures conventionnelles.", categorie: "Sources", importance: "basse" },
    { terme: "Eurostat", definition: "Office statistique de l'Union Européenne. Données harmonisées permettant les comparaisons entre pays.", categorie: "Sources", importance: "moyenne" },
    { terme: "OCDE", definition: "Organisation de Coopération et de Développement Économiques. Études et données sur les pays développés.", categorie: "Sources", importance: "moyenne" },
    { terme: "OIT/BIT", definition: "Organisation Internationale du Travail / Bureau International du Travail. Définit les normes internationales du travail.", categorie: "Sources", importance: "basse" },
    
    // ===== CLASSIFICATION =====
    { terme: "Cadre", definition: "Salarié exerçant des fonctions de direction, d'encadrement ou d'expertise. Cotise à l'AGIRC-ARRCO au taux supérieur. Souvent au forfait jours.", categorie: "Classification", importance: "haute" },
    { terme: "ETAM", definition: "Employés, Techniciens et Agents de Maîtrise. Catégorie intermédiaire entre ouvriers et cadres.", categorie: "Classification", importance: "moyenne" },
    { terme: "Ouvrier", definition: "Salarié effectuant un travail manuel. Sous-catégories: OS (ouvrier spécialisé), OQ (ouvrier qualifié), OHQ (ouvrier hautement qualifié).", categorie: "Classification", importance: "moyenne" },
    { terme: "Employé", definition: "Salarié effectuant des tâches administratives ou commerciales sans responsabilité d'encadrement.", categorie: "Classification", importance: "basse" },
    { terme: "Agent de maîtrise", definition: "Salarié encadrant une équipe d'ouvriers ou d'employés sans avoir le statut cadre.", categorie: "Classification", importance: "basse" },
    { terme: "Position / Niveau", definition: "Échelon dans la grille de classification conventionnelle, déterminant le salaire minimum applicable.", categorie: "Classification", importance: "moyenne" },
    
    // ===== EUROPE =====
    { terme: "Directive européenne", definition: "Texte fixant des objectifs aux États membres qui doivent le transposer en droit national. Ex: directive sur les salaires minimaux.", categorie: "Europe", importance: "moyenne" },
    { terme: "Salaire minimum UE", definition: "Directive 2022/2041 demandant des salaires minimums 'adéquats'. Seuil indicatif: 60% du salaire médian ou 50% du salaire moyen.", categorie: "Europe", importance: "moyenne" },
    { terme: "Socle européen des droits sociaux", definition: "20 principes adoptés en 2017: emploi équitable, protection sociale, inclusion. Non contraignant mais influence les directives.", categorie: "Europe", importance: "basse" },
    { terme: "BCE", definition: "Banque Centrale Européenne. Fixe les taux d'intérêt de la zone euro. Objectif: inflation proche de 2%.", categorie: "Europe", importance: "moyenne" },
    { terme: "Zone euro", definition: "20 pays de l'UE ayant adopté l'euro comme monnaie. Politique monétaire commune (BCE).", categorie: "Europe", importance: "basse" },

    // ===== MACROÉCONOMIE =====
    { terme: "PIB", definition: "Produit Intérieur Brut. Valeur totale des biens et services produits sur le territoire en un an. Principal indicateur de la taille d'une économie.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "PNB", definition: "Produit National Brut. Comme le PIB mais mesure la production des résidents français, y compris à l'étranger. Peu utilisé aujourd'hui.", categorie: "Macroéconomie", importance: "basse" },
    { terme: "Croissance économique", definition: "Variation du PIB en volume sur une période. Une croissance positive signifie une hausse de la production. Négative = récession.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Récession", definition: "Deux trimestres consécutifs de croissance négative. Entraîne généralement hausse du chômage et baisse de l'investissement.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Stagflation", definition: "Situation rare combinant stagnation économique (chômage élevé) et inflation forte. Vécu en France lors du choc pétrolier de 1973.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Déflation", definition: "Baisse généralisée et durable des prix. Paradoxalement néfaste: les ménages reportent leurs achats, l'économie se contracte (spirale déflationniste).", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Désinflation", definition: "Ralentissement de l'inflation: les prix continuent d'augmenter mais moins vite. Différent de la déflation.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Productivité", definition: "Rapport entre la production et les facteurs utilisés (travail, capital). Productivité du travail = PIB / heures travaillées. Clé pour la compétitivité.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Cycle économique", definition: "Alternance de phases d'expansion (croissance) et de contraction (récession). Durée moyenne : 7-10 ans. Théorisé par Juglar, Kondratiev.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Politique monétaire", definition: "Action de la banque centrale sur la masse monétaire et les taux d'intérêt pour influencer l'activité économique et l'inflation.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Politique budgétaire", definition: "Action de l'État via ses dépenses et ses recettes fiscales pour influencer l'activité économique. Peut être expansive ou restrictive.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Politique d'austérité", definition: "Réduction des dépenses publiques et/ou hausse des impôts pour réduire le déficit. Controversée: peut aggraver la récession.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Déficit public", definition: "Excédent des dépenses de l'État sur ses recettes. Exprimé en % du PIB. Critère de Maastricht: < 3% du PIB.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Dette publique", definition: "Cumul des déficits passés. France: ~110% du PIB en 2025. Critère de Maastricht: < 60% du PIB.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Taux directeur", definition: "Taux d'intérêt fixé par la banque centrale auquel les banques commerciales empruntent. Influence tous les autres taux de l'économie.", categorie: "Macroéconomie", importance: "haute" },
    { terme: "Quantitative Easing (QE)", definition: "Politique non-conventionnelle: la banque centrale achète des actifs (obligations) pour injecter des liquidités dans l'économie. Utilisé massivement post-2008.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Balance commerciale", definition: "Différence entre exportations et importations. Excédentaire si on exporte plus qu'on importe. France: déficitaire depuis 2004.", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Compétitivité", definition: "Capacité d'une entreprise ou d'un pays à maintenir ou accroître ses parts de marché. Compétitivité-prix (coûts) vs compétitivité hors-prix (qualité, innovation).", categorie: "Macroéconomie", importance: "moyenne" },
    { terme: "Indicateur avancé", definition: "Indicateur qui prédit l'évolution économique future: commandes industrielles, confiance des ménages, prix des matières premières.", categorie: "Macroéconomie", importance: "basse" },
    { terme: "Pouvoir d'achat", definition: "Quantité de biens et services qu'un revenu permet d'acheter. Évolue selon l'écart entre hausse des revenus et inflation.", categorie: "Macroéconomie", importance: "haute" },

    // ===== FINANCE ET MARCHÉS =====
    { terme: "CAC 40", definition: "Principal indice boursier français: les 40 plus grandes capitalisations de la Bourse de Paris. Créé en 1987, base 1000.", categorie: "Finance", importance: "moyenne" },
    { terme: "Obligations", definition: "Titres de dette émis par l'État ou les entreprises. L'acheteur prête de l'argent et reçoit des intérêts (coupon). Moins risqués que les actions.", categorie: "Finance", importance: "moyenne" },
    { terme: "Taux d'intérêt", definition: "Prix de l'argent emprunté, exprimé en %. Taux directeur (BCE), taux d'emprunt immobilier, taux de rémunération de l'épargne.", categorie: "Finance", importance: "haute" },
    { terme: "Spread", definition: "Écart entre deux taux d'intérêt. Ex: spread OAT-Bund = différence entre taux d'emprunt français et allemand. Mesure la confiance des marchés.", categorie: "Finance", importance: "basse" },
    { terme: "OAT", definition: "Obligation Assimilable du Trésor. Titre de dette émis par l'État français pour financer son déficit. Référence pour les taux longs en France.", categorie: "Finance", importance: "basse" },
    { terme: "Livret A", definition: "Compte d'épargne réglementé, défiscalisé, garanti par l'État. Taux fixé par la Banque de France (2,4% en 2025). Plafond: 22 950€.", categorie: "Finance", importance: "moyenne" },
    { terme: "PEA", definition: "Plan d'Épargne en Actions. Enveloppe fiscalement avantageuse pour investir en actions européennes. Exonération d'impôt après 5 ans.", categorie: "Finance", importance: "basse" },
    { terme: "Assurance-vie", definition: "Premier produit d'épargne français (1 900 Mds€). Fiscalité avantageuse après 8 ans. Fonds euros (garanti) + unités de compte (risqués).", categorie: "Finance", importance: "moyenne" },
    { terme: "Capital-risque", definition: "Investissement dans des jeunes entreprises innovantes à fort potentiel mais risque élevé. Moteur de la création de startups.", categorie: "Finance", importance: "basse" },
    { terme: "Hedge fund", definition: "Fonds d'investissement spéculatif utilisant des stratégies complexes (vente à découvert, effet de levier). Peu régulés, réservés aux investisseurs institutionnels.", categorie: "Finance", importance: "basse" },
    { terme: "Krach boursier", definition: "Chute brutale et massive des cours boursiers (-20% en peu de temps). Exemples: 1929, 1987, 2000, 2008. Souvent déclenchés par une panique collective.", categorie: "Finance", importance: "moyenne" },
    { terme: "Bulle spéculative", definition: "Hausse excessive des prix d'un actif déconnectée des fondamentaux économiques. Finit toujours par éclater. Ex: tulipes (1637), immobilier US (2006).", categorie: "Finance", importance: "moyenne" },
    { terme: "Dividende", definition: "Part des bénéfices d'une entreprise distribuée à ses actionnaires. Controversé: certains jugent qu'il capte de la valeur au détriment des salariés.", categorie: "Finance", importance: "moyenne" },
    { terme: "Rachat d'actions", definition: "L'entreprise rachète ses propres actions pour les annuler, augmentant la valeur des actions restantes. Alternative au dividende, fiscal plus avantageux.", categorie: "Finance", importance: "basse" },

    // ===== IMMOBILIER =====
    { terme: "IRL", definition: "Indice de Référence des Loyers. Calculé par l'INSEE chaque trimestre sur base de l'inflation. Plafonne les révisions de loyers en France.", categorie: "Immobilier", importance: "haute" },
    { terme: "ICC", definition: "Indice du Coût de la Construction. Publié par l'INSEE, sert à réviser certains baux commerciaux.", categorie: "Immobilier", importance: "basse" },
    { terme: "PTZ", definition: "Prêt à Taux Zéro. Aide de l'État pour les primo-accédants sous conditions de ressources. Ne finance qu'une partie du bien.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "Taux d'effort", definition: "Part du revenu consacrée au logement. Seuil critique: 33% (banques) ou 40% (réalité pour les ménages modestes). En hausse depuis 2000.", categorie: "Immobilier", importance: "haute" },
    { terme: "Bulle immobilière", definition: "Hausse des prix de l'immobilier déconnectée des revenus et des fondamentaux. France: prix/revenus au plus haut historique dans les grandes villes.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "DALO", definition: "Droit Au Logement Opposable. Permet aux mal-logés de faire valoir leur droit à un logement devant les tribunaux si l'État ne le leur fournit pas.", categorie: "Immobilier", importance: "basse" },
    { terme: "HLM/HJS", definition: "Habitation à Loyer Modéré. Logement social dont le loyer est plafonné en fonction des ressources. 5,4 millions de logements en France, 2,5M sur liste d'attente.", categorie: "Immobilier", importance: "moyenne" },
    { terme: "Encadrement des loyers", definition: "Dispositif limitant les loyers à un plafond dans certaines zones tendues (Paris, Lyon, Bordeaux...). Contesté par les propriétaires.", categorie: "Immobilier", importance: "moyenne" },

    // ===== DROIT DU TRAVAIL =====
    { terme: "Licenciement économique", definition: "Rupture du contrat de travail pour motif économique: difficultés économiques, mutations technologiques, cessation d'activité. Procédure stricte.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Licenciement pour faute", definition: "Rupture du contrat pour faute simple (insuffisance professionnelle), faute grave (pas de préavis), ou faute lourde (intention de nuire).", categorie: "Droit du travail", importance: "haute" },
    { terme: "Rupture conventionnelle", definition: "Rupture du contrat d'un commun accord. Salarié touche les allocations chômage. +500 000 par an en France. Contestée car peut dissimuler un licenciement.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Préavis", definition: "Délai entre notification de la rupture et fin effective du contrat. Varie selon l'ancienneté et la catégorie. Peut être inexécuté (indemnité compensatrice).", categorie: "Droit du travail", importance: "haute" },
    { terme: "Indemnité de licenciement", definition: "Indemnité légale minimum: 1/4 de mois de salaire par année d'ancienneté (jusqu'à 10 ans), 1/3 au-delà. La convention peut prévoir plus.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Barème Macron", definition: "Plafonnement des dommages-intérêts en cas de licenciement sans cause réelle (1 mois/an d'ancienneté, max 20 mois). Critiqué pour son effet dissuasif sur les recours.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Période d'essai", definition: "Période initiale du contrat permettant à chacun d'évaluer l'autre. CDI: 2 mois ouvriers, 3 mois agents de maîtrise, 4 mois cadres. Renouvelable une fois.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Clause de non-concurrence", definition: "Clause interdisant au salarié de travailler chez un concurrent après son départ. Doit être limitée en zone, durée et activité, et être compensée financièrement.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Harcèlement moral", definition: "Agissements répétés dégradant les conditions de travail, portant atteinte aux droits et à la dignité, altérant la santé. Définition: L.1152-1 Code du travail.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Discrimination au travail", definition: "Traitement défavorable basé sur un critère prohibé (sexe, âge, origine, syndicat, grossesse...). 25 critères protégés. Sanction pénale + civile.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Obligation de sécurité", definition: "L'employeur a une obligation de résultat sur la sécurité physique et mentale des salariés. La faute inexcusable engage sa responsabilité aggravée.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Document unique (DUERP)", definition: "Document Unique d'Évaluation des Risques Professionnels. Obligatoire pour tout employeur, mis à jour annuellement et après tout accident.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Inaptitude professionnelle", definition: "Constat médical du médecin du travail qu'un salarié ne peut plus occuper son poste. L'employeur doit rechercher un reclassement avant de licencier.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Plan de Sauvegarde de l'Emploi (PSE)", definition: "Obligatoire pour les licenciements collectifs de +10 salariés dans une entreprise de +50 salariés. Doit inclure des mesures de reclassement.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Accord de performance collective", definition: "Accord permettant de modifier durée du travail ou rémunération pour préserver l'emploi. Le salarié refusant peut être licencié (motif sui generis).", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Télétravail", definition: "Travail effectué hors des locaux de l'employeur, via les technologies. Droit ouvert depuis 2017, généralisé par le Covid. Accord ou charte nécessaire.", categorie: "Droit du travail", importance: "haute" },
    { terme: "Droit à la déconnexion", definition: "Droit pour le salarié de ne pas être connecté aux outils numériques professionnels en dehors de ses horaires. Doit faire l'objet d'une charte ou d'un accord.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Forfait jours", definition: "Convention individuelle de forfait pour cadres autonomes: 218 jours/an max. Pas d'heures supplémentaires mais repos obligatoires. Fait l'objet de contentieux.", categorie: "Droit du travail", importance: "moyenne" },
    { terme: "Astreinte", definition: "Période où le salarié doit rester disponible sans être sur son lieu de travail. Compensée financièrement même si aucune intervention n'a lieu.", categorie: "Droit du travail", importance: "basse" },
    { terme: "Portabilité des droits", definition: "Conservation des droits à la prévoyance et mutuelle pendant 12 mois max après rupture du contrat. Financée par les anciens collègues via la mutualisation.", categorie: "Droit du travail", importance: "basse" },

    // ===== PROTECTION SOCIALE ÉLARGIE =====
    { terme: "APA", definition: "Allocation Personnalisée d'Autonomie. Aide aux personnes âgées dépendantes (GIR 1 à 4) pour financer les soins à domicile ou en établissement.", categorie: "Protection sociale", importance: "basse" },
    { terme: "MDPH", definition: "Maison Départementale des Personnes Handicapées. Attribue les droits liés au handicap: AAH, RQTH, PCH, carte mobilité inclusion.", categorie: "Protection sociale", importance: "basse" },
    { terme: "AAH", definition: "Allocation aux Adultes Handicapés. Revenu de substitution pour les personnes handicapées ne pouvant pas travailler. ~1 000€/mois.", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "RSA", definition: "Revenu de Solidarité Active. Minimum social garantissant un revenu aux personnes sans ressources ou à faibles ressources (~635€/mois personne seule). Géré par les départements.", categorie: "Protection sociale", importance: "haute" },
    { terme: "Prime d'activité", definition: "Complément de revenu pour les travailleurs modestes. Versée par la CAF, cumulable avec un salaire. Environ 4 millions de bénéficiaires.", categorie: "Protection sociale", importance: "haute" },
    { terme: "APL", definition: "Aide Personnalisée au Logement. Aide de la CAF pour réduire le loyer ou les mensualités. Versée directement au bailleur dans la plupart des cas.", categorie: "Protection sociale", importance: "haute" },
    { terme: "Minimum vieillesse (ASPA)", definition: "Allocation de Solidarité aux Personnes Agées. Revenu minimum garanti aux retraités ayant une retraite insuffisante (~916€/mois en 2025).", categorie: "Protection sociale", importance: "moyenne" },
    { terme: "Complémentaire santé obligatoire", definition: "Depuis 2016, l'employeur doit proposer une mutuelle à tous ses salariés et financer 50% de la cotisation.", categorie: "Protection sociale", importance: "haute" },

    // ===== EMPLOI ÉLARGI =====
    { terme: "NEET", definition: "Not in Education, Employment or Training. Jeunes ni en emploi, ni en études, ni en formation. En France: ~12% des 15-29 ans.", categorie: "Emploi", importance: "moyenne" },
    { terme: "Halo du chômage", definition: "Personnes proches du chômage mais non comptées dans le taux BIT: découragés, disponibles mais ne cherchant plus, cherchant mais pas disponibles.", categorie: "Emploi", importance: "moyenne" },
    { terme: "SAS (Travail saisonnier)", definition: "Contrat de travail pour des activités saisonnières (agriculture, tourisme). Permet les CDD successifs sans délai de carence.", categorie: "Emploi", importance: "basse" },
    { terme: "Portage salarial", definition: "Forme hybride entre salariat et indépendance. Une entreprise de portage emploie le consultant qui facture ses clients. Il bénéficie de la protection salariale.", categorie: "Emploi", importance: "basse" },
    { terme: "Groupement d'employeurs", definition: "Structure permettant à plusieurs PME de partager des salariés à temps partiel. Évite le travail précaire tout en offrant de la flexibilité aux employeurs.", categorie: "Emploi", importance: "basse" },
    { terme: "Emplois francs", definition: "Aide à l'embauche pour les personnes résidant dans les quartiers prioritaires de la politique de la ville (QPV). 5 000€/an sur 3 ans pour un CDI.", categorie: "Emploi", importance: "basse" },
    { terme: "Contrat de professionnalisation", definition: "Alternance combinant formation et travail en entreprise pour adultes (+ de 26 ans) ou jeunes. Salaire: 55 à 100% du SMIC selon l'âge et le diplôme.", categorie: "Emploi", importance: "moyenne" },
    { terme: "CEJ", definition: "Contrat d'Engagement Jeune. Accompagnement intensif des jeunes NEET vers l'emploi (15h+ activités/semaine). Allocation allant jusqu'à 528€/mois.", categorie: "Emploi", importance: "basse" },

    // ===== INDICATEURS ÉCONOMIQUES =====
    { terme: "Taux d'épargne", definition: "Part du revenu disponible non consommée. Élevé en France (~17%). Monte en période d'incertitude (épargne de précaution).", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Confiance des ménages", definition: "Indicateur INSEE mensuel mesurant l'optimisme/pessimisme des ménages sur leur situation financière et l'économie. Prédit la consommation.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "PMI", definition: "Purchasing Managers Index. Enquête mensuelle auprès des directeurs achats. Au-dessus de 50 = expansion, en dessous = contraction. Indicateur avancé.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "ISM", definition: "Institute for Supply Management. Équivalent américain du PMI, très suivi par les marchés financiers.", categorie: "Indicateurs", importance: "basse" },
    { terme: "IPC", definition: "Indice des Prix à la Consommation. Mesure l'inflation ressentie par les ménages. Panier de référence de ~300 produits et services mis à jour annuellement.", categorie: "Indicateurs", importance: "haute" },
    { terme: "IPCH", definition: "Indice des Prix à la Consommation Harmonisé. Version européenne de l'IPC, permettant des comparaisons entre pays de la zone euro.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Déflateur du PIB", definition: "Mesure de l'inflation basée sur l'ensemble de la production (vs panier de consommation pour l'IPC). Utilisé pour calculer le PIB en volume.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Taux de marge", definition: "Excédent Brut d'Exploitation (EBE) / Valeur Ajoutée. Mesure la part de la richesse produite captée par le capital. France: ~32,5% en 2024.", categorie: "Indicateurs", importance: "haute" },
    { terme: "GFCF", definition: "Formation Brute de Capital Fixe. Mesure l'investissement des entreprises, ménages et administrations. Indicateur de la capacité productive future.", categorie: "Indicateurs", importance: "basse" },
    { terme: "Taux d'emploi", definition: "Part de la population en âge de travailler (15-64 ans) ayant un emploi. Objectif UE: 78% en 2030. France: ~69%.", categorie: "Indicateurs", importance: "moyenne" },
    { terme: "Enquête ACEMO", definition: "Enquête sur l'Activité et les Conditions d'EMploi de la main-d'Œuvre. Source DARES pour les statistiques sur les salaires et le temps de travail.", categorie: "Indicateurs", importance: "basse" },

    // ===== PARTAGE DE LA VALEUR =====
    { terme: "Valeur ajoutée (VA)", definition: "Richesse créée par une entreprise = Production - Consommations intermédiaires. Se partage entre salaires, cotisations, impôts, amortissements et profits.", categorie: "Partage VA", importance: "haute" },
    { terme: "EBE (Excédent Brut d'Exploitation)", definition: "Part de la VA restant à l'entreprise après paiement des salaires et impôts de production. Finance l'investissement, la dette et les dividendes.", categorie: "Partage VA", importance: "haute" },
    { terme: "Taux de profit", definition: "Rapport entre le profit et le capital investi. Indicateur de la rentabilité du capital. En hausse depuis les années 1980.", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Coût du travail", definition: "Total des dépenses liées à l'emploi: salaire brut + cotisations patronales - aides de l'État. France: parmi les plus élevés d'Europe mais compensé par la productivité.", categorie: "Partage VA", importance: "haute" },
    { terme: "Part salariale", definition: "Part des salaires (+ cotisations) dans la valeur ajoutée. En France: ~58%. En baisse de ~10 points depuis 1980 au profit du capital.", categorie: "Partage VA", importance: "haute" },
    { terme: "Coefficient de Gini", definition: "Mesure les inégalités de revenus: 0 = égalité parfaite, 1 = inégalité maximale. France: 0,29 (relativement égalitaire vs 0,41 aux USA).", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Rapport D9/D1", definition: "Rapport entre le 9ème décile et le 1er décile de salaires. Mesure l'écart entre hauts et bas salaires. France: D9/D1 ≈ 2,9 (relativement faible).", categorie: "Partage VA", importance: "moyenne" },
    { terme: "Top 1%", definition: "Les 1% les plus riches. En France, leur part dans les revenus est passée de ~7% (1980) à ~10-11% (2024). Moins extrême qu'aux USA (~20%).", categorie: "Partage VA", importance: "moyenne" },

    // ===== IRP ET REPRÉSENTATION =====
    { terme: "Procès-verbal de carence", definition: "Document constatant qu'aucun candidat ne s'est présenté aux élections CSE. L'employeur est dispensé d'organiser de nouvelles élections pendant 4 ans.", categorie: "IRP", importance: "basse" },
    { terme: "Base de données économiques (BDES/BDESE)", definition: "Base de Données Économiques Sociales et Environnementales. Mise à disposition du CSE pour l'exercice de ses missions. Contenu défini par accord ou décret.", categorie: "IRP", importance: "haute" },
    { terme: "Consultation récurrente", definition: "3 consultations annuelles obligatoires du CSE: orientations stratégiques, situation économique et financière, politique sociale.", categorie: "IRP", importance: "haute" },
    { terme: "Droit d'alerte économique", definition: "Possibilité pour le CSE de demander des informations à l'employeur en cas de préoccupation sur la situation économique de l'entreprise.", categorie: "IRP", importance: "haute" },
    { terme: "Droit d'alerte sociale", definition: "Le CSE peut alerter l'employeur et l'inspecteur du travail sur toute atteinte aux droits des personnes ou tout fait contraire aux réglementations.", categorie: "IRP", importance: "haute" },
    { terme: "Commission de suivi", definition: "Instance paritaire créée par un accord pour surveiller son application. Obligatoire pour certains accords collectifs (participation, intéressement...).", categorie: "IRP", importance: "basse" },
    { terme: "RSS", definition: "Représentant Syndical au Comité Social et Économique. Désigné par les OS dans les entreprises >500 salariés. Assiste aux séances du CSE sans voix délibérative.", categorie: "IRP", importance: "basse" },

    // ===== EUROPE ÉLARGI =====
    { terme: "Fonds structurels (FSE+)", definition: "Fonds Social Européen Plus. Finance la formation, l'emploi et l'inclusion en Europe. La France bénéficie de ~5 Mds€ sur 2021-2027.", categorie: "Europe", importance: "basse" },
    { terme: "Semestre européen", definition: "Cycle annuel de coordination des politiques économiques entre les États membres. La Commission émet des recommandations sur les budgets nationaux.", categorie: "Europe", importance: "basse" },
    { terme: "Mécanisme Européen de Stabilité (MES)", definition: "Fonds de secours pour les États de la zone euro en difficulté financière. A aidé Grèce, Irlande, Portugal, Espagne, Chypre post-2010.", categorie: "Europe", importance: "basse" },
    { terme: "Pacte de stabilité et de croissance", definition: "Règles budgétaires de l'UE: déficit <3% du PIB, dette <60%. Suspendu pendant le Covid, réformé en 2024 pour plus de flexibilité.", categorie: "Europe", importance: "moyenne" },
    { terme: "ETUI", definition: "European Trade Union Institute. Centre de recherche de la CES (Confédération Européenne des Syndicats). Produit des études sur le droit social européen.", categorie: "Europe", importance: "basse" },
    { terme: "Comité d'entreprise européen (CEE)", definition: "Instance de représentation des salariés dans les multinationales opérant dans 2+ pays de l'UE avec >1000 salariés au total.", categorie: "Europe", importance: "moyenne" },

    // ===== ENVIRONNEMENT ET TRANSITION =====
    { terme: "Taxe carbone", definition: "Prélèvement sur les émissions de CO₂. En France via la contribution énergie-climat. Objectif: inciter à réduire les émissions et financer la transition.", categorie: "Environnement", importance: "moyenne" },
    { terme: "Marché carbone (ETS)", definition: "Système d'échange de quotas d'émissions européen. Les entreprises polluantes doivent acheter des droits à polluer. Prix: ~60-90€/tonne CO₂.", categorie: "Environnement", importance: "basse" },
    { terme: "Emplois verts", definition: "Emplois contribuant à réduire l'impact environnemental. En forte croissance: énergies renouvelables, rénovation thermique, transports durables.", categorie: "Environnement", importance: "basse" },
    { terme: "Devoir de vigilance", definition: "Loi 2017 obligeant les grandes entreprises françaises à identifier et prévenir les risques sociaux et environnementaux de leurs filiales et sous-traitants.", categorie: "Environnement", importance: "moyenne" },
    { terme: "Bilan carbone (bilan GES)", definition: "Inventaire des émissions de gaz à effet de serre d'une organisation. Obligatoire pour les entreprises >500 salariés tous les 4 ans.", categorie: "Environnement", importance: "basse" },

    // ===== NUMÉRIQUE ET FUTUR DU TRAVAIL =====
    { terme: "Plateforme (travail)", definition: "Modèle d'entreprise utilisant une application pour mettre en relation des travailleurs indépendants avec des clients (Uber, Deliveroo). Statut juridique contesté.", categorie: "Numérique", importance: "haute" },
    { terme: "Ubérisation", definition: "Transformation d'un secteur par des plateformes numériques remplaçant des emplois salariés par du travail indépendant. Désintermédie et flexibilise.", categorie: "Numérique", importance: "haute" },
    { terme: "IA et emploi", definition: "Les études divergent: l'IA détruirait 30% des emplois actuels (McKinsey) mais en créerait autant. Les emplois routiniers (bureau, logistique) sont les plus exposés.", categorie: "Numérique", importance: "haute" },
    { terme: "Revenu universel de base (RUB)", definition: "Allocation versée à tous les citoyens sans condition. Expérimenté en Finlande (2017-2018), Écosse, Espagne. Débat sur son financement et ses effets sur l'offre de travail.", categorie: "Numérique", importance: "basse" },
    { terme: "Semaine de 4 jours", definition: "Organisation du travail sur 4 jours au lieu de 5, sans réduction de salaire. Expérimentée dans plusieurs pays (Islande, Belgique, UK). Résultats positifs sur le bien-être.", categorie: "Numérique", importance: "moyenne" },
  ];

  const categories = [...new Set(glossaire.map(g => g.categorie))].sort();
  const [filtreCategorie, setFiltreCategorie] = useState('all');
  const [recherche, setRecherche] = useState('');
  const [filtreImportance, setFiltreImportance] = useState('all');

  const glossaireFiltre = glossaire.filter(g => {
    const matchCategorie = filtreCategorie === 'all' || g.categorie === filtreCategorie;
    const matchRecherche = recherche === '' || 
      g.terme.toLowerCase().includes(recherche.toLowerCase()) || 
      g.definition.toLowerCase().includes(recherche.toLowerCase());
    const matchImportance = filtreImportance === 'all' || g.importance === filtreImportance;
    return matchCategorie && matchRecherche && matchImportance;
  });

  // Grouper par catégorie pour l'affichage
  const glossaireParCategorie = glossaireFiltre.reduce((acc, item) => {
    if (!acc[item.categorie]) acc[item.categorie] = [];
    acc[item.categorie].push(item);
    return acc;
  }, {});

  const importanceColors = {
    haute: darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200',
    moyenne: darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200',
    basse: darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
  };

  const importanceBadge = {
    haute: { bg: darkMode ? 'bg-red-700' : 'bg-red-500', text: '⭐ Essentiel' },
    moyenne: { bg: darkMode ? 'bg-yellow-700' : 'bg-yellow-500', text: 'Important' },
    basse: { bg: darkMode ? 'bg-gray-600' : 'bg-gray-400', text: 'Utile' }
  };

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gradient-to-r from-purple-900 to-indigo-900' : 'bg-gradient-to-r from-purple-600 to-indigo-600'} text-white`}>
        <h2 className="text-lg font-bold">📖 Aide & Glossaire</h2>
        <p className="text-sm opacity-80">Plus de 270 termes expliqués pour maîtriser les NAO et l'économie</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 flex-wrap">
        {[['glossaire', '📚 Glossaire'], ['indicateurs', '📊 Indicateurs'], ['sources', '🔗 Sources'], ['methodologie', '🔬 Méthodologie']].map(([id, label]) => (
          <button 
            key={id} 
            onClick={() => setOpenSection(id)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${openSection === id ? 'bg-purple-600 text-white' : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* GLOSSAIRE */}
      {openSection === 'glossaire' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow`}>
          {/* Filtres */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="🔍 Rechercher un terme..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className={`flex-1 min-w-[200px] px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'}`}
            />
            <select
              value={filtreCategorie}
              onChange={(e) => setFiltreCategorie(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="all">📁 Toutes catégories ({glossaire.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat} ({glossaire.filter(g => g.categorie === cat).length})</option>
              ))}
            </select>
            <select
              value={filtreImportance}
              onChange={(e) => setFiltreImportance(e.target.value)}
              className={`px-3 py-2 rounded-lg border text-sm ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            >
              <option value="all">⭐ Toute importance</option>
              <option value="haute">⭐ Essentiels uniquement</option>
              <option value="moyenne">📌 Importants</option>
              <option value="basse">📎 Utiles</option>
            </select>
          </div>

          {/* Stats rapides */}
          <div className={`flex gap-4 mb-4 p-2 rounded-lg text-xs ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
            <span><strong>{glossaireFiltre.length}</strong> termes affichés</span>
            <span className="text-red-500">⭐ {glossaireFiltre.filter(g => g.importance === 'haute').length} essentiels</span>
            <span className="text-yellow-500">📌 {glossaireFiltre.filter(g => g.importance === 'moyenne').length} importants</span>
            <span>{Object.keys(glossaireParCategorie).length} catégories</span>
          </div>

          {/* Liste groupée par catégorie */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {Object.entries(glossaireParCategorie).sort().map(([categorie, termes]) => (
              <div key={categorie}>
                <h4 className={`font-bold text-sm mb-2 sticky top-0 py-1 ${darkMode ? 'bg-gray-800 text-purple-400' : 'bg-white text-purple-700'}`}>
                  {categorie} ({termes.length})
                </h4>
                <div className="space-y-2">
                  {termes.sort((a, b) => a.terme.localeCompare(b.terme)).map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border transition-all hover:scale-[1.01] ${importanceColors[item.importance]}`}
                    >
                      <div className="flex justify-between items-start gap-2 flex-wrap">
                        <span className={`font-bold ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                          {item.terme}
                        </span>
                        <div className="flex gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-lg text-white ${importanceBadge[item.importance].bg}`}>
                            {importanceBadge[item.importance].text}
                          </span>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.definition}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {glossaireFiltre.length === 0 && (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="text-4xl mb-2">🔍</div>
              <p>Aucun terme trouvé pour cette recherche</p>
              <button 
                onClick={() => { setRecherche(''); setFiltreCategorie('all'); setFiltreImportance('all'); }}
                className="mt-2 text-purple-500 hover:underline text-sm"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}

          <p className={`text-xs mt-4 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            💡 Astuce : Les termes ⭐ Essentiels sont ceux à maîtriser en priorité pour les NAO
          </p>
        </div>
      )}

      {/* INDICATEURS */}
      {openSection === 'indicateurs' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📊 Comment lire les indicateurs</h3>
          
          <div className={`p-3 rounded-xl ${darkMode ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-800'}`}>🟢 Indicateurs positifs</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-green-300' : 'text-green-700'}`}>
              <li>• <b>PIB en hausse</b> → Croissance économique, plus de richesses à partager</li>
              <li>• <b>Salaires {">"} Inflation</b> → Gain de pouvoir d'achat</li>
              <li>• <b>Chômage en baisse</b> → Marché du travail favorable aux salariés</li>
            </ul>
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-800'}`}>🔴 Indicateurs d'alerte</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
              <li>• <b>Inflation {">"} Salaires</b> → Perte de pouvoir d'achat</li>
              <li>• <b>Défaillances en hausse</b> → Difficultés économiques des entreprises</li>
              <li>• <b>Taux de marge élevé</b> → Les profits augmentent plus que les salaires</li>
            </ul>
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200'} border`}>
            <h4 className={`font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>💡 Note de lecture</h4>
            <ul className={`text-sm mt-2 space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
              <li>• <b>Inflation cumulée</b> → "Depuis 2022, les prix ont augmenté de X%, nos salaires doivent suivre"</li>
              <li>• <b>Partage VA</b> → "Le taux de marge est à X%, il y a de la place pour augmenter les salaires"</li>
              <li>• <b>Comparaison UE</b> → "En Allemagne, le SMIC est X% plus élevé"</li>
              <li>• <b>Tensions recrutement</b> → "X% des entreprises ont du mal à recruter, augmentez pour fidéliser"</li>
            </ul>
          </div>
        </div>
      )}

      {/* SOURCES */}
      {openSection === 'sources' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🔗 Sources des données</h3>
          
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { nom: "INSEE", url: "https://www.insee.fr", desc: "PIB, inflation, emploi, salaires", color: "blue" },
              { nom: "DARES", url: "https://dares.travail-emploi.gouv.fr", desc: "Emploi, chômage, conditions de travail", color: "green" },
              { nom: "France Travail", url: "https://www.francetravail.fr/statistiques", desc: "Offres d'emploi, tensions métiers, BMO", color: "purple" },
              { nom: "URSSAF", url: "https://www.urssaf.fr", desc: "Cotisations, PPV, masse salariale", color: "orange" },
              { nom: "Banque de France", url: "https://www.banque-france.fr", desc: "Défaillances, crédit, conjoncture", color: "cyan" },
              { nom: "Légifrance", url: "https://www.legifrance.gouv.fr", desc: "Conventions collectives, textes de loi", color: "red" },
              { nom: "Ministère du Travail", url: "https://travail-emploi.gouv.fr", desc: "SMIC, comité de suivi branches", color: "indigo" },
              { nom: "Eurostat", url: "https://ec.europa.eu/eurostat", desc: "Comparaisons européennes", color: "yellow" }
            ].map((source, idx) => (
              <a 
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-3 rounded-xl border transition-colors ${darkMode ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full bg-${source.color}-500`}></span>
                  <span className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{source.nom}</span>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{source.desc}</p>
              </a>
            ))}
          </div>

          <div className={`p-3 rounded-xl ${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'} border`}>
            <p className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
              ⚠️ <b>Note</b> : Les données sont mises à jour automatiquement via des API publiques. 
              Certaines données (conventions collectives) sont vérifiées manuellement.
            </p>
          </div>
        </div>
      )}

      {/* METHODOLOGIE */}
      {openSection === 'methodologie' && (
        <div className={`rounded-2xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow space-y-4`}>
          <h3 className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🔬 Méthodologie</h3>
          
          <div className={`space-y-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📈 Pouvoir d'achat cumulé</h4>
              <p className="mt-1">Calculé comme l'écart cumulé entre l'évolution des salaires et l'inflation depuis 2019. Un chiffre négatif indique une perte de pouvoir d'achat.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🧮 Simulateur NAO</h4>
              <p className="mt-1">Les calculs du RGDU 2026 sont basés sur le décret n°2025-1446. Le taux de réduction suit la formule officielle avec P=1.75 et un plancher de 2%.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>📋 Conformité SMIC</h4>
              <p className="mt-1">Une branche est "non conforme" si au moins un niveau de sa grille de classification est inférieur au SMIC en vigueur.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>💰 Coût employeur (Superbrut)</h4>
              <p className="mt-1">Inclut : maladie (13%), vieillesse (10.57%), allocations familiales (5.25%), chômage (4.25%), retraite complémentaire (~6%), FNAL, formation, AT/MP (~2%). Total ~43% avant réductions.</p>
            </div>

            <div className={`p-3 rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
              <h4 className={`font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>🔄 Fréquence de mise à jour</h4>
              <ul className="mt-1 space-y-1">
                <li>• <b>Quotidien</b> : données via API (inflation, emploi...)</li>
                <li>• <b>Trimestriel</b> : PIB, comptes nationaux</li>
                <li>• <b>Manuel</b> : conventions collectives (après revalorisations SMIC)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className={`text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <p>Tableau de bord développé pour la CFTC • Données publiques • Open source</p>
        <p className="mt-1">💡 Suggestion ? Bug ? Contactez <a href="mailto:hspringragain@cftc.fr" className="underline">hspringragain@cftc.fr</a></p>
      </div>
    </div>
  );
}
}
