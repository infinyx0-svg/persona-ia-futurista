# Personalidad IA · V1 (solo chat)

Chat con una persona artificial que te conoce gradualmente. Configura solo nombre, edad y género.
El 3D y demás vienen en fases siguientes, a propósito.

## Correr en desarrollo

```bash
npm install
npx expo start
```

## Configurar el cerebro

1. Despliega la Edge Function (ver `server/README.md`).
2. Pega la URL de la función en la pantalla inicial de la app.

## Obtener el APK

1. Entra a la pestaña **Actions** de este repo.
2. Elige **Build APK** → **Run workflow**.
3. Al terminar, descarga el artefacto **persona-ia-apk**.
4. Si creas un tag `v1.0.0` (o cualquier `v*`), el APK queda además en **Releases** como descarga permanente.

## Qué incluye la V1

- Onboarding mínimo: nombre, edad (18+), género y URL del servidor.
- Chat limpio con tema claro y sobrio; el teclado nunca tapa el composer.
- Motor anti-genérico: prompt con reglas duras + memoria extractiva (líneas MEM) + historial reciente.
- Memoria local en el teléfono; borrado de datos: desinstalar o limpiar datos de la app (la exportación viene en fase 2).
