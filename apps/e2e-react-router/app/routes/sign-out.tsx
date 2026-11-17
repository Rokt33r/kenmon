import { redirect } from 'react-router'
import { auth } from '../auth'

export async function loader() {
  await auth.signOut()
  return redirect('/')
}
