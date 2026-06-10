import { useEffect, useState } from "react";

import api from "../../api/client";

const PAGE_SIZE = 10;

function AdminDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [guards, setGuards] = useState([]);
  const [logs, setLogs] = useState([]);
  const [logFilters, setLogFilters] = useState({
    block: "",
    flatNumber: "",
    dateFrom: "",
    dateTo: "",
    enteredBy: "",
    status: "",
  });
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSummary = async () => {
    const { data } = await api.get("/admin/dashboard/summary");
    setSummary(data);
  };

  const fetchGuards = async () => {
    const { data } = await api.get("/admin/security");
    setGuards(data);
  };

  const fetchLogs = async (filters = logFilters) => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    const { data } = await api.get("/admin/visitor-logs", { params });
    setLogs(data);
  };

  const fetchAll = async () => {
    await Promise.all([
      fetchSummary(),
      fetchGuards(),
      fetchLogs({
        block: "",
        flatNumber: "",
        dateFrom: "",
        dateTo: "",
        enteredBy: "",
        status: "",
      }),
    ]);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const onLogFilterChange = (e) => {
    setLogFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onLogFilterSubmit = async (e) => {
    e.preventDefault();
    await fetchLogs(logFilters);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const pagedLogs = logs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-6">
        <section className="panel">
          <h2 className="text-xl font-bold">Visitor Dashboard</h2>
          <p className="mt-1 text-sm text-ink/70">Live list of visitors and guard entries across all blocks and flats.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Total Visitors", summary?.totalVisitors || 0],
            ["Total Entries", summary?.totalEntries || 0],
            ["Active Entries", summary?.activeEntries || 0],
            ["Members", summary?.memberCount || 0],
            ["Security Staff", summary?.securityCount || 0],
            ["Delivery Backlog", summary?.deliveryBacklog || 0],
            ["Open Complaints", summary?.openComplaints || 0],
            ["Pending Invoices", summary?.pendingInvoices || 0],
            ["Open Emergencies", summary?.openEmergencyAlerts || 0],
          ].map(([label, value]) => (
            <div key={label} className="panel">
              <p className="text-xs uppercase text-ink/60">{label}</p>
              <p className="mt-2 text-3xl font-bold text-tide">{value}</p>
            </div>
          ))}
        </section>

        <section className="panel">
          <h3 className="mb-4 text-lg font-semibold">Filter Guard Entries (By Block / Flat / Guard)</h3>
          <form className="grid gap-3 md:grid-cols-6" onSubmit={onLogFilterSubmit}>
            <input className="input" name="block" placeholder="Block" value={logFilters.block} onChange={onLogFilterChange} />
            <input className="input" name="flatNumber" placeholder="Flat" value={logFilters.flatNumber} onChange={onLogFilterChange} />
            <select className="input" name="enteredBy" value={logFilters.enteredBy} onChange={onLogFilterChange}>
              <option value="">All Guards</option>
              {guards.map((guard) => (
                <option key={guard.id} value={guard.id}>{guard.name}</option>
              ))}
            </select>
            <select className="input" name="status" value={logFilters.status} onChange={onLogFilterChange}>
              <option value="">All Status</option>
              <option value="ENTERED">ENTERED</option>
              <option value="EXITED">EXITED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <input className="input" type="datetime-local" name="dateFrom" value={logFilters.dateFrom} onChange={onLogFilterChange} />
            <input className="input" type="datetime-local" name="dateTo" value={logFilters.dateTo} onChange={onLogFilterChange} />
            <button type="submit" className="button-primary">Apply</button>
          </form>
        </section>

        <section className="panel overflow-x-auto">
          <h3 className="mb-3 text-lg font-semibold">Guard Entries</h3>
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="py-2">Guard</th>
                <th className="py-2">Visitor</th>
                <th className="py-2">Phone</th>
                <th className="py-2">Vehicle</th>
                <th className="py-2">Purpose</th>
                <th className="py-2">Flat</th>
                <th className="py-2">Entry</th>
                <th className="py-2">Exit</th>
                <th className="py-2">People</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((log) => (
                <tr key={log.id} className="border-b border-ink/5">
                  <td className="py-2">{log.guard?.name || "-"}</td>
                  <td className="py-2">{log.visitor?.name}</td>
                  <td className="py-2">{log.visitor?.phone || "-"}</td>
                  <td className="py-2">{log.visitor?.vehicleNumber || "-"}</td>
                  <td className="py-2">{log.purpose || "-"}</td>
                  <td className="py-2">{log.flat?.block}-{log.flat?.flatNumber}</td>
                  <td className="py-2">{new Date(log.entryTime).toLocaleString()}</td>
                  <td className="py-2">{log.exitTime ? new Date(log.exitTime).toLocaleString() : "-"}</td>
                  <td className="py-2">{log.peopleCount}</td>
                  <td className="py-2">{log.status}</td>
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
    </div>
  );
}

export default AdminDashboardPage;
