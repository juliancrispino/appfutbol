# Turnos Fútbol

App Android y API propias para turnos privados de fútbol 5. Este directorio no comparte base, usuarios ni datos con la web de referencia que está en la raíz del repositorio.

Cada persona puede crear varios turnos y estar en varios. El Elo, los goles y los MVP viven en la ficha de ese turno. Un invitado sin cuenta suma estadísticas igual que el resto. Cuando se registra y abre el link, elige su nombre y se queda con ese historial.

## Qué incluye

- Cuenta con contraseña, código de un solo uso al mail, o Google.
- Turnos privados. La invitación es un link `https://<dominio>/j/<token>`.
- Carga de partidos (resultado, goles, MVP, notas), ranking y armado de equipos.
- Anuncios de AdMob: banner en las pantallas de recorrido e intersticial al guardar un partido. Si el anuncio no carga, el partido queda guardado igual.

No hay racha de picada.

## Correr la API

```bash
cd turnos
cp apps/api/.env.example apps/api/.env
npm install
npm run dev:api
```

Para probar sin instalar Postgres, en `apps/api/.env`:

```bash
DATABASE_URL=pglite
JWT_SECRET=un-secreto-largo-de-desarrollo
PUBLIC_APP_URL=http://localhost:8787
EXPOSE_EMAIL_CODES=true
```

`pglite` guarda los datos en `apps/api/.data`. En un servidor usá un Postgres nuevo (`DATABASE_URL` de Neon, Supabase o el que elijas) y `EXPOSE_EMAIL_CODES` en false.

Variables:

- `JWT_SECRET`: secreto nuevo, solo de esta API.
- `GOOGLE_CLIENT_IDS`: IDs de cliente de Google, separados por coma. El de tipo Web es el que verifica el ID token.
- `RESEND_API_KEY` y `EMAIL_FROM`: envío del código. Sin la clave, en desarrollo el código se imprime en la consola y, si `EXPOSE_EMAIL_CODES=true`, también vuelve en la respuesta.
- `PUBLIC_APP_URL`: origen de los links de invitación.
- `ANDROID_SHA256_CERT_FINGERPRINT`: si está, `/.well-known/assetlinks.json` habilita el App Link de Android.

La política de privacidad queda en `/privacidad`.

## Correr la app

```bash
cd turnos
cp apps/mobile/.env.example apps/mobile/.env
npm run start:mobile
```

En el emulador de Android, `EXPO_PUBLIC_API_URL=http://10.0.2.2:8787` apunta a la API de tu máquina. En un dispositivo físico usá la IP de la compu.

Google Sign-In y AdMob usan módulos nativos. No funcionan en Expo Go: hace falta un build de desarrollo o el AAB.

```bash
cd apps/mobile
npx eas-cli build --platform android --profile development
npx eas-cli build --platform android --profile internal
npx eas-cli submit --platform android --profile internal
```

El perfil `internal` genera un AAB (`app-bundle`) para el track de pruebas internas de Play. Antes hay que tener cuenta de Play Console, el proyecto en AdMob y el cliente OAuth de Android con el SHA-1 del certificado de EAS. Los IDs de anuncio de prueba están puestos por defecto; reemplazalos con `EXPO_PUBLIC_ADMOB_*` para producción.

El paquete Android es `app.turnos.futbol`. El esquema para abrir un link es `turnos://j/<token>`. El App Link HTTPS usa `EXPO_PUBLIC_INVITE_HOST`, que tiene que coincidir con el dominio de `PUBLIC_APP_URL`.

## Pruebas

```bash
cd turnos
npm test
```
# appfutbol
