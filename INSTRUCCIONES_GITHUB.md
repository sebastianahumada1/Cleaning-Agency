# Instrucciones para Subir el Proyecto a GitHub

## Pasos para subir tu proyecto a GitHub:

### 1. Crear un repositorio en GitHub
1. Ve a https://github.com/new
2. Crea un nuevo repositorio (puedes llamarlo "nomina-tia" o como prefieras)
3. **NO** inicialices con README, .gitignore o licencia (ya los tenemos)
4. Copia la URL del repositorio (ejemplo: `https://github.com/tu-usuario/nomina-tia.git`)

### 2. En tu terminal (PowerShell), ejecuta estos comandos:

```powershell
# Navega a la carpeta del proyecto
cd "c:\Users\angel\OneDrive\Escritorio\Nomina Tia"

# Inicializa git (si no está inicializado)
git init

# Agrega todos los archivos
git add .

# Crea el commit inicial
git commit -m "Initial commit: Sistema de gestión de nómina con interfaz en español"

# Conecta con tu repositorio de GitHub (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# Cambia a la rama main (si es necesario)
git branch -M main

# Sube el código a GitHub
git push -u origin main
```

### 3. Si ya tienes un repositorio remoto configurado:

```powershell
# Verifica el remote actual
git remote -v

# Si necesitas cambiar la URL del remote:
git remote set-url origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# Sube los cambios
git push -u origin main
```

### 4. Si tienes problemas de autenticación:

GitHub ya no acepta contraseñas. Necesitas usar un **Personal Access Token**:

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Genera un nuevo token con permisos `repo`
3. Cuando hagas `git push`, usa el token como contraseña

O mejor aún, configura SSH:
```powershell
# Genera una clave SSH (si no tienes una)
ssh-keygen -t ed25519 -C "tu@email.com"

# Agrega la clave a GitHub (Settings → SSH and GPG keys)
# Luego usa la URL SSH:
git remote set-url origin git@github.com:TU_USUARIO/TU_REPOSITORIO.git
```

## Comandos útiles:

```powershell
# Ver el estado del repositorio
git status

# Ver los commits
git log --oneline

# Ver los remotes configurados
git remote -v

# Agregar cambios y hacer commit
git add .
git commit -m "Descripción de los cambios"
git push
```

## Nota importante:

El archivo `.env` con tus credenciales de base de datos **NO** se subirá a GitHub (está en .gitignore).
Asegúrate de crear un archivo `.env.example` con las variables de entorno necesarias (sin valores sensibles).

