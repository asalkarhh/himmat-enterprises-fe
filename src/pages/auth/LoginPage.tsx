import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Button } from '../../components/ui/Button';
import { ApiError } from '../../types/api.types';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Safe internal redirect resolver
  const getSafeRedirectUrl = (): string => {
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      return redirectParam;
    }
    return '/dashboard';
  };

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsRateLimited(false);

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      // Pass exact credentials without trimming or modifying password!
      const user = await login({ username: username.trim(), password });
      success(`Welcome back, ${user.displayName}!`);
      navigate(getSafeRedirectUrl(), { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 429 || err.code === 'RATE_LIMIT_EXCEEDED') {
          setIsRateLimited(true);
          setError('Too many failed attempts. Account temporarily throttled. Please try again later.');
        } else if (err.status === 401) {
          setError('Invalid username or password. Please verify your credentials.');
        } else {
          setError(err.message || 'Unable to sign in. Please verify your credentials and network.');
        }
      } else {
        setError('Network or server error. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Clean brand wordmark */}
        <div className="w-12 h-12 bg-teal-800 text-white rounded-xl mx-auto flex items-center justify-center shadow-md mb-3">
          <Building2 className="w-6 h-6 text-teal-200" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Himmat Enterprises
        </h1>
        <p className="mt-1 text-xs uppercase tracking-wider font-semibold text-teal-700">
          Shop Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            {error && (
              <div
                role="alert"
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  isRateLimited
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {isRateLimited ? (
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">{error}</div>
              </div>
            )}

            <Input
              label="Username"
              id="login-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. owner or manager"
              disabled={isLoading}
              autoFocus
            />

            <PasswordInput
              label="Password"
              id="login-password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5"
              isLoading={isLoading}
              disabled={isLoading || isRateLimited}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            <span>Online-only enterprise management application.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
