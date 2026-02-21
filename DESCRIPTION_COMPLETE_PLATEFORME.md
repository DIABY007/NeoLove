# 📱 Description Complète de la Plateforme NeoLove

## 🎯 Vue d'ensemble

**NeoLove** est une plateforme SaaS d'assistance IA spécialisée dans la génération de réponses pour les conversations amoureuses et relationnelles. Elle aide les utilisateurs à créer des messages pertinents, adaptés au ton et à l'objectif souhaité, pour améliorer leurs interactions sur WhatsApp, SMS et applications de rencontre.

**Tagline** : *"Votre assistant intelligent pour des conversations qui marquent."*

---

## 🏗️ Architecture Technique

### Stack Technologique

- **Frontend** : Next.js 16.1.6 (React 19.2.4) avec TypeScript
- **Backend** : API Routes Next.js (serverless)
- **Base de données** : Supabase (PostgreSQL)
- **Authentification** : Sessions JWT + OTP via WhatsApp
- **IA/LLM** : OpenRouter (accès à plusieurs modèles)
- **Intégration WhatsApp** : WasenderAPI
- **Styling** : TailwindCSS
- **Analytics** : Vercel Analytics
- **Déploiement** : Vercel

### Structure du Projet

```
NeoLove/
├── src/
│   ├── components/        # Composants React réutilisables
│   ├── lib/              # Logique métier et utilitaires
│   ├── pages/            # Pages Next.js (routing)
│   ├── styles/           # Styles globaux
│   └── utils/            # Utilitaires (RAG, prompts)
├── data/                 # Base de connaissances (templates)
├── supabase/             # Migrations base de données
└── public/               # Assets statiques
```

---

## 🎨 Fonctionnalités Principales

### 1. **Génération de Réponses IA**

#### Processus de génération
1. L'utilisateur colle le message reçu
2. Sélectionne un **ton** (7 options disponibles)
3. Sélectionne un **objectif** (8 options disponibles)
4. Optionnel : ajoute du contexte personnalisé
5. **Recherche RAG** : Le système trouve les passages les plus pertinents dans la base de connaissances
6. **Génération IA** : L'IA génère des réponses en s'inspirant des templates trouvés
7. **Retour** : L'utilisateur reçoit **2-3 variantes de réponses** prêtes à l'emploi (selon le mode)

#### Tons Disponibles
- **Neutre** : Équilibré et posé (52.8% de la base de connaissances)
- **Sérieux** : Mature et réfléchi (20.2% de la base)
- **Provocateur** : Audacieux et charmeur (10.0% de la base)
- **Romantique** : Doux et attentionné (6.7% de la base)
- **Joueur** : Fun et décontracté (5.0% de la base)
- **Taquin** : Joueur et espiègle (3.5% de la base)
- **Empathique** : Compréhensif et bienveillant (1.8% de la base)

#### Objectifs Disponibles
- **Créer complicité** : Approfondir la connexion et la complicité (39.0% de la base)
- **Créer tension** : Ajouter du flirt subtil et de la tension (34.3% de la base)
- **Proposer rendez-vous** : Proposer une rencontre concrète (10.0% de la base)
- **Tester intérêt** : Évaluer l'investissement et l'engagement (7.6% de la base)
- **Relancer sans needy** : Relancer sans paraître insistant (7.0% de la base)
- **Attirer attention** : Capter l'intérêt dès le premier message (1.2% de la base)
- **Désamorcer froid** : Rebondir sur un message fade ou peu engageant (0.9% de la base)
- **Prendre distance** : Clore poliment une conversation (optionnel)

### 2. **Système RAG (Retrieval-Augmented Generation)**

#### Architecture RAG
- **Base de connaissances** : 341 passages annotés (130 templates uniques)
- **Recherche sémantique** : Matching par similarité vectorielle, ton, objectif et contexte
- **Contexte enrichi** : Les passages les plus pertinents sont injectés dans le prompt IA
- **Deux modes de génération** :
  - **Mode strict** (Temperature ≈ 0.3) : Réponses fidèles aux templates, 2 variantes (short/long)
  - **Mode créatif** (Temperature ≈ 0.8) : Réponses innovantes, 3 variantes (conservative/playful/bold)

#### Distribution de la Base de Connaissances
- **Par type** : 43.1% conseils, 32.0% templates, 16.7% sujets, 6.2% règles
- **Par ton** : 52.8% neutre, 20.2% sérieux, 10.0% provocateur, 6.7% romantique, 5.0% joueur, 3.5% taquin, 1.8% empathique
- **Par objectif** : 39.0% créer complicité, 34.3% créer tension, 10.0% proposer rendez-vous, 7.6% tester intérêt
- **Par section** : 18 sections thématiques couvrant flirt, rendez-vous, relances, sujets de conversation, etc.
- **Score de qualité moyen** : 0.761 (échelle 0.0-1.0)

#### Sécurité et Qualité
- **Filtrage automatique** : Exclusion des passages à risque (sexualité directe, manipulation)
- **Checks de sécurité** : Validation du signal d'engagement, vérification de la pertinence du ton
- **Revue humaine** : 9 passages flaggés pour révision (2.6% du total)

#### Système de Prompts RAG
La plateforme utilise deux types de prompts selon le contexte :

**Prompt RAG Strict** (Temperature ≈ 0.3)
- **Usage** : Génération fidèle aux templates de la base de connaissances
- **Output** : 2 variantes (short: 1-2 lignes, long: 3-4 lignes)
- **Caractéristiques** : Réponses conservatrices, alignées avec les exemples validés
- **Sécurité** : Règles strictes contre contenu explicite et manipulation

**Prompt RAG Créatif** (Temperature ≈ 0.8)
- **Usage** : Génération innovante avec plus de liberté créative
- **Output** : 3 variantes (conservative, playful, bold) × 2 formats (short/long)
- **Caractéristiques** : Réponses variées explorant différentes nuances du ton demandé
- **Sécurité** : Même niveau de protection que le mode strict

**Règles de sécurité intégrées** :
- Aucun contenu sexuellement explicite
- Pas de manipulation émotionnelle (culpabilisation, chantage)
- Arrêt recommandé si signal d'engagement "fermé" après 2 tentatives
- Vérification de la pertinence avant de proposer un rendez-vous

### 3. **Authentification par OTP WhatsApp**

- **Inscription/Connexion** : Via numéro de téléphone
- **OTP** : Code à 6 chiffres envoyé par WhatsApp
- **Sessions** : Gestion via JWT (JSON Web Tokens)
- **Sécurité** : Codes OTP expirant après 5 minutes
- **Fallback** : Affichage du code si WhatsApp échoue

### 4. **Système de Licences et Abonnements**

#### Plans Disponibles

| Plan | Durée | Prix | Commission Affilié |
|------|-------|------|-------------------|
| **Essai** | 3 jours | Gratuit | 0 FCFA |
| **Mensuel** | 1 mois | 5 000 FCFA | 1 000 FCFA |
| **Trimestriel** | 3 mois | 12 000 FCFA | 2 000 FCFA |
| **Semestriel** | 6 mois | 20 000 FCFA | 4 000 FCFA |

#### Fonctionnalités des Plans
- ✅ Générations illimitées
- ✅ Tous les tons disponibles
- ✅ Tous les objectifs disponibles
- ✅ Support WhatsApp

#### Activation
- **Paiement** : Mobile Money via WhatsApp
- **Codes d'activation** : Générés par les admins après paiement
- **Auto-activation** : Essai gratuit de 3 jours à l'inscription

### 5. **Système d'Affiliation Complet**

#### Génération de Codes
- **Format** : `NEO-XXXX` (4 caractères alphanumériques)
- **Codes personnalisés** : Possibilité de créer des codes custom (3-16 caractères)
- **Unicité** : Vérification automatique des doublons

#### Commissions
- **Attribution** : Automatique lors de l'activation d'une licence par un parrainé
- **Montants** : Variables selon le plan (1K/2K/4K FCFA)
- **Statut** : `pending` → `approved` → `paid`

#### Anti-Fraude Avancé
- **Auto-parrainage** : Blocage des auto-références
- **Duplicatas** : Détection des numéros de téléphone déjà utilisés
- **Velocity checks** : Limite de leads par IP (3/jour) et par device (2/jour)
- **Quality scoring** : Score de qualité basé sur plusieurs facteurs
- **Fingerprinting** : Hash des téléphones, IPs et devices
- **Review manuelle** : Flags pour les cas suspects

#### Dashboard Affilié
- **Statistiques** : Leads, conversions, commissions
- **Historique** : Toutes les activités trackées
- **Demande de paiement** : Interface pour réclamer les commissions
- **Partage** : Liens de parrainage et messages WhatsApp pré-remplis

### 6. **Interface Utilisateur**

#### Design
- **Thème** : Dark mode avec accents colorés
- **Responsive** : Mobile-first design
- **UX** : Interface intuitive et épurée
- **Animations** : Transitions fluides et feedback visuel

#### Pages Principales
1. **Page d'accueil** (`/`) : Landing page avec présentation, témoignages, CTA
2. **Connexion** (`/auth`) : Formulaire d'inscription/connexion avec OTP
3. **Chat** (`/chat`) : Interface principale de génération de réponses
4. **Profil** (`/profile`) : Gestion du compte, activation de codes, statut licence
5. **Tarifs** (`/pricing`) : Affichage des plans et paiement WhatsApp
6. **Affiliation** (`/affiliate`) : Dashboard affilié avec statistiques

### 7. **Panel Administrateur**

#### Gestion des Utilisateurs
- Liste complète des utilisateurs
- Statut des licences
- Historique des générations

#### Gestion des Affiliés
- **Top affiliés** : Classement par commissions ou leads
- **Alertes** : Détection des fraudes et cas suspects
- **Résumé** : Statistiques globales (revenus, conversions, etc.)
- **Leads** : Liste détaillée avec quality scores
- **Commissions** : Gestion des paiements et statuts
- **Export** : Export CSV des données

#### Génération de Licences
- Création manuelle de codes d'activation
- Attribution à des utilisateurs spécifiques
- Gestion des plans et durées

---

## 🔐 Sécurité

### Authentification
- **JWT** : Tokens sécurisés avec expiration
- **Sessions** : Gestion côté serveur avec cookies httpOnly
- **OTP** : Codes à usage unique avec expiration (5 min)

### Base de Données
- **Row Level Security (RLS)** : Activé sur toutes les tables Supabase
- **Service Role** : Accès uniquement via API routes (pas d'accès direct frontend)
- **Hashing** : Téléphones et IPs hashés (SHA-256) pour la protection des données
- **Backups** : Sauvegardes automatiques quotidiennes
- **Migrations** : Versioning des schémas avec rollback possible
- **Indexation** : Index optimisés pour les requêtes fréquentes (recherche RAG, analytics)

### API
- **Validation** : Zod schemas pour toutes les entrées utilisateur
- **Rate Limiting** : 5 requêtes par minute par utilisateur (générations de réponses)
- **Cache Control** : En-têtes no-cache sur les routes sensibles (auth, paiements)
- **Error Handling** : Gestion centralisée des erreurs avec messages utilisateur clairs
- **Logging** : Traçabilité complète des actions pour debugging et analytics

---

## 📊 Analytics et Tracking

### Événements Trackés
- Générations de réponses (ton, objectif, contact)
- Copies de messages
- Envois via WhatsApp
- Activations de codes
- Inscriptions via parrainage

### Métriques
- Utilisation par utilisateur
- Préférences de tons/objectifs
- Taux de conversion
- Performance des affiliés

---

## 🔌 Intégrations

### WasenderAPI
- **Envoi OTP** : Codes de vérification par WhatsApp
- **Notifications** : Messages aux affiliés
- **Support** : Communication avec les utilisateurs

### OpenRouter
- **LLM** : Accès à plusieurs modèles d'IA (GPT-4, Claude, etc.)
- **Flexibilité** : Possibilité de changer de modèle facilement selon les besoins
- **Coûts** : Optimisation des appels API avec cache et réduction des tokens
- **Configuration** : Temperature ajustable (0.3 pour mode strict, 0.8 pour mode créatif)
- **Fallback** : Gestion automatique des erreurs avec retry et modèles alternatifs

### Supabase
- **Base de données** : PostgreSQL managé
- **Auth** : Infrastructure d'authentification (utilisée partiellement)
- **Storage** : Stockage de fichiers (si nécessaire)

### Vercel
- **Hébergement** : Déploiement automatique
- **Analytics** : Tracking des performances
- **Edge Functions** : Optimisation globale

---

## 📈 Modèle Économique

### Revenus
- **Abonnements** : Plans mensuels, trimestriels, semestriels
- **Paiement** : Mobile Money (Burkina Faso - FCFA)

### Coûts
- **Infrastructure** : Vercel, Supabase, OpenRouter, WasenderAPI
- **Commissions** : 20% du prix de vente aux affiliés

### Croissance
- **Parrainage** : Système d'affiliation pour acquisition
- **Essai gratuit** : 3 jours pour tester sans engagement

---

## 🎯 Cas d'Usage

### Utilisateurs Finaux
1. **Personne en recherche** : Améliorer ses conversations sur les apps de rencontre
2. **Relation en cours** : Maintenir l'intérêt et créer de la complicité
3. **Relance** : Redynamiser une conversation qui s'essouffle
4. **Stress** : Réduire l'anxiété liée aux réponses

### Affiliés
1. **Influenceurs** : Monétiser leur audience
2. **Communautés** : Partager avec leur réseau
3. **Entrepreneurs** : Revenus passifs via parrainage

---

## 🚀 Roadmap & Améliorations Futures

### Fonctionnalités Potentielles
- **Historique des conversations** : Sauvegarder les échanges et reprendre le contexte
- **Contacts** : Gérer plusieurs conversations simultanément avec profils distincts
- **Templates personnalisés** : Créer et sauvegarder ses propres modèles de messages
- **Analyse de sentiment** : Détection automatique de l'humeur des messages reçus
- **Suggestions proactives** : Recommandations automatiques de ton/objectif selon le contexte
- **Multi-langues** : Support d'autres langues que le français (anglais, espagnol, etc.)
- **API publique** : Accès programmatique pour développeurs et intégrations tierces
- **Mode conversationnel** : Chat continu avec mémoire contextuelle
- **Statistiques personnelles** : Dashboard avec analyse des préférences et performances

### Optimisations Techniques
- **Cache** : Mise en cache des réponses fréquentes
- **CDN** : Distribution globale des assets
- **Monitoring** : Alertes et dashboards de performance
- **Tests** : Suite de tests automatisés

---

## 📱 Support et Communication

### Canaux de Support
- **WhatsApp** : Support direct via numéro dédié
- **Email** : Contact pour questions complexes
- **In-app** : Messages d'aide contextuels

### Documentation
- **Guides utilisateur** : Tutoriels et FAQ
- **Documentation technique** : Pour les développeurs
- **Changelog** : Historique des mises à jour

---

## 🌟 Points Forts de la Plateforme

1. **Spécialisation** : Focus exclusif sur les conversations relationnelles et amoureuses
2. **Simplicité** : Interface intuitive, processus en 4 étapes pour une réponse personnalisée
3. **Personnalisation** : 7 tons × 8 objectifs = 56 combinaisons uniques
4. **Rapidité** : Réponses générées en 2-5 secondes (recherche RAG + génération IA)
5. **Qualité** : RAG avec 341 passages annotés et score de qualité moyen de 0.761
6. **Intelligence contextuelle** : Deux modes de génération (strict/créatif) adaptés aux besoins
7. **Accessibilité** : Prix adaptés au marché local (FCFA) avec essai gratuit de 3 jours
8. **Croissance** : Système d'affiliation complet avec anti-fraude avancé
9. **Sécurité** : Protection des données, filtrage automatique, validation multi-niveaux
10. **Évolutivité** : Architecture serverless prête pour la montée en charge

---

## 📊 Statistiques Techniques

### Base de Connaissances
- **Passages annotés** : 341 passages
- **Templates uniques** : 130 templates
- **Paires fine-tuning** : 1000 paires (version principale)
- **Sections thématiques** : 18 sections
- **Score de qualité moyen** : 0.761 (min: 0.3, max: 1.0)

### Fonctionnalités
- **Tons disponibles** : 7 options (neutre, sérieux, provocateur, romantique, joueur, taquin, empathique)
- **Objectifs disponibles** : 8 options
- **Variantes générées** : 2-3 par requête (selon le mode strict/créatif)
- **Combinaisons possibles** : 7 tons × 8 objectifs = 56 combinaisons

### Performance et Limites
- **Rate limit** : 5 générations/minute par utilisateur
- **Durée OTP** : 5 minutes (expiration automatique)
- **Essai gratuit** : 3 jours automatiques à l'inscription
- **Temps de génération** : 2-5 secondes (incluant recherche RAG + génération IA)
- **Taux de disponibilité** : 99.9% (objectif)

### Sécurité
- **Passages validés** : 97.4% (332/341)
- **Passages à réviser** : 2.6% (9/341)
- **Checks anti-fraude** : Velocity (3 leads/IP/jour, 2 leads/device/jour)

---

## 🎓 Base de Connaissances (RAG)

### Vue d'ensemble
La plateforme utilise une **base de connaissances (RAG)** sophistiquée composée de :

#### Volume et Structure
- **341 passages annotés** : Extraits de contenu expert en séduction bienveillante
- **130 templates uniques** : Messages prêts à l'emploi ou adaptables
- **18 sections thématiques** : Flirt, rendez-vous, relances, sujets de conversation, etc.
- **1000 paires fine-tuning** : Données d'entraînement pour améliorer le modèle
- **363 triplets de graphe** : Relations entre concepts pour enrichir le contexte

#### Annotations et Métadonnées
Chaque passage est annoté avec :
- **Ton** : 7 options (neutre, sérieux, provocateur, romantique, joueur, taquin, empathique)
- **Objectif** : 8 objectifs conversationnels prédéfinis
- **Contexte** : Situation d'utilisation (flirt, couple, relance, premier message, etc.)
- **Type** : Template, conseil, règle, sujet, exemple, FAQ
- **Signal d'engagement** : Neutre, ouvert, fermé
- **Score de qualité** : 0.0 à 1.0 (moyenne : 0.761)
- **Flag de sécurité** : OK, sexualité_directe, à_revoir_humain

#### Recherche et Enrichissement
- **Recherche sémantique** : Matching par similarité vectorielle (embeddings)
- **Filtrage multi-critères** : Par ton, objectif, contexte et signal d'engagement
- **Enrichissement contextuel** : Les 3-5 passages les plus pertinents sont injectés dans le prompt IA
- **Sécurité intégrée** : Filtrage automatique des passages à risque avant injection

#### Qualité et Maintenance
- **97.4% de passages validés** : Seulement 9 passages (2.6%) nécessitent une révision
- **Distribution équilibrée** : Couverture de tous les tons et objectifs (avec déséquilibres identifiés)
- **Amélioration continue** : Enrichissement progressif des sections sous-représentées

---

## 🔄 Workflow Utilisateur Type

### Parcours Nouvel Utilisateur
1. **Inscription** : Numéro WhatsApp → OTP (code à 6 chiffres) → Compte créé
2. **Essai gratuit** : 3 jours automatiques avec accès complet
3. **Première utilisation** : Coller message reçu → Choisir ton/objectif → Ajouter contexte (optionnel) → Générer
4. **Réception des réponses** : 2-3 variantes (short/long ou conservative/playful/bold)
5. **Action** : Copier la réponse préférée → Envoyer via WhatsApp/SMS

### Parcours Abonnement
1. **Décision** : Consultation des tarifs sur `/pricing`
2. **Paiement** : Mobile Money via WhatsApp (5K/12K/20K FCFA)
3. **Activation** : Réception du code d'activation par admin
4. **Activation licence** : Saisie du code sur `/profile` → Licence active
5. **Utilisation illimitée** : Générations sans restriction

### Parcours Affilié
1. **Inscription** : Même processus que l'utilisateur standard
2. **Génération de code** : Création d'un code de parrainage sur `/affiliate`
3. **Partage** : Lien de parrainage ou message WhatsApp pré-rempli
4. **Tracking** : Suivi des leads et conversions en temps réel
5. **Commissions** : Attribution automatique lors de l'activation d'une licence
6. **Paiement** : Demande de paiement via dashboard → Validation admin → Paiement

---

## 📝 Conclusion

NeoLove est une plateforme SaaS complète et moderne qui combine :

- **IA avancée** : Système RAG sophistiqué avec 341 passages annotés et deux modes de génération
- **UX soignée** : Interface intuitive, mobile-first, avec feedback visuel immédiat
- **Modèle économique** : Tarification adaptée au marché local (FCFA) avec essai gratuit
- **Système d'affiliation** : Programme complet avec anti-fraude avancé et tracking en temps réel
- **Sécurité** : Protection multi-niveaux (RLS, hashing, validation, rate limiting)
- **Performance** : Architecture serverless scalable avec temps de réponse optimisés
- **Qualité** : Base de connaissances validée à 97.4% avec score de qualité moyen de 0.761

La plateforme est **prête pour la production** et peut évoluer selon les besoins des utilisateurs et les retours du marché. L'architecture modulaire permet d'ajouter facilement de nouvelles fonctionnalités sans compromettre la stabilité existante.

---

**Version** : 1.0.0  
**Dernière mise à jour** : Février 2026  
**Statut** : Production ✅

