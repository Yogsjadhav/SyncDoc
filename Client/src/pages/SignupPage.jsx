import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function SignupPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.includes('@')) e.email = 'Enter a valid email';
    if (form.password.length < 6) e.password = 'At least 6 characters';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await apiClient.post('/api/auth/signup', form);
      setAuth(res.data.user, res.data.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors({ form: err.response?.data?.message || 'Sign up failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold text-brand-600">SyncDoc</Link>
          <p className="mt-2 text-sm text-gray-500">Create your free account</p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <Input label="Full name" type="text" autoComplete="name"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              error={errors.name} required />
            <Input label="Email address" type="email" autoComplete="email"
              value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              error={errors.email} required />
            <Input label="Password" type="password" autoComplete="new-password"
              value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              error={errors.password} hint="At least 6 characters" required />
            {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</p>}
            <Button type="submit" loading={loading} className="w-full mt-1">Create account</Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">Log in</Link>
        </p>
      </div>
    </div>
  );
}
