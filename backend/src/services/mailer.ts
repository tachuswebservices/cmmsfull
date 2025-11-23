import nodemailer from 'nodemailer'
import { env } from '../config/env'

const host = env.SMTP_HOST
const port = Number(env.SMTP_PORT || 0)
const user = env.SMTP_USER
const pass = env.SMTP_PASS

export const transporter = nodemailer.createTransport({
  host,
  port: Number.isFinite(port) && port > 0 ? port : 587,
  secure: (Number.isFinite(port) && port === 465) || (env.SMTP_SECURE === 'true'),
  auth: user && pass ? { user, pass } : undefined,
})

export async function sendMail(options: { to: string; subject: string; text?: string; html?: string; from?: string }) {
  const from = options.from || env.SMTP_FROM || `CMMS <no-reply@${(env.NODE_IP || 'localhost')}>`
  return transporter.sendMail({ from, ...options })
}

export async function sendOtpEmail(to: string, code: string, label: string) {
  const subject = `Your ${label.toUpperCase()} OTP`
  const text = `Your ${label} OTP is: ${code}. It will expire in 5 minutes.`
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6">
      <h2>${subject}</h2>
      <p>Your ${label} OTP is:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p>
      <p>This code will expire in 5 minutes.</p>
    </div>
  `
  return sendMail({ to, subject, text, html })
}
