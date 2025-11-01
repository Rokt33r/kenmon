import { useState } from 'react'
import { auth } from '../lib/auth/auth'

const SignUpPage = () => {
  const [sentEmail, setSentEmail] = useState(false)
  const [preparationResult, setPreparationResult] = useState(null)
  async function sendEmailOTP(formData: FormData) {
    'use server'

    const email = formData.get('email')
    const preparationPayload = createEmailCodePreparationPayload(email)
    const [error, result] = await auth.prepare(preparationPayload)

    if (error != null) {
      console.error
      return
    }
  }

  return (
    <div>
      {!sentEmail ? (
        <form action={sendEmailOTP}>
          <div>
            <input type='email' defaultValue='' name='email' />
          </div>
          <div>
            <button type='submit'>Continue</button>
          </div>
        </form>
      ) : (
        <form></form>
      )}
    </div>
  )
}
