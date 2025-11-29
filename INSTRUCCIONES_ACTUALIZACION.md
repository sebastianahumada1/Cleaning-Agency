# Instrucciones para Actualizar el Proyecto

## 📋 Pasos para Actualizar a Next.js 15 y React 19

### 1. Detener el Servidor de Desarrollo (si está corriendo)
Si tienes `npm run dev` ejecutándose, presiona `Ctrl + C` para detenerlo.

### 2. Limpiar e Instalar Dependencias

Abre PowerShell o Terminal en el directorio del proyecto y ejecuta:

```bash
# Eliminar node_modules y package-lock.json (opcional, pero recomendado)
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Instalar todas las dependencias actualizadas
npm install
```

### 3. Regenerar el Cliente de Prisma

```bash
npx prisma generate
```

**Nota:** Si obtienes un error de permisos, cierra cualquier editor de código o proceso que pueda estar usando los archivos de Prisma, y vuelve a intentar.

### 4. Verificar que Todo Funciona

```bash
# Iniciar el servidor de desarrollo
npm run dev
```

El proyecto debería iniciarse en `http://localhost:3000`

## 🔧 Comandos Útiles

```bash
# Generar cliente de Prisma
npm run db:generate

# Crear migraciones de base de datos
npm run db:migrate

# Poblar base de datos con datos de ejemplo
npm run db:seed

# Abrir Prisma Studio (interfaz visual de la base de datos)
npm run db:studio

# Compilar para producción
npm run build
```

## ⚠️ Solución de Problemas

### Error: "operation not permitted"
- Cierra todos los procesos que puedan estar usando los archivos (VS Code, servidor de desarrollo, etc.)
- Intenta ejecutar PowerShell como Administrador
- Vuelve a ejecutar `npx prisma generate`

### Error: "Could not find Prisma Schema"
- Asegúrate de estar en el directorio raíz del proyecto
- Verifica que existe `prisma/schema.prisma`

### Error al iniciar el servidor
- Verifica que todas las dependencias se instalaron correctamente: `npm install`
- Regenera el cliente de Prisma: `npx prisma generate`
- Revisa que tu archivo `.env` tenga la variable `DATABASE_URL` configurada

## 📝 Cambios Realizados

- ✅ Next.js actualizado de 14.0.4 a 15.1.3
- ✅ React actualizado de 18.2.0 a 19.0.0
- ✅ Prisma actualizado de 5.7.1 a 6.0.1
- ✅ Todas las rutas API actualizadas para Next.js 15 (params ahora es Promise)
- ✅ Todas las dependencias actualizadas a sus últimas versiones

## 🚀 Después de Actualizar

Una vez que todo esté funcionando:

1. **Prueba las funcionalidades principales:**
   - Dashboard
   - Gestión de empleados
   - Gestión de ubicaciones
   - Programación semanal
   - Generación de días de trabajo
   - Cálculo de nómina

2. **Verifica que el cron job funcione:**
   - El endpoint `/api/cron/generate-workdays` debería funcionar correctamente
   - En Vercel, verifica que el cron job esté configurado

¡Listo! Tu proyecto está actualizado y listo para usar. 🎉

