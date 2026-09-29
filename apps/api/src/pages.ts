export const PRIVACY_TEXT = `Turnos Fútbol guarda la cuenta (nombre y email), los turnos a los que pertenecés y los datos de los partidos que cargan los miembros: resultado, goles, MVP y estadísticas.

La contraseña, si la creás, se guarda cifrada. El código de ingreso por mail se usa una sola vez y vence a los 10 minutos. Si entrás con Google, guardamos el identificador de esa cuenta.

Los anuncios los muestra Google AdMob. Google puede tratar datos del dispositivo según su propia política. Los banners están en las pantallas de recorrido. Al guardar un partido puede aparecer un anuncio breve. Guardar el partido no depende de ese anuncio.

El link de invitación permite entrar a un turno privado. Quien lo abre puede ver el nombre del turno y, una vez con sesión, las fichas invitadas que todavía no tienen dueño.

Podés dejar un turno o, si lo creaste, borrarlo. Para pedir la eliminación de la cuenta, escribinos desde el email con el que te registraste.

Esta política corresponde a la app Android Turnos Fútbol y a su API. No comparte datos con otras ligas ni sitios.`

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function privacyHtml() {
  const paragraphs = PRIVACY_TEXT.split('\n\n')
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('')
  return layout('Privacidad', `<h1>Privacidad</h1>${paragraphs}`)
}

export function joinHtml(input: { groupName: string; token: string }) {
  const name = escapeHtml(input.groupName)
  const token = encodeURIComponent(input.token)
  return layout(
    'Invitación',
    `<h1>Te invitaron a ${name}</h1>
     <p>Abrí el link en el celular con Turnos Fútbol instalada. Si todavía no tenés cuenta, la app te pide entrar con Google, contraseña o un código al mail.</p>
     <p>Después elegís si sos una ficha nueva o si ya estabas cargado como invitado, para quedarte con tus partidos y tu Elo.</p>
     <p><a class="button" href="turnos://j/${token}">Abrir en la app</a></p>
     <p class="muted">Si la app no está instalada, instalala y volvé a abrir este link.</p>`,
  )
}

export function missingInviteHtml() {
  return layout('Invitación', `<h1>Este link no sirve</h1><p>El turno no existe o quien lo creó regeneró la invitación.</p>`)
}

function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Turnos Fútbol</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: #09090b; color: #fafafa; }
    main { max-width: 38rem; margin: 0 auto; padding: 3rem 1.25rem; }
    h1 { font-size: 1.8rem; line-height: 1.2; }
    p { color: #d4d4d8; line-height: 1.5; }
    a { color: #34d399; }
    .button { display: inline-block; margin-top: 0.5rem; background: #10b981; color: #052e24; text-decoration: none; font-family: sans-serif; font-weight: 700; padding: 0.8rem 1rem; border-radius: 0.8rem; }
    .muted { color: #a1a1aa; font-size: 0.95rem; }
  </style>
</head>
<body><main>${body}</main></body>
</html>`
}
