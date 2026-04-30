import { Link, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

const navByRole = {
  ADMIN: [
    { to: "/admin", label: "Visitor Dashboard" },
    { to: "/admin/flats", label: "Flat Details" },
    { to: "/admin/guards", label: "Guard Details" },
  ],
  SECURITY: [{ to: "/security", label: "Gate Entry" }],
  MEMBER: [{ to: "/member", label: "My Visitors" }],
};

function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = navByRole[user?.role] || [];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <header className="mx-auto mb-6 flex w-full max-w-6xl flex-col gap-4 rounded-2xl bg-ink px-5 py-4 text-paper md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Society Security Console</h1>
          <p className="text-sm text-paper/80">Logged in as {user?.name} ({user?.role})</p>
        </div>

        <div className="flex items-center gap-3">
          {links.map((item) => (
            <Link key={item.to} to={item.to} className="rounded-lg bg-paper/10 px-3 py-2 text-sm hover:bg-paper/20">
              {item.label}
            </Link>
          ))}
          <button type="button" onClick={handleLogout} className="button-accent text-sm">
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl animate-rise">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
