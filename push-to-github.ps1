# Script para subir el código a GitHub
Write-Host "=== Subiendo código a GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Verificar estado actual
Write-Host "1. Verificando estado del repositorio..." -ForegroundColor Yellow
git status
Write-Host ""

# Inicializar si es necesario
if (-not (Test-Path .git)) {
    Write-Host "2. Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
    Write-Host "✓ Repositorio inicializado" -ForegroundColor Green
} else {
    Write-Host "2. ✓ Repositorio Git ya existe" -ForegroundColor Green
}
Write-Host ""

# Agregar archivos
Write-Host "3. Agregando archivos..." -ForegroundColor Yellow
git add .
$added = git status --short
if ($added) {
    Write-Host "✓ Archivos agregados:" -ForegroundColor Green
    Write-Host $added
} else {
    Write-Host "✓ No hay cambios para agregar" -ForegroundColor Green
}
Write-Host ""

# Hacer commit
Write-Host "4. Creando commit..." -ForegroundColor Yellow
$commitMessage = "Initial commit: Sistema de gestión de nómina con interfaz en español y diseño colorido"
git commit -m $commitMessage
Write-Host "✓ Commit creado" -ForegroundColor Green
Write-Host ""

# Verificar remote
Write-Host "5. Verificando conexión con GitHub..." -ForegroundColor Yellow
$remote = git remote -v
if ([string]::IsNullOrWhiteSpace($remote)) {
    Write-Host "Agregando remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/sebastianahumada1/Cleaning-Agency.git
    Write-Host "✓ Remote agregado" -ForegroundColor Green
} else {
    Write-Host "✓ Remote ya configurado:" -ForegroundColor Green
    Write-Host $remote
}
Write-Host ""

# Cambiar a main
Write-Host "6. Configurando rama main..." -ForegroundColor Yellow
git branch -M main
Write-Host "✓ Rama configurada como main" -ForegroundColor Green
Write-Host ""

# Push
Write-Host "7. Subiendo código a GitHub..." -ForegroundColor Yellow
Write-Host "⚠ Si te pide autenticación, usa un Personal Access Token" -ForegroundColor Yellow
Write-Host ""
git push -u origin main

Write-Host ""
Write-Host "=== Proceso completado ===" -ForegroundColor Green
Write-Host ""
Write-Host "Si el push fue exitoso, verás tu código en:" -ForegroundColor Cyan
Write-Host "https://github.com/sebastianahumada1/Cleaning-Agency" -ForegroundColor White

