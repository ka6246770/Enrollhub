// The values a registration supplies to a message template. Shared by the
// Telegram alerts and the owner's email copy so a new field is added once.
export function registrationValues(registration, offer) {
  return {
    offer: offer.title,
    name: registration.name,
    age: registration.age,
    language: registration.language,
    level: registration.level,
    residence: registration.residence,
    email: registration.email,
    phone: registration.phone,
  }
}
