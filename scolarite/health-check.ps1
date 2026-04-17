Write-Host "== Backend: tests ==" -ForegroundColor Cyan
php artisan test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "== Backend: API routes ==" -ForegroundColor Cyan
php artisan route:list --path=api | Out-Null
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "== Frontend: lint ==" -ForegroundColor Cyan
Set-Location ".\frontend"
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "== Frontend: build ==" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Health-check complete." -ForegroundColor Green
