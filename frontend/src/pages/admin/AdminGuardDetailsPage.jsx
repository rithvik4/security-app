import { useEffect, useState } from "react";

import api from "../../api/client";

const guardInitial = { name: "", email: "", phone: "", password: "" };
const PAGE_SIZE = 8;

function AdminGuardDetailsPage() {
  const [guards, setGuards] = useState([]);
  const [activeModal, setActiveModal] = useState(false);
  const [editingGuard, setEditingGuard] = useState(null);
  const [form, setForm] = useState(guardInitial);
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalPages = Math.max(1, Math.ceil(guards.length / PAGE_SIZE));
  const pagedGuards = guards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const fetchGuards = async () => {
    const { data } = await api.get("/admin/security");
    setGuards(data);
  };

  useEffect(() => {
    fetchGuards();
  }, []);

  const openAdd = () => {
    setError("");
    setMessage("");
    setEditingGuard(null);
    setForm(guardInitial);
    setActiveModal(true);
  };

  const openEdit = (guard) => {
    setError("");
    setMessage("");
    setEditingGuard(guard);
    setForm({
      name: guard.name || "",
      email: guard.email || "",
      phone: guard.phone || "",
      password: "",
    });
    setActiveModal(true);
  };

  const closeModal = () => setActiveModal(false);

  const onFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const saveGuard = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
    };

    if (!editingGuard || form.password) {
      payload.password = form.password;
    }

    try {
      if (editingGuard) {
        await api.patch(`/admin/security/${editingGuard.id}`, payload);
        setMessage("Guard updated successfully.");
      } else {
        await api.post("/admin/security", payload);
        setMessage("Guard added successfully.");
      }
      closeModal();
      await fetchGuards();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save guard.");
    }
  };

  const removeGuard = async (guard) => {
    const confirmed = window.confirm(`Remove guard ${guard.name}?`);
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/security/${guard.id}`);
      setMessage("Guard removed successfully.");
      await fetchGuards();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove guard.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Guard Details</h2>
          <p className="text-sm text-ink/70">Manage security guard records and credentials.</p>
        </div>
        <button type="button" className="button-primary" onClick={openAdd}>Add Guard</button>
      </section>

      {message ? <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm text-tide">{message}</p> : null}
      {error ? <p className="rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">{error}</p> : null}

      <section className="panel overflow-x-auto">
        <h3 className="mb-3 text-lg font-semibold">All Guard Details</h3>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="py-2">ID</th>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedGuards.map((guard) => (
              <tr key={guard.id} className="border-b border-ink/5">
                <td className="py-2">{guard.id}</td>
                <td className="py-2">{guard.name}</td>
                <td className="py-2">{guard.email || "-"}</td>
                <td className="py-2">{guard.phone || "-"}</td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => openEdit(guard)}>Edit</button>
                    <button type="button" className="rounded-lg bg-signal px-3 py-1 text-xs text-paper" onClick={() => removeGuard(guard)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 disabled:opacity-50" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>Prev</button>
            <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 disabled:opacity-50" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      </section>

      {activeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
          <div className="panel w-full max-w-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{editingGuard ? "Edit Guard" : "Add Guard"}</h3>
              <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-sm" onClick={closeModal}>Close</button>
            </div>

            <form className="space-y-3" onSubmit={saveGuard}>
              <input className="input" name="name" placeholder="Guard Name" value={form.name} onChange={onFormChange} required />
              <input className="input" name="email" placeholder="Email" value={form.email} onChange={onFormChange} />
              <input className="input" name="phone" placeholder="Phone" value={form.phone} onChange={onFormChange} />
              <input className="input" type="password" name="password" placeholder={editingGuard ? "New Password (optional)" : "Temporary Password"} value={form.password} onChange={onFormChange} required={!editingGuard} />
              <button type="submit" className="button-primary w-full">Save Guard</button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminGuardDetailsPage;
