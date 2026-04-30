import { useEffect, useState } from "react";

import api from "../../api/client";

function MemberVisitorsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  const fetchVisitors = async () => {
    const { data } = await api.get("/member/visitors");
    setLogs(data);
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const decide = async (logId, action) => {
    setError("");
    try {
      await api.patch(`/member/visitors/${logId}/decision`, { action });
      fetchVisitors();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update visitor decision.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Visitors For My Flat</h2>
      {error ? <p className="rounded-lg bg-signal/10 px-3 py-2 text-sm text-signal">{error}</p> : null}

      <div className="space-y-3">
        {logs.length === 0 ? <div className="panel">No visitor records found.</div> : null}
        {logs.map((log) => (
          <article key={log.id} className="panel">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold">{log.visitor?.name}</p>
                <p className="text-sm text-ink/70">
                  {new Date(log.entryTime).toLocaleString()} | {log.status}
                  {log.approvedAt ? " | APPROVED" : ""}
                </p>
                <p className="text-sm text-ink/70">Vehicle: {log.visitor?.vehicleNumber || "N/A"}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="button-primary"
                  disabled={Boolean(log.approvedAt) || log.status !== "ENTERED"}
                  onClick={() => decide(log.id, "approve")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-signal px-4 py-2 font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={log.status !== "ENTERED"}
                  onClick={() => decide(log.id, "reject")}
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default MemberVisitorsPage;
