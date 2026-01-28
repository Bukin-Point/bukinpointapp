import { redirect } from 'next/navigation'

export default function CustomerSignUpPage() {
  // Redirect to main signup - customers can sign up there too
  // They'll be redirected to customer dashboard after signup
  redirect('/signup')
}
