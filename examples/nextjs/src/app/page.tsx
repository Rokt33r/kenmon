export default function Home() {
  async function signUp(formData: FormData) {
    'use server'

    const email = formData.get('email')

    console.log(email)
  }

  async function signIn(formData: FormData) {
    'use server'

    const email = formData.get('email')

    console.log(email)
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
      <main className='flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start'>
        <div>
          <h1>Nextjs demo app</h1>

          <div>
            <h2>Sign Up</h2>
            <form action={signUp}>
              <div>
                <input type='email' defaultValue='' name='email' />
              </div>
              <div>
                <button type='submit'>Sign Up</button>
              </div>
            </form>
          </div>

          <div>
            <h2>Sign In</h2>
            <form action={signIn}>
              <div>
                <input type='email' defaultValue='' name='email' />
              </div>
              <div>
                <button type='submit'>Sign In</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
