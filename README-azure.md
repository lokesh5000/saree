Azure deployment notes

This project contains a React frontend (root) and an Express backend in `backend/` that serves the built React app from `build/`.

Recommended Azure Web App settings:
- Runtime stack: Node 18 LTS
- Startup command: (leave blank) because `web.config` and `package.json` start script will start the server

What we changed for Azure:
- Root `package.json` `start` script now runs `node backend/server.js`.
- Added `postinstall` script to install backend dependencies and build React app during deployment.
- Added `engines.node` set to 18.x.
- Added `web.config` for Windows App Service.

Deployment steps (recommended):
1. Commit these changes.
2. Deploy to Azure Web App (Code) using the repository. Azure will run `npm install` then `npm start`.
3. Configure App Settings in the Azure Portal or via CLI for production environment variables (DATABASE_URL, SUPABASE keys, JWT secret, etc.).

Troubleshooting:
- If the app shows directory listing or fails to start, check `Application Logging` and the `npm start` logs in the App Service.
- Ensure `PORT` environment variable is not set or is allowed by the app (Express respects `process.env.PORT`).
