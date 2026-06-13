# AI职场导师 P0

P0 runnable skeleton for the AI career tutor mobile app and FastAPI mock backend.

## Mobile

```powershell
cd apps/mobile
npm install
npm run start
```

Use Expo Go or press `w` for the web preview.

## API

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # adjust values as needed
uvicorn app.main:app --reload
```

The backend uses a fixed development user and in-memory/template data for P0.

### Configuration

Configuration is read from environment variables (or a `.env` file in `apps/api`).
See `.env.example` for all keys. Common ones:

- `ENVIRONMENT` — `development` / `staging` / `production`
- `LOG_LEVEL` — `DEBUG` / `INFO` / `WARNING` / `ERROR`
- `CORS_ORIGINS` — `*` (default) or a comma-separated list of allowed origins

### Endpoints

- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/health

### Connecting from the frontend

- Expo Web (local): `http://localhost:8000`
- Android emulator: `http://10.0.2.2:8000`
- Physical device: `http://<your-LAN-IP>:8000`

### Error format

All handled errors return a unified envelope:

```json
{ "error": { "code": "not_found", "message": "..." } }
```
