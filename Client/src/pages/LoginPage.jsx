import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

/**
 * LoginPage Component
 * 
 * UI Layer: Handles user login interface
 * Uses: useAuth hook (Hooks Layer)
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading, error: authError } = useAuth();
  
  const from = location.state?.from?.pathname || '/dashboard';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Call login through hook
    const result = await login(form);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold text-brand-600">SyncDoc</Link>
          <p className="mt-2 text-sm text-gray-500">Welcome back</p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Input 
              label="Email address" 
              type="email" 
              autoComplete="email"
              value={form.email} 
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} 
              required 
            />
            <Input 
              label="Password" 
              type="password" 
              autoComplete="current-password"
              value={form.password} 
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} 
              required 
            />
            {(error || authError) && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error || authError}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full mt-1">
              Log in
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-700">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
