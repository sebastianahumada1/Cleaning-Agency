# Script para subir el proyecto a GitHub
Write-Host "=== Preparando proyecto para GitHub ===" -ForegroundColor Cyan

# Verificar si git está instalado
try {
    $gitVersion = git --version
    Write-Host "Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Git no está instalado. Por favor instálalo primero." -ForegroundColor Red
    exit 1
}

# Inicializar repositorio si no existe
if (-not (Test-Path .git)) {
    Write-Host "Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
}

# Configurar usuario si no está configurado (opcional)
# git config user.name "Tu Nombre"
# git config user.email "tu@email.com"

# Agregar todos los archivos
Write-Host "Agregando archivos al staging..." -ForegroundColor Yellow
git add .

# Hacer commit
Write-Host "Creando commit..." -ForegroundColor Yellow
git commit -m "Initial commit: Sistema de gestión de nómina con interfaz en español y diseño colorido"

# Verificar si hay un remote configurado
$remote = git remote -v
if ([string]::IsNullOrWhiteSpace($remote)) {
    Write-Host "" -ForegroundColor Yellow
    Write-Host "=== IMPORTANTE ===" -ForegroundColor Yellow
    Write-Host "No hay un repositorio remoto configurado." -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Para conectar con GitHub, ejecuta estos comandos:" -ForegroundColor Cyan
    Write-Host "1. Crea un nuevo repositorio en GitHub (https://github.com/new)" -ForegroundColor White
    Write-Host "2. Luego ejecuta:" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git" -ForegroundColor Green
    Write-Host "   git branch -M main" -ForegroundColor Green
    Write-Host "   git push -u origin main" -ForegroundColor Green
    Write-Host "" -ForegroundColor Yellow
} else {
    Write-Host "Remote encontrado:" -ForegroundColor Green
    Write-Host $remote -ForegroundColor White
    Write-Host "" -ForegroundColor Yellow
    Write-Host "Para subir los cambios, ejecuta:" -ForegroundColor Cyan
    Write-Host "   git push -u origin main" -ForegroundColor Green
    Write-Host "   o" -ForegroundColor White
    Write-Host "   git push -u origin master" -ForegroundColor Green
}

Write-Host "" -ForegroundColor Cyan
Write-Host "=== Proceso completado ===" -ForegroundColor Green

