import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";

const initialAnnouncement = { title: "", message: "", audienceRole: "" };
const initialInvoice = {
  flatId: "",
  amount: "",
  dueDate: "",
  month: "",
  year: "",
  notes: "",
};

function AdminOperationsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [flats, setFlats] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState(initialAnnouncement);
  const [invoiceForm, setInvoiceForm] = useState(initialInvoice);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = async () => {
    const [
      analyticsRes,
      auditRes,
      announcementsRes,
      complaintsRes,
      invoicesRes,
      flatsRes,
    ] = await Promise.all([
      api.get("/advanced/analytics/overview"),
      api.get("/advanced/audit-logs", { params: { limit: 40 } }),
      api.get("/advanced/announcements"),
      api.get("/advanced/complaints"),
      api.get("/advanced/maintenance-invoices"),
      api.get("/admin/flats"),
    ]);

    setAnalytics(analyticsRes.data);
    setAuditLogs(auditRes.data);
    setAnnouncements(announcementsRes.data);
    setComplaints(complaintsRes.data);
    setInvoices(invoicesRes.data);
    setFlats(flatsRes.data);
  };

  useEffect(() => {
    fetchData().catch(() => {
      setErrorMessage("Unable to load admin operations data.");
    });
  }, []);

  const openComplaints = useMemo(
    () => complaints.filter((ticket) => ["OPEN", "IN_PROGRESS"].includes(ticket.status)),
    [complaints]
  );

  const onAnnouncementChange = (e) => {
    setAnnouncementForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onInvoiceChange = (e) => {
    setInvoiceForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const publishAnnouncement = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.post("/advanced/announcements", {
        title: announcementForm.title,
        message: announcementForm.message,
        audienceRole: announcementForm.audienceRole || undefined,
      });
      setAnnouncementForm(initialAnnouncement);
      setStatusMessage("Announcement published.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to publish announcement.");
    }
  };

  const createInvoice = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.post("/advanced/maintenance-invoices", {
        flatId: Number(invoiceForm.flatId),
        amount: Number(invoiceForm.amount),
        dueDate: new Date(invoiceForm.dueDate).toISOString(),
        month: Number(invoiceForm.month),
        year: Number(invoiceForm.year),
        notes: invoiceForm.notes || undefined,
      });
      setInvoiceForm(initialInvoice);
      setStatusMessage("Maintenance invoice created.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to create invoice.");
    }
  };

  const updateComplaint = async (id, status) => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.patch(`/advanced/complaints/${id}/status`, { status });
      setStatusMessage("Complaint status updated.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to update complaint.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="text-xl font-bold">Advanced Operations Center</h2>
        <p className="mt-1 text-sm text-ink/70">
          Analytics, audit logs, maintenance billing, complaints, and community communication.
        </p>
      </section>

      {statusMessage ? <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm text-tide">{statusMessage}</p> : null}
      {errorMessage ? <p className="rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">{errorMessage}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Residents", analytics?.residentCount || 0],
          ["Deliveries Today", analytics?.deliveriesToday || 0],
          ["Open Emergencies", analytics?.openEmergencies || 0],
          ["Complaint Backlog", analytics?.complaintBacklog || 0],
          ["Pending Invoices", analytics?.pendingInvoices || 0],
          ["Active Vehicles", analytics?.activeVehicles || 0],
          ["Visitor Entries", analytics?.visitorEntries || 0],
          ["Open Complaints", openComplaints.length],
        ].map(([label, value]) => (
          <div key={label} className="panel">
            <p className="text-xs uppercase text-ink/60">{label}</p>
            <p className="mt-2 text-3xl font-bold text-tide">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Community Communication</h3>
          <form className="space-y-3" onSubmit={publishAnnouncement}>
            <input
              className="input"
              name="title"
              placeholder="Announcement title"
              value={announcementForm.title}
              onChange={onAnnouncementChange}
              required
            />
            <textarea
              className="input min-h-28"
              name="message"
              placeholder="Message"
              value={announcementForm.message}
              onChange={onAnnouncementChange}
              required
            />
            <select
              className="input"
              name="audienceRole"
              value={announcementForm.audienceRole}
              onChange={onAnnouncementChange}
            >
              <option value="">All Residents + Guards</option>
              <option value="MEMBER">Only Members</option>
              <option value="SECURITY">Only Security</option>
              <option value="ADMIN">Only Admin</option>
            </select>
            <button type="submit" className="button-primary w-full">Publish Announcement</button>
          </form>

          <div className="mt-4 space-y-2">
            {announcements.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-xl border border-ink/10 p-3">
                <p className="font-semibold">{item.title}</p>
                <p className="text-xs text-ink/60">
                  {item.audienceRole || "ALL"} | by {item.author?.name} | {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Maintenance Payments</h3>
          <form className="grid gap-3" onSubmit={createInvoice}>
            <select className="input" name="flatId" value={invoiceForm.flatId} onChange={onInvoiceChange} required>
              <option value="">Select Flat</option>
              {flats.map((flat) => (
                <option key={flat.id} value={flat.id}>{flat.block}-{flat.flatNumber}</option>
              ))}
            </select>
            <input className="input" type="number" step="0.01" name="amount" placeholder="Amount" value={invoiceForm.amount} onChange={onInvoiceChange} required />
            <input className="input" type="datetime-local" name="dueDate" value={invoiceForm.dueDate} onChange={onInvoiceChange} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" type="number" min="1" max="12" name="month" placeholder="Month" value={invoiceForm.month} onChange={onInvoiceChange} required />
              <input className="input" type="number" min="2024" max="2100" name="year" placeholder="Year" value={invoiceForm.year} onChange={onInvoiceChange} required />
            </div>
            <input className="input" name="notes" placeholder="Notes" value={invoiceForm.notes} onChange={onInvoiceChange} />
            <button type="submit" className="button-primary w-full">Generate Invoice</button>
          </form>

          <div className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
            {invoices.slice(0, 8).map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{invoice.flat?.block}-{invoice.flat?.flatNumber} | INR {invoice.amount}</p>
                <p className="text-ink/70">{invoice.month}/{invoice.year} | {invoice.status}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Complaint Ticketing</h3>
          <div className="space-y-2">
            {complaints.slice(0, 8).map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-ink/10 p-3">
                <p className="font-semibold">{ticket.subject}</p>
                <p className="text-xs text-ink/70">
                  {ticket.category} | {ticket.flat?.block}-{ticket.flat?.flatNumber} | {ticket.status}
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => updateComplaint(ticket.id, "IN_PROGRESS")}>In Progress</button>
                  <button type="button" className="rounded-lg bg-tide px-3 py-1 text-xs text-paper" onClick={() => updateComplaint(ticket.id, "RESOLVED")}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Analytics and Audit Logs</h3>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{log.module} | {log.action}</p>
                <p className="text-xs text-ink/70">
                  {log.entityType} {log.entityId ? `#${log.entityId}` : ""} | {log.actor?.name || "System"}
                </p>
                <p className="text-xs text-ink/60">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default AdminOperationsPage;
