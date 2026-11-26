<div align="center">
  <img src="../assets/logo.svg" width="72" height="72" alt="Agy Powertools Logo" />
  <h1>Agy Powertools</h1>
  <p><strong>Plugin d'amélioration natif pour Antigravity 2.0</strong></p>
  <p>Interface multilingue, statistiques de contexte et d'utilisation, mise en page compacte, branchement et édition de conversations, multi-compte, proxy sans TUN, prise en charge SSH et WSL2</p>
  <!-- plugin-badges:start -->
  <p>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/releases"><img src="https://img.shields.io/github/v/release/WhiteBr1ck/agy-powertools?label=Release&color=2563eb" height="20" alt="Release" /></a>
    <a href="https://github.com/WhiteBr1ck/agy-powertools/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/WhiteBr1ck/agy-powertools/ci.yml?label=CI" height="20" alt="CI" /></a>
    <a href="../LICENSE"><img src="https://img.shields.io/github/license/WhiteBr1ck/agy-powertools?label=License&color=16a34a" height="20" alt="MIT License" /></a>
    <img src="https://img.shields.io/badge/Antigravity-2.35.0-0f172a" height="20" alt="Antigravity 2.35.0" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D22.13-339933" height="20" alt="Node.js >= 22.13" />
    <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20WSL2-475569" height="20" alt="Platform" />
  </p>
  <!-- plugin-badges:end -->
  <p><a href="../README.md">简体中文</a> | <a href="README_ZH_TW.md">繁體中文</a> | <a href="../README_EN.md">English</a> | <strong>Français</strong> | <a href="README_JA.md">日本語</a> | <a href="README_KO.md">한국어</a> | <a href="README_DE.md">Deutsch</a> | <a href="README_ES.md">Español</a> | <a href="README_RU.md">Русский</a></p>
  <p>
    <a href="#captures-décran">Captures d'écran</a> |
    <a href="#fonctionnalités">Fonctionnalités</a> |
    <a href="#installation">Installation</a> |
    <a href="#configuration">Configuration</a> |
    <a href="#historique-des-versions">Historique des versions</a>
  </p>
</div>

<p align="center">
  <img src="./images/hero-workspace.png" alt="Espace de travail Agy Powertools" width="100%" />
</p>

> Se raccorde à Antigravity 2.0 via l'interface locale de débogage et lit les fichiers de session SQLite et JSONL locaux en lecture seule. Ne modifie pas les fichiers d'installation du client et n'ouvre aucune page web externe.

---

## Captures d'écran

<table>
  <tr>
    <th width="50%">Fenêtre de contexte et vitesse</th>
    <th width="50%">Progression des tâches et quota dans Aperçu</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-composer.png" alt="Fenêtre de contexte et statistiques de vitesse" width="100%" />
      <p>Consultez l'occupation du contexte, la réutilisation du cache et la vitesse de génération près du sélecteur de modèle, avec un halo de quota optionnel autour de la zone de saisie.</p>
    </td>
    <td>
      <img src="./images/card-overview-panel.png" alt="Progression des tâches et quota dans Aperçu" width="100%" />
      <p>Suivez les étapes d'exécution en direct, la durée par étape et les quotas restants dans le panneau Aperçu à droite ; cliquez sur un en-tête de section pour la replier.</p>
    </td>
  </tr>
  <tr>
    <th>Aperçu de l'utilisation (Clair)</th>
    <th>Aperçu de l'utilisation (Sombre)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-dashboard-light.png" alt="Aperçu de l'utilisation en thème clair" width="100%" />
      <p>S'affiche par défaut sur le cycle hebdomadaire en cours : nombre de requêtes, tokens, taux de cache, coût estimé, carte d'activité sur 53 semaines et santé des modèles.</p>
    </td>
    <td>
      <img src="./images/card-dashboard-dark.png" alt="Aperçu de l'utilisation en thème sombre" width="100%" />
      <p>Suit le thème clair ou sombre du client et compare la part des tokens, la part des coûts, le taux de cache et la vitesse par modèle.</p>
    </td>
  </tr>
  <tr>
    <th>Requêtes et anomalies de cache</th>
    <th>Multi-compte et quotas (désactivé par défaut)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-requests.png" alt="Journal des requêtes et anomalies de cache" width="100%" />
      <p>Filtrez les requêtes par compte, modèle, conversation et statut, et signalez les chutes de cache à court intervalle tout en excluant les démarrages à froid et les compactages.</p>
    </td>
    <td>
      <img src="./images/card-accounts.png" alt="Changement multi-compte et gestion des quotas" width="100%" />
      <p>Enregistrez et permutez plusieurs comptes Google localement via le trousseau natif du système, avec vue unifiée des quotas 5 heures et hebdomadaires.</p>
    </td>
  </tr>
  <tr>
    <th>Langue et paramètres d'affichage</th>
    <th>Proxy applicatif sans TUN (désactivé par défaut)</th>
  </tr>
  <tr>
    <td>
      <img src="./images/card-settings.png" alt="Paramètres de langue et d'affichage" width="100%" />
      <p>Choisissez parmi neuf langues d'interface et réglez la mise en page compacte, la teinte des bulles utilisateur et la fenêtre du halo de quota.</p>
    </td>
    <td>
      <img src="./images/card-proxy.png" alt="Paramètres du proxy applicatif sans TUN" width="100%" />
      <p>Acheminez uniquement Antigravity via HTTP ou SOCKS5 avec test de connectivité intégré, option Forcer HTTP/1.1 et vérification des mises à jour dans l'application.</p>
    </td>
  </tr>
</table>

---

## Fonctionnalités

- **Interface multilingue** : traduit les panneaux Powertools, les menus courants d'Antigravity, les boîtes de dialogue de permissions, les paramètres et les volets Swarm, tout en laissant intacts le texte des conversations et les blocs de code.
- **Télémétrie du contexte et de la vitesse** : ajoute près de la zone de saisie un anneau d'occupation du contexte (réutilisation du cache, nombre de compactages et barres planificateur/exécuteur d'Orchestrator) et un compteur de vitesse (`tok/s`, TTFT, temps modèle vs outils et coût estimé de session), incluant les statistiques des sous-agents.
- **Tableau de bord local d'utilisation et de requêtes** : ajoute une page `Powertools` dans la barre latérale combinant l'utilisation du client de bureau et de `agy` CLI, avec aperçu (carte d'activité 53 semaines, anneaux tokens/coût, tableau par modèle), journal des requêtes, détection des anomalies de cache à court intervalle, copie d'erreur en un clic, estimation des quotas et actualisation des tarifs API officiels.
- **Mise en page compacte et mises à jour d'étape** : conserve la taille de police du client tout en resserrant l'interligne et l'espacement des blocs ; affiche de brefs points d'avancement pendant les séquences d'outils et les replie dans l'en-tête de durée une fois le tour terminé.
- **Branchement de conversation et édition sur place** : créez une branche de conversation depuis n'importe quelle réponse ou depuis le menu de conversation en conservant tout l'historique (y compris pour les conversations ayant utilisé des sous-agents), ou modifiez directement un message envoyé avec la zone de saisie native d'Antigravity.
- **Changement multi-compte (désactivé par défaut)** : s'appuie sur le Gestionnaire d'informations d'identification Windows, le Trousseau macOS ou Linux Secret Service pour isoler plusieurs comptes Google sans jetons en clair ; vérifiez les quotas 5 heures/hebdomadaires et basculez depuis la barre latérale, avec bascule automatique optionnelle à l'épuisement.
- **Proxy applicatif sans TUN (désactivé par défaut)** : injecte les options et variables d'environnement proxy uniquement pour Antigravity au redémarrage, avec test HTTP CONNECT / SOCKS5, invitation au démarrage à froid et option `GODEBUG=http2client=0` pour limiter les coupures `EOF`.
- **Prise en charge SSH distant et WSL2** : lit les métriques de session, de sous-agents et du tableau de bord dans les fenêtres bureau `SSH` via OpenSSH local sans rien installer sur le serveur ; prend en charge Antigravity sous Windows avec backend WSL2 intégré en réseau NAT et Mirrored, stockage hybride des identifiants et délégation du redémarrage.
- **Menu contextuel de fichiers et utilitaires** : faites un clic droit sur les liens de fichiers ou l'arborescence Fichiers pour joindre au chat, ouvrir, afficher dans le dossier, copier le fichier ou copier son chemin (y compris les chemins NAS / SMB locaux sous Windows) ; ajoute des sections repliables Progression des tâches et Quota dans Aperçu, le compteur non lu dans la barre de titre, le halo de quota optionnel et la teinte des bulles utilisateur.

---

## Fonctionnalités inutiles (mais sympas)

<p align="center">
  <img src="./images/card-border-beam.webp" alt="Aperçu du faisceau lumineux autour de la saisie active" width="100%" />
</p>

- **Faisceau lumineux autour de la saisie active (désactivé par défaut)** : inspiré de [border-beam-ios](https://github.com/ismnoiet/border-beam-ios), propulsé par un shader WebGL SDF à rectangle arrondi léger. Fait glisser à vitesse constante une comète lumineuse et une lueur interne douce autour de la zone de saisie pendant le travail de l'agent, puis s'estompe à coût CPU/GPU nul une fois le tour terminé. Effectue une transition fondue avec le halo de quota lorsqu'ils sont tous deux activés, et propose 6 palettes (`Gemini`, `Aurore`, `Coloré`, `Néon`, `Accentuation`, `Quota`) ainsi qu'un bouton **Tester l'aperçu** dans les paramètres.

---

## Installation

> Prérequis : Antigravity installé et lancé au moins une fois. Utilise Node.js local `>= 22.13` ou bascule automatiquement sur le runtime `agy-node` fourni par Antigravity. Aucun `npm install` ni privilège administrateur requis.

### Option 1 : Installer via un agent (recommandé)

Envoyez cette instruction à Antigravity ou à un autre agent de code local :

> Peux-tu installer Agy Powertools depuis https://github.com/WhiteBr1ck/agy-powertools ? Lis d'abord README_EN.md et docs/INSTALL_AGENT.md, puis exécute l'installeur unifié fourni par le projet avec Node.js local ou le runtime intégré d'Antigravity. Conserve tous les autres plugins, paramètres de compte et historiques de conversation intacts, et ne ferme pas de force le client en cours d'exécution. Vérifie la version installée ensuite et rappelle-moi si un redémarrage du client est nécessaire.

Voir le [Guide d'installation par agent](./INSTALL_AGENT.md) pour les détails.

### Option 2 : Ligne de commande

Téléchargez et décompressez la dernière archive ZIP depuis [Releases](https://github.com/WhiteBr1ck/agy-powertools/releases) (ou clonez ce dépôt), puis exécutez :

```powershell
# Windows (PowerShell)
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

```sh
# macOS / Linux / WSL2
sh ./install.sh
```

Une réinstallation conserve vos paramètres enregistrés et ne ferme pas Antigravity de force. Redémarrez Antigravity une fois votre tâche en cours terminée ; **Powertools** apparaît dans la barre latérale gauche. Sous macOS, aucun lanceur `.app` en double n'est créé : l'ouverture de l'application d'origine `Antigravity.app` relance automatiquement une fois le client avec l'option de débogage si nécessaire (avec protection anti-boucle intégrée, et un interrupteur dans Paramètres ou Plugins -> Powertools pour revenir au redémarrage manuel à tout moment).

### Mises à jour et désinstallation

- **Mises à jour dans l'application** : ouvrez **Powertools -> Paramètres -> À propos -> Vérifier les mises à jour** puis cliquez sur **Installer la mise à jour**. Les paquets sont vérifiés par SHA-256 et restaurés automatiquement en cas d'échec au démarrage.
- **Désinstallation** : exécutez `powershell -NoProfile -ExecutionPolicy Bypass -File .\uninstall.ps1` (Windows) ou `sh ./uninstall.sh` (macOS / Linux / WSL2). Ajoutez `--keep-settings` pour conserver vos préférences. L'historique natif des conversations, les comptes et les autres plugins restent intacts.

---

## Configuration

Chaque réglage s'applique en temps réel dans **Powertools -> Paramètres** et s'enregistre automatiquement (**Rétablir les valeurs par défaut** se trouve en bas de page).

<details>
<summary><strong>Afficher tous les paramètres, variables d'environnement et chemins</strong></summary>

### Interface et affichage

| Paramètre | Défaut | Description |
| --- | --- | --- |
| Activer Powertools | Activé | Interrupteur principal ; met en pause toutes les améliorations d'interface tout en conservant les paramètres enregistrés |
| Langue | `简体中文` | Choisir l'une des neuf langues d'interface |
| Police locale et graisse | Défauts du client | Recherchez par nom localisé ou nom de famille et sélectionnez pour appliquer. La graisse peut être définie séparément. Réinitialiser rétablit les deux valeurs par défaut. Le terminal intégré conserve la police du client |
| Mise en page compacte | Activé | Resserre l'interligne (`1.4`), l'espacement des blocs et les lignes d'outils tout en suivant la taille de police du client |
| Teinter les bulles utilisateur | Désactivé | Ajoute une teinte et une bordure aux messages utilisateur (accentuation, 5 préréglages, couleur personnalisée et curseur d'intensité 10 % à 100 %) |
| Toujours afficher le plan de conversation | Activé | Garde visible la barre de navigation des tours dans les conversations à plusieurs tours |
| Garder Aperçu ouvert au changement de chat | Activé | Conserve l'état d'ouverture du panneau Aperçu à droite d'une conversation à l'autre |
| Conversations par projet | `Par défaut (6)` | Contrôle le nombre de chats visibles par projet dans la barre latérale (`Par défaut (6)`, `1-10` ou `Tout afficher`) |
| Déposer des dossiers sur la barre latérale | Activé | Crée ou ouvre un projet en déposant un dossier local sur la barre latérale dans une fenêtre locale |
| Épingler auto les projets déposés | Désactivé | Épingle automatiquement les projets créés ou ouverts par glisser-déposer |
| Faisceau animé dans la barre latérale | Désactivé | Affiche un faisceau lumineux longeant les conversations en cours dans la barre latérale (suit la palette de saisie par défaut ou utilise sa propre palette, masquage optionnel de l'indicateur natif à quatre points et aperçu en direct ; passe en ambre en attente) |
| Groupe « En cours » dans la barre latérale | Désactivé | Épingle une section repliable En cours en haut de la barre latérale affichant les chats actifs, projets, sous-agents actifs et attentes de confirmation ; se masque au repos |
| Badge non lu dans la barre des tâches | Activé | Affiche `(N)` dans le titre de la fenêtre et la barre des tâches lorsqu'un chat en arrière-plan se termine |

### Télémétrie et progression

| Paramètre | Défaut | Description |
| --- | --- | --- |
| Plage par défaut de l'Aperçu | `Quota hebdomadaire en cours` | Choisir le cycle hebdomadaire, Aujourd'hui, 24 h, Hier, Cette semaine, Ce mois-ci, 30 j ou Tout l'historique |
| Anneau de contexte | Activé | Affiche l'anneau d'utilisation du contexte, le détail de réutilisation du cache et les barres par modèle d'Orchestrator |
| Vitesse et statistiques | Activé | Affiche le compteur de vitesse et ouvre la télémétrie de session et le coût estimé |
| Progression des tâches | Activé | Section repliable dans Aperçu avec progression de la liste de tâches, phase en direct et durées par étape |
| Afficher le quota dans Aperçu | Désactivé | Section repliable dans Aperçu affichant les quotas restants 5 heures et hebdomadaires |
| Accès rapide dans la barre de titre | Désactivé | Ajoute un bouton Powertools en haut à droite de la barre de titre pour ouvrir le panneau complet à 6 onglets au-dessus du chat |
| Halo de quota autour de la saisie | Désactivé | Dessine le quota restant dans le sens horaire autour de la carte de saisie (émeraude, ambre ou rouge) |
| Fenêtre du halo de quota | `Auto (plus basse)` | Choisir `Auto (plus basse)`, `Limite hebdomadaire` ou `Limite de 5 heures` lorsque le halo est activé |
| Faisceau animé de saisie active | Désactivé | Anime un faisceau lumineux autour de la zone de saisie pendant le travail (coût nul au repos), avec transition fluide avec le halo de quota, 6 palettes et aperçu en direct |
| Contexte et télémétrie des sous-agents | Activé | Affiche pour chaque sous-agent le modèle, l'utilisation du contexte, les tokens, le taux de cache, la vitesse et le coût |
| Durée des tours / Déplier les outils | Activé | Affiche la durée totale sur les tours terminés et déplie le détail des outils au clic |
| Télémétrie en pied de réponse | Désactivé | Affiche le modèle, le taux de cache, les tokens d'entrée/sortie et le coût estimé en bas des réponses terminées, avec le détail complet au survol |

### Améliorations, comptes, proxy et contexte expérimental

| Paramètre | Défaut | Description |
| --- | --- | --- |
| Mises à jour d'étape | Activé | Signale de brefs points d'avancement pendant les appels d'outils et les replie à la fin |
| Recherche et lecture parallèles | Désactivé | Invite l'agent à regrouper les recherches et lectures de fichiers en un seul tour |
| Recherche plein texte dans le sélecteur | Activé | Étend la recherche native de conversations aux corps de messages, blocs de code et commandes, avec saut direct au tour correspondant |
| Branchement / Édition / Menu fichiers | Activé | Branchement natif de session, édition de message sur place et menu contextuel local/NAS/arborescence Fichiers (avec sous-menu dynamique Ouvrir avec et saut `#L:C`) |
| Reconnaître les commandes SSH collées | Activé | Extrait `user@host:port` lors du collage de `ssh -p PORT user@host` dans Nouveau projet -> SSH Host (ignore les mots de passe ajoutés) |
| Activer le changement multi-compte | Désactivé | Activation volontaire avec avis de risque ; sélecteur latéral, vues liste/cartes, bascule 5H/hebdo et changement automatique |
| Proxy applicatif (sans TUN) | Désactivé | Champs protocole/hôte/port, tests de connectivité, invitation au démarrage à froid et option Forcer HTTP/1.1 |
| Cible de contexte (Expérimental) | `Par défaut` | Choisir `Par défaut`, `256K`, `500K` ou `1M` (`Par défaut` laisse les réglages natifs intacts) |

### Variables d'environnement et chemins

| Nom / Chemin | Description |
| --- | --- |
| `ANTIGRAVITY_USER_DATA_DIR` | Répertoire de données utilisateur Antigravity personnalisé pour les profils isolés |
| `ANTIGRAVITY_CLI_DATA_DIR` | Répertoire de données `agy` CLI personnalisé (`~/.gemini/antigravity-cli` par défaut) |
| `ANTIGRAVITY_CDP_PORT_FILE` | Chemin explicite vers `DevToolsActivePort` (prend aussi en charge `AGY_BROWSER_ACTIVE_PORT_FILE`) |
| `~/.gemini/config/plugins/agy-powertools/` | Fichiers du plugin installés et scripts d'exécution |
| `~/.gemini/antigravity/plugin_data/agy-powertools/` | Paramètres enregistrés, métadonnées de comptes, échantillons de quota et cache tarifaire |

</details>

---

## Historique des versions

### v2.16.8
- **Conversion des fichiers volumineux (> 20 Mo) déposés dans le compositeur en références natives (#46)** : conserve la limite native de 20 Mo pour les fichiers ordinaires et insère les fichiers locaux dépassant 20 Mo sous forme de références natives sans lire leur contenu, tout en préservant les pièces jointes normales lors des dépôts mixtes et en isolant la barre latérale ainsi que les fenêtres SSH distantes.
- **Restriction des traductions du menu d'affichage de la barre latérale aux contextes de menu (intégrant la PR #82, merci `@statertly-pixel`)** : limite `Project`, `Sort Conversations`, `Sort Projects`, `Auto Pin`, `Archived Only`, `Subtitles` et `Decorations` aux menus dans les neuf langues afin de préserver les titres de conversations ou de projets homonymes.

### v2.16.7
- **Localisation native en neuf langues (intégrant la PR #80 en français, merci `@oxibys`)** : ajout du français, du japonais, du coréen, de l'allemand, de l'espagnol et du russe via des packs modulaires chargés à la demande (`lib/locales/` et RPC `i18n.pack`), avec guides README complets dans les neuf langues.
- **Traduction complète du menu Options d'affichage de la barre latérale (#79)** : traduction de `Sort Conversations`, `Sort Projects`, `Auto Pin`, `Archived Only`, `Subtitles`, `Decorations` et `Project` dans les menus sans affecter les noms de projets ni le code.
- **Correction définitive de la fenêtre Windows Terminal résiduelle après redémarrage sous Windows 11 (#61, merci `@poneisme`)** : lancement d'`Antigravity.exe` via un relais CUI sans fenêtre (`-LaunchOnly`) appelant `Start-Process` afin de couper entièrement l'héritage ConPTY sans déclencher d'alerte antivirus.

### v2.16.6
- **Correction des lignes de conversation non cliquables dans la barre latérale lorsque le faisceau actif est activé** : suppression de la règle `position: relative` sur les éléments enfants qui réduisait le lien `position: absolute; inset: 0` d'Antigravity, rétablissant le clic sur toute la ligne et les boutons au survol.
- **Affinage de la couche du faisceau inférieur et fondu sur les bords** : élévation de la couche `pointer-events: none` au-dessus de la barre d'actions au survol (`z-index: 20`) pour supprimer la coupure rectangulaire derrière les icônes, et ajout de masques de fondu gauche/droite (`.agy-sb-fade`).

### v2.16.5
- **Correction de la précision des quotas hebdomadaires et des statistiques d'utilisation (#63)** :
  - `lib/quota.mjs` : empêche les analyses remises à zéro ou en régression d'écraser des points de contrôle valides et conserve la progression mesurée.
  - `lib/dashboard.mjs` : associe chaque requête aux bornes hebdomadaires de son propre groupe de quota (Gemini / Claude / Argon) au lieu de partager un horodatage de début unique.
  - `lib/analytics.mjs` : conserve une archive d'utilisation atomique par profil (rétention 90 jours, jusqu'à 20 000 requêtes) afin que les totaux hebdomadaires ne chutent pas lors de la purge d'anciens fichiers `.db`.
- **Épuration de l'interface et traductions des paramètres** :
  - Suppression des infobulles redondantes au survol sur l'anneau de contexte, l'anneau de sous-agent et le déclencheur de vitesse (tout en conservant `aria-label`).
  - Simplification de la carte Coût dans Aperçu et de l'en-tête Coût dans Statistiques par modèle : conservation uniquement du coût total et du coût moyen par requête.
  - Ajout de 5 traductions manquantes des paramètres Antigravity 2.35.2 (`Search shortcuts...`, `Settings for conversations outside of projects`, `Hide breakdown`, `Notification settings`, `Automatic check for updates`).
- **PR communautaires et améliorations** :
  - **Sélecteur de police locale et de graisse (PR #78, merci `@awei84`)** : sélecteurs natifs sur une seule ligne avec lecture des tables OpenType `name`, recherche bilingue et filtrage des graisses réellement disponibles, en excluant les polices d'icônes et les terminaux xterm.
  - **Faisceau inférieur de la barre latérale et groupe « En cours » épinglé (PR #76, merci `@whitzard0421`)** : tous deux désactivés par défaut ; faisceau 100 % CSS en bordure inférieure (sans WebGL, respecte `prefers-reduced-motion`).
  - **Glisser-déposer de dossiers sur la barre latérale pour créer un projet (PR #73, merci `@niuanhua-ydy`)** : validation de répertoire/lien symbolique et isolation des fenêtres SSH distantes.
  - **Télémétrie en pied de réponse (PR #65, merci `@wwwsideexiecom-boop`)** : désactivée par défaut ; affiche modèle, taux de cache, tokens entrée/sortie et coût estimé par tour en ligne et au survol.

### v2.16.4
- **Correction de l'héritage de session console lors du redémarrage Windows (#61)** : lancement d'`Antigravity.exe` via `ProcessStartInfo` (`UseShellExecute = $false`, `CreateNoWindow = $true`).
- **Correction des écritures OAuth macOS volumineuses sans exposition dans `argv` (#75)** : bascule vers `/usr/bin/osascript -l JavaScript` sur `stdin` via `Security.framework` lorsque `/usr/bin/security -i` approche la limite de 4096 octets.
- **Réduction du coût d'analyse et de transfert lors de l'interrogation de longues conversations (#62)** : mise en cache des instantanés côté sidecar avec réponse `{ unchanged: true, stateRev }` et progression locale des chronomètres dans le moteur de rendu.
- **Correction du délai de relance macOS au démarrage à froid et de la concurrence (#64)**, **correction des raccourcis d'édition sur place et récupération de brouillon (#70)**, **suppression du flash du plan de secours (#74)** et **surcharges de localisation `custom-i18n.json`, commandes slash 2.35 et détection de la langue système (#68, #69)**.
- **PR communautaires** : récupération SSH distante au démarrage précoce (PR #67, `@qimengdunjia`), fusion de la télémétrie Antigravity CLI et groupe de quota Argon (PR #71, `@zhangyu-ch`), et en-tête/barre de filtres fixes de la page de gestion (PR #72, `@niuanhua-ydy`).

Voir l'historique complet dans [README_EN.md](../README_EN.md#changelog).

---

## Licence et liens

- **Licence** : [MIT License](../LICENSE) (calendrier de plage de dates personnalisé adapté de HextaUI avec `react-day-picker` et `date-fns` ; voir [lib/vendor/NOTICE.txt](../lib/vendor/NOTICE.txt))
- **Problèmes** : [GitHub Issues](https://github.com/WhiteBr1ck/agy-powertools/issues) (merci d'indiquer le système d'exploitation, la version d'Antigravity et la version du plugin)
- **Communauté** : [LINUX DO](https://linux.do/)
