// Phase 6 (optional, later): the Meta WhatsApp Business Cloud API.
//
// This module exists so the folder structure matches the plan. The site sends
// notifications through Telegram and email today; WhatsApp is paid per message
// and requires Meta business verification, so it is deliberately not wired up.
// See "Phase 6" in enrollhub-plan.md and section 7 of enrollhub-content.md.

export const whatsappConfigured = false

export async function sendTemplate() {
  throw new Error('WhatsApp is not implemented yet (see Phase 6 in enrollhub-plan.md).')
}
