import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  if (await isAuthenticated()) redirect('/dashboard');
  return <LoginForm />;
}
