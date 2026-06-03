import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import LoginForm from './LoginForm';

export default function LoginPage() {
  if (isAuthenticated()) redirect('/dashboard');
  return <LoginForm />;
}
