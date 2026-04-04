import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus } from 'lucide-react';
import { authService } from '../services/authService';

export default function Login() {
    const navigate = useNavigate();

    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await authService.login(form);
            authService.saveAuth(response.token, response.user);
            window.location.replace('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
                        <Bus size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">DTC Bus Scheduling</h1>
                    <p className="text-slate-400 text-sm mt-1">Delhi Transport Corporation</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
                    <p className="text-sm text-gray-400 mb-6">Enter your credentials to access the system</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            ⚠ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                placeholder="admin@dtc.com"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                required
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                required
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    {/* Role info */}
                    {/* Test accounts */}
                    <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                            Demo accounts — click to auto-fill
                        </p>
                        <div className="space-y-1">
                            {[
                                {
                                    role: 'Admin',
                                    email: 'admin@dtc.com',
                                    password: 'admin123',
                                    desc: 'Full access',
                                    color: 'text-red-600',
                                    bg: 'hover:bg-red-50',
                                    badge: 'bg-red-100 text-red-700',
                                },
                                {
                                    role: 'Scheduler',
                                    email: 'scheduler@dtc.com',
                                    password: 'scheduler123',
                                    desc: 'Manage schedules',
                                    color: 'text-blue-600',
                                    bg: 'hover:bg-blue-50',
                                    badge: 'bg-blue-100 text-blue-700',
                                },
                                {
                                    role: 'Viewer',
                                    email: 'viewer@dtc.com',
                                    password: 'viewer123',
                                    desc: 'Read only',
                                    color: 'text-gray-600',
                                    bg: 'hover:bg-gray-100',
                                    badge: 'bg-gray-100 text-gray-600',
                                },
                            ].map(({ role, email, password, desc, color, bg, badge }) => (
                                <div
                                    key={role}
                                    onClick={() => setForm({ email, password })}
                                    className={`flex items-center justify-between text-xs cursor-pointer px-2 py-2 rounded-lg transition-colors ${bg}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className={`font-semibold px-1.5 py-0.5 rounded text-xs ${badge}`}>
                                            {role}
                                        </span>
                                        <span className="text-gray-400">{desc}</span>
                                    </div>
                                    <span className="text-gray-400 font-mono">{email}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">
                            Click any row to auto-fill credentials
                        </p>
                    </div>
                </div>

                <p className="text-center text-slate-600 text-xs mt-6">
                    DTC Internal System · Authorized Personnel Only
                </p>
            </div>
        </div>
    );
}