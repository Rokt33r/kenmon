/**
 * Word lists for generating human-readable signatures
 */
const ADVERBS = [
  'Quickly',
  'Slowly',
  'Happily',
  'Eagerly',
  'Gently',
  'Boldly',
  'Quietly',
  'Swiftly',
  'Cheerfully',
  'Gracefully',
  'Brightly',
  'Calmly',
  'Warmly',
  'Smoothly',
  'Lightly',
]

const ADJECTIVES = [
  'Happy',
  'Brave',
  'Clever',
  'Gentle',
  'Mighty',
  'Playful',
  'Swift',
  'Wise',
  'Bright',
  'Calm',
  'Noble',
  'Proud',
  'Kind',
  'Bold',
  'Joyful',
]

const ANIMALS = [
  'Elephant',
  'Tiger',
  'Dolphin',
  'Eagle',
  'Panda',
  'Fox',
  'Owl',
  'Lion',
  'Penguin',
  'Koala',
  'Wolf',
  'Bear',
  'Deer',
  'Rabbit',
  'Falcon',
]

/**
 * Generates a random, human-readable signature.
 * The signature follows the pattern: Adverb + Adjective + Animal (e.g., "Quickly Happy Elephant")
 *
 * This signature helps users verify that the OTP email they received matches
 * their authentication request, preventing phishing and reducing confusion.
 *
 * @returns A random human-readable signature string
 *
 */
export function generateSignature(): string {
  const adverb = ADVERBS[Math.floor(Math.random() * ADVERBS.length)]
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]

  return `${adverb} ${adjective} ${animal}`
}
