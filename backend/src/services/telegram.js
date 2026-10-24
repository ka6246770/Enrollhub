import path from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { capabilities, env } from '../config/env.js'
import { recordMessage } from '../db/database.js'
import { renderTemplate } from './messageTemplates.js'
import { registrationValues } from './registrationValues.js'

const apiUrl = (method) => `https://api.telegram.org/bot${env.telegramBotToken}/${method}`

// Records the outcome of a send. Swallows its own failure: a logging problem
// must never break a notification or the visitor's registration.
function log(entry) {
  return recordMessage(entry).catch(() => {})
}

export async function callTelegramApi(method, payload) {
  const response = await fetch(apiUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || `Telegram ${method} failed (status ${response.status})`)
  }
  return data.result
}

export function sendMessage(chatId, text, options = {}) {
  return callTelegramApi('sendMessage', { chat_id: chatId, text, ...options })
}

// Acknowledges an inline-button press so Telegram stops showing the spinner.
// Never throws: the decision has already been saved at this point, so a
// cosmetic failure must not turn a valid webhook call into an error response.
export async function answerCallback(callbackQueryId, text) {
  if (!capabilities.telegram) {
    console.log(`[telegram] not configured — would answer callback: ${text}`)
    return null
  }
  try {
    return await callTelegramApi('answerCallbackQuery', { callback_query_id: callbackQueryId, text })
  } catch (error) {
    console.error(`[telegram] could not answer the callback: ${error.message}`)
    return null
  }
}

// Replaces the decision buttons with the recorded state. Also never throws, for
// the same reason as answerCallback.
export async function markOwnerMessageDecided(messageId, registration, offer, decision) {
  if (!capabilities.telegram || !messageId) return null
  const line = decision === 'offered' ? '📩 Place offered — waiting for the applicant' : '❌ Not selected'
  try {
    return await callTelegramApi('editMessageText', {
      chat_id: env.telegramChatId,
      message_id: messageId,
      text: `${await buildOwnerText(registration, offer)}\n\n${line}`,
      reply_markup: { inline_keyboard: [] },
    })
  } catch (error) {
    console.error(`[telegram] could not update the message buttons: ${error.message}`)
    return null
  }
}

// Telegram plays MP3/M4A inline. Other formats it accepts (WebM, OGG, WAV) are
// delivered as a document so the owner still receives the recording.
const PLAYABLE_AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'])

export async function sendAudio(chatId, voice, caption) {
  const asDocument = !PLAYABLE_AUDIO_MIME.has(voice.mimetype)
  const method = asDocument ? 'sendDocument' : 'sendAudio'
  const field = asDocument ? 'document' : 'audio'

  const form = new FormData()
  form.append('chat_id', String(chatId))
  form.append('caption', caption)
  form.append(field, new Blob([voice.buffer], { type: voice.mimetype }), voice.originalname)

  const response = await fetch(apiUrl(method), { method: 'POST', body: form })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || `Telegram ${method} failed (status ${response.status})`)
  }
  return data.result
}

// Every {variable} a registration message can use.
async function buildOwnerText(registration, offer) {
  return renderTemplate('ownerRegistration', registrationValues(registration, offer))
}

export { buildOwnerText }

// The second person gets its own text (content pack §6) and the voice file too,
// so they have everything the owner has. Never throws.
async function sendToSecondPerson({ registration, offer, voice }) {
  const text = await renderTemplate('secondPerson', registrationValues(registration, offer))
  const recipient = `chat:${env.telegramSecondChatId}`

  try {
    await sendMessage(env.telegramSecondChatId, text)
    await log({
      registrationId: registration.id,
      channel: 'telegram',
      type: 'second_person',
      recipient,
      status: 'delivered',
    })
  } catch (error) {
    await log({
      registrationId: registration.id,
      channel: 'telegram',
      type: 'second_person',
      recipient,
      status: 'failed',
      error: error.message,
    })
    return
  }

  if (!voice) return
  try {
    await sendAudio(env.telegramSecondChatId, voice, `Voice note — ${registration.name}`)
    await log({
      registrationId: registration.id,
      channel: 'telegram',
      type: 'second_person_voice',
      recipient,
      status: 'delivered',
    })
  } catch (error) {
    await log({
      registrationId: registration.id,
      channel: 'telegram',
      type: 'second_person_voice',
      recipient,
      status: 'failed',
      error: error.message,
    })
  }
}

// Notifies the owner about a new registration with Accept / Reject buttons that
// carry only the registration id. Never throws: a notification failure must not
// fail the visitor's registration. Returns the Telegram message id (or null).
export async function notifyNewRegistration({ registration, offer, voice }) {
  const text = await buildOwnerText(registration, offer)
  const replyMarkup = {
    inline_keyboard: [[
      { text: '✅ Accept', callback_data: `reg:${registration.id}:accept` },
      { text: '❌ Reject', callback_data: `reg:${registration.id}:reject` },
    ]],
  }

  if (!capabilities.telegram) {
    console.log(`[telegram] not configured — would send to the owner:\n${text}`)
    await log({
      registrationId: registration.id,
      channel: 'telegram',
      type: 'owner_registration',
      recipient: 'owner',
      status: 'skipped',
    }).catch(() => {})
    if (env.telegramSecondChatId) {
      await log({
        registrationId: registration.id,
        channel: 'telegram',
        type: 'second_person',
        recipient: `chat:${env.telegramSecondChatId}`,
        status: 'skipped',
      }).catch(() => {})
    }
    return null
  }

  // The three sends are attempted independently: a failure to reach the owner
  // must not stop the voice file or the second person.
  let messageId = null
  try {
    const message = await sendMessage(env.telegramChatId, text, { reply_markup: replyMarkup })
    messageId = message.message_id
    await log({
      registrationId: registration.id,
      channel: 'telegram',
      type: 'owner_registration',
      recipient: `chat:${env.telegramChatId}`,
      status: 'delivered',
    })
  } catch (error) {
    console.error('[telegram] failed to notify owner:', error.message)
    await log({
      registrationId: registration.id,
      channel: 'telegram',
      type: 'owner_registration',
      recipient: `chat:${env.telegramChatId}`,
      status: 'failed',
      error: error.message,
    }).catch(() => {})
  }

  if (voice) {
    try {
      await sendAudio(env.telegramChatId, voice, `Voice note — ${registration.name}`)
      await log({
        registrationId: registration.id,
        channel: 'telegram',
        type: 'owner_voice',
        recipient: `chat:${env.telegramChatId}`,
        status: 'delivered',
      })
    } catch (error) {
      await log({
        registrationId: registration.id,
        channel: 'telegram',
        type: 'owner_voice',
        recipient: `chat:${env.telegramChatId}`,
        status: 'failed',
        error: error.message,
      })
    }
  }

  if (env.telegramSecondChatId) {
    await sendToSecondPerson({ registration, offer, voice })
  }

  return messageId
}

// Notifies the owner about a contact-form message.
export async function notifyOwnerOfContact(report) {
  const text = await renderTemplate('contactMessage', {
    type: report.type,
    name: report.name,
    email: report.email || '—',
    message: report.message,
    pageUrl: report.pageUrl || '—',
    time: report.time,
  })

  if (!capabilities.telegram) {
    console.log(`[telegram] not configured — would send contact message:\n${text}`)
    await log({ channel: 'telegram', type: 'contact', recipient: 'owner', status: 'skipped' }).catch(() => {})
    return
  }

  try {
    await sendMessage(env.telegramChatId, text)
    await log({
      channel: 'telegram',
      type: 'contact',
      recipient: `chat:${env.telegramChatId}`,
      status: 'delivered',
    })
  } catch (error) {
    await log({
      channel: 'telegram',
      type: 'contact',
      recipient: `chat:${env.telegramChatId}`,
      status: 'failed',
      error: error.message,
    }).catch(() => {})
  }
}

// Notifies the owner that someone joined a waitlist.
export async function notifyOwnerOfWaitlist({ name, phone, offer, waitlistId = null }) {
  const text = await renderTemplate('ownerWaitlist', { offer: offer.title, name, phone })

  if (!capabilities.telegram) {
    console.log(`[telegram] not configured — would send waitlist sign-up:\n${text}`)
    await log({ waitlistId, channel: 'telegram', type: 'waitlist', recipient: 'owner', status: 'skipped' }).catch(() => {})
    return
  }

  try {
    await sendMessage(env.telegramChatId, text)
    await log({
      waitlistId,
      channel: 'telegram',
      type: 'waitlist',
      recipient: `chat:${env.telegramChatId}`,
      status: 'delivered',
    })
  } catch (error) {
    await log({
      waitlistId,
      channel: 'telegram',
      type: 'waitlist',
      recipient: `chat:${env.telegramChatId}`,
      status: 'failed',
      error: error.message,
    }).catch(() => {})
  }
}

// Saves a voice note to disk and returns the stored path (relative to the
// upload directory). Phase E can replace this with object storage.
export async function storeVoiceFile(registrationId, voice) {
  const extension = path.extname(voice.originalname).toLowerCase() || '.mp3'
  const directory = path.resolve(env.uploadDir)
  await mkdir(directory, { recursive: true })
  const filename = `registration-${registrationId}-${Date.now()}${extension}`
  await writeFile(path.join(directory, filename), voice.buffer)
  return filename
}
