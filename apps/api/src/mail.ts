import type { Mailer } from './deps'
import { HttpError } from './errors'

export function createMailer(): Mailer {
  return {
    async sendCode(email, code) {
      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        if (process.env.NODE_ENV === 'production') {
          throw new HttpError(503, 'El envío de mail no está configurado')
        }
        console.info(`[turnos] código para ${email}: ${code}`)
        return
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Turnos Futbol <noreply@example.com>',
          to: [email],
          subject: 'Tu código de Turnos Fútbol',
          text: `Tu código para entrar es ${code}. Vence en 10 minutos. Si no lo pediste, ignorá este mensaje.`,
        }),
      })

      if (!response.ok) throw new HttpError(502, 'No se pudo enviar el código')
    },
  }
}
