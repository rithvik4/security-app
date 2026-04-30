import { useEffect, useState } from "react";

import api from "../../api/client";

const initialForm = {
  visitorName: "",
  phone: "",
  flatId: "",
  peopleCount: 1,
  vehicleNumber: "",
  purpose: "",
};

function SecurityEntryPage() {
  const [form, setForm] = useState(initialForm);
  const [flats, setFlats] = useState([]);
  const [activeEntries, setActiveEntries] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchFlats = async () => {
    try {
      const { data } = await api.get("/security/flats");
      setFlats(data);
    } catch (_err) {
      setError("Unable to load flats. Please refresh the page.");
    }
  };

  const fetchActiveEntries = async () => {
    const { data } = await api.get("/security/active-entries");
    setActiveEntries(data);
  };

  useEffect(() => {
    fetchFlats();
    fetchActiveEntries();
  }, []);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.post("/security/visitor-entry", {
        visitorName: form.visitorName,
        phone: form.phone || undefined,
        flatId: Number(form.flatId),
        peopleCount: Number(form.peopleCount),
        vehicleNumber: form.vehicleNumber || undefined,
        purpose: form.purpose || undefined,
      });

      setMessage("Visitor entry created successfully.");
      setForm(initialForm);
      fetchActiveEntries();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create visitor entry.");
    }
  };

  const markExit = async (logId) => {
    await api.patch(`/security/visitor-exit/${logId}`);
    fetchActiveEntries();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
      <section className="panel">
        <h2 className="mb-4 text-xl font-bold">Quick Gate Entry</h2>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <input className="input" name="visitorName" placeholder="Visitor name" value={form.visitorName} onChange={onChange} required />
          <input className="input" name="phone" placeholder="Phone (optional)" value={form.phone} onChange={onChange} />
          <select className="input" name="flatId" value={form.flatId} onChange={onChange} required>
            <option value="">Select Flat</option>
            {flats.map((flat) => (
              <option key={flat.id} value={flat.id}>{flat.block}-{flat.flatNumber}</option>
            ))}
          </select>
          <input className="input" name="peopleCount" type="number" min="1" max="20" value={form.peopleCount} onChange={onChange} required />
          <input className="input" name="vehicleNumber" placeholder="Vehicle number" value={form.vehicleNumber} onChange={onChange} />
          <input className="input" name="purpose" placeholder="Purpose" value={form.purpose} onChange={onChange} />
          <button type="submit" className="button-primary">Create Entry</button>
        </form>
        {error ? <p className="mt-3 text-sm text-signal">{error}</p> : null}
        {message ? <p className="mt-3 text-sm text-tide">{message}</p> : null}
      </section>

      <section className="panel">
        <h3 className="mb-4 text-lg font-semibold">Active Entries</h3>
        <div className="space-y-3">
          {activeEntries.length === 0 ? <p className="text-sm text-ink/70">No active entries.</p> : null}
          {activeEntries.map((log) => (
            <div key={log.id} className="rounded-xl border border-ink/10 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{log.visitor?.name}</p>
                  <p className="text-xs text-ink/70">{log.flat?.block}-{log.flat?.flatNumber} | {log.peopleCount} people</p>
                </div>
                <button type="button" className="button-accent" onClick={() => markExit(log.id)}>
                  Mark Exit
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default SecurityEntryPage;
