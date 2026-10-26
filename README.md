# Taskflow — gestion du travail d’équipe

Application web de gestion de projets et de tâches. Le frontend React communique avec une API REST Flask qui stocke les données dans PostgreSQL.

## Fonctionnalités

- Inscription des membres, connexion et déconnexion avec JWT.
- Rôles administrateur, chef de projet et membre, contrôlés par l’API.
- Création et suivi de projets, avec gestion de leurs membres.
- Tâches attribuées avec statut, priorité et échéance; les tâches en retard sont signalées.
- Tableau de bord, recherche et filtres par projet, responsable, statut, priorité et dates.
- Notifications d’attribution, d’échéance proche et de retard.
- Interface responsive en français.

## Démarrer l’application en local

L’API attend une base PostgreSQL disponible. Définissez ses paramètres et les secrets dans l’environnement avant de la lancer. `ADMIN_EMAIL` et `ADMIN_PASSWORD` créent le premier compte administrateur au démarrage; les inscriptions normales créent uniquement des membres.

Dans PowerShell, depuis le dossier du dépôt :

```powershell
$env:DB_HOST = "localhost"
$env:DB_NAME = "appdb"
$env:DB_USER = "appuser"
$env:DB_PASSWORD = "votre-mot-de-passe-postgres"
$env:DB_CLIENT_ENCODING = "WIN1252"
$env:JWT_SECRET_KEY = "remplacer-par-une-cle-secrete-longue-et-aleatoire"
$env:ADMIN_NAME = "Administrateur"
$env:ADMIN_EMAIL = "admin@exemple.local"
$env:ADMIN_PASSWORD = "un-mot-de-passe-admin-solide"
py -m venv backend/.venv
backend/.venv/Scripts/python -m pip install -r backend/requirements.txt
backend/.venv/Scripts/python backend/app.py
```

Dans un autre terminal :

```powershell
cd frontend-react
npm install
npm run dev
```

Vite relaie les requêtes `/api/*` vers `http://127.0.0.1:5000` et enlève le préfixe `/api`. Pour changer l’adresse du backend pendant le développement, définissez `VITE_BACKEND_URL` avant `npm run dev`. Pour une autre origine frontend, configurez `CORS_ORIGINS` côté Flask avec une liste d’origines séparées par des virgules.

## API

Les routes sont définies dans `backend/app.py`. Les routes métier requièrent un jeton Bearer JWT, sauf l’inscription, la connexion et le contrôle de santé `GET /`. Les principales ressources sont `/auth`, `/users`, `/projects`, `/tasks`, `/notifications` et `/dashboard`.

Les rôles sont appliqués côté serveur : un administrateur supervise tous les projets et gère les comptes; un chef de projet gère ses projets et leurs tâches; un membre consulte ses tâches attribuées et peut en modifier le statut. L’accès d’un membre est retiré lorsqu’il est retiré du projet.

## Infrastructure

La configuration Terraform et le déploiement restent à réaliser et à maintenir par l’utilisateur. L’application n’a pas modifié les fichiers `.tf`. Pour l’intégration, le backend utilise les variables `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET_KEY`, `ADMIN_NAME`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`. Le Dockerfile de `frontend-react` construit React puis sert l’application avec Nginx; son relais `/api/*` cible le conteneur `terraform-backend` et retire le préfixe `/api`. Dans votre configuration Terraform, utilisez `frontend-react` comme contexte de build pour servir la nouvelle interface.
