import { useState } from 'react';

interface Props { onLogin: (key: string) => Promise<void>; }

export default function Login({ onLogin }: Props) {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');
    try {
      await onLogin(key.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <h1><span className="amber">FileTrail</span> Admin</h1>
          <p>Enter your <strong>ADMIN_KEY</strong> from Railway to continue</p>
        </div>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Admin Key</label>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="Your Railway ADMIN_KEY value"
              autoFocus
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading || !key.trim()}>
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
