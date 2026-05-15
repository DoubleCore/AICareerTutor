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
uvicorn app.main:app --reload
```

The backend uses a fixed development user and in-memory/template data for P0.
