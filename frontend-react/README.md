# Taskflow — frontend React

## Démarrage en développement

Le serveur Vite relaie les appels `/api/*` vers Flask sur `http://127.0.0.1:5000`, en retirant le préfixe `/api`. Un `502 Bad Gateway` signifie généralement que l’API Flask n’écoute pas sur cette adresse.

1. Démarrez PostgreSQL. Dans le terminal où Flask sera lancé, définissez ses identifiants réels. Exemple PowerShell pour PostgreSQL local :

   ```powershell
   $env:DB_HOST = "localhost"
   $env:DB_PORT = "5432"
   $env:DB_NAME = "appdb"
   $env:DB_USER = "appuser"
   $env:DB_PASSWORD = "<mot-de-passe-postgres>"
   $env:DB_CLIENT_ENCODING = "WIN1252"
   $env:JWT_SECRET_KEY = "<cle-secrete-longue>"
   $env:ADMIN_EMAIL = "admin@exemple.local"
   $env:ADMIN_PASSWORD = "<mot-de-passe-admin>"
   ```

   Remplacez ces valeurs par celles de votre base. L’erreur `fe_sendauth: no password supplied` signifie que `DB_PASSWORD` n’a pas été défini dans ce terminal.
2. Depuis la racine du dépôt, installez les dépendances Python et démarrez Flask :

   ```powershell
   python -m venv backend/.venv
   backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
   backend/.venv/Scripts/python.exe backend/app.py
   ```

3. Dans un second terminal, démarrez React :

   ```powershell
   cd frontend-react
   npm install
   npm run dev
   ```

Si Flask écoute ailleurs, définissez `VITE_BACKEND_URL` (par exemple dans `frontend-react/.env.local`) puis redémarrez Vite. La valeur par défaut est `http://127.0.0.1:5000`.

## Build de production

Le [Dockerfile](Dockerfile) construit le frontend React et le sert avec Nginx. Nginx relaie `/api/*` vers le service `terraform-backend:5000`; le contexte du build doit être `frontend-react` et les deux conteneurs doivent partager un réseau.
