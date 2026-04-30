import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) {
      setError("Both identifier and password are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const nextPath = await login(form.identifier, form.password);
      navigate(nextPath, { replace: true });
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Cannot reach backend API. Start backend on port 5000 and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="panel w-full max-w-md">
        <h2 className="mb-2 text-2xl font-bold">Welcome Back</h2>
        <p className="mb-6 text-sm text-ink/70">Use email or phone + password to access your role dashboard.</p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="identifier">
              Email or Phone
            </label>
            <input
              id="identifier"
              className="input"
              name="identifier"
              value={form.identifier}
              onChange={handleChange}
              placeholder="admin@society.local"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="********"
            />
          </div>

          {error ? <p className="text-sm text-signal">{error}</p> : null}

          <button type="submit" className="button-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <div className="mt-6 rounded-lg bg-ink/5 p-3 text-xs text-ink/80">
          Demo accounts from seed:
          <div>admin@society.local / Pass@123</div>
          <div>guard@society.local / Pass@123</div>
          <div>member@society.local / Pass@123</div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
