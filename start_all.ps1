# start_all.ps1

Write-Host "Starting Resilio-Traffic MVP..." -ForegroundColor Green

# Start Backend
Write-Host "Setting up Python Backend..." -ForegroundColor Cyan
cd d:\gridlock\backend
if (-not (Test-Path venv)) {
    python -m venv venv
}
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
Start-Process powershell -ArgumentList "-NoExit -Command `"cd d:\gridlock\backend; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload`""

# Start Frontend
Write-Host "Setting up Vite Frontend..." -ForegroundColor Cyan
cd d:\gridlock\frontend
npm run dev
