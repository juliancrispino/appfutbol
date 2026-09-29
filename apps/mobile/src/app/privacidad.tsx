import { useEffect, useState } from 'react'
import { apiBase } from '@/api'
import { Muted, Screen, Title } from '@/ui'

const FALLBACK = `Turnos Fútbol guarda la cuenta, los turnos y los partidos que cargan los miembros. Los anuncios los muestra Google AdMob en las pantallas de recorrido y, a veces, al guardar un partido. Guardar no depende del anuncio.`

export default function PrivacyScreen() {
  const [text, setText] = useState(FALLBACK)

  useEffect(() => {
    fetch(`${apiBase()}/privacidad`)
      .then((response) => response.text())
      .then((html) => {
        const plain = html
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '\n')
          .replace(/\n{2,}/g, '\n\n')
          .trim()
        if (plain) setText(plain)
      })
      .catch(() => {})
  }, [])

  return (
    <Screen>
      <Title>Privacidad</Title>
      <Muted>{text}</Muted>
    </Screen>
  )
}
