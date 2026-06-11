import { useEffect, useState } from "react";

import api from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

const deliveryInitial = {
  flatId: "",
  courierName: "",
  contactNumber: "",
  packageType: "",
  expectedAt: "",
};

const alertInitial = {
  level: "MEDIUM",
  message: "",
  flatId: "",
};

function SecurityOperationsPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [flats, setFlats] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [incidentTasks, setIncidentTasks] = useState({});
  const [deliveryForm, setDeliveryForm] = useState(deliveryInitial);
  const [alertForm, setAlertForm] = useState(alertInitial);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = async () => {
    const [dashboardRes, flatsRes, deliveriesRes, vehiclesRes, alertsRes, watchlistRes] = await Promise.all([
      api.get("/advanced/security/dashboard"),
      api.get("/security/flats"),
      api.get("/advanced/deliveries"),
      api.get("/advanced/vehicles"),
      api.get("/advanced/emergency-alerts"),
      api.get("/modules/watchlist", { params: { isActive: true } }),
    ]);

    setDashboard(dashboardRes.data);
    setFlats(flatsRes.data);
    setDeliveries(deliveriesRes.data);
    setVehicles(vehiclesRes.data);
    setAlerts(alertsRes.data);
    setWatchlist(watchlistRes.data);

    const openAlertIds = alertsRes.data
      .filter((a) => ["OPEN", "ACKNOWLEDGED"].includes(a.status))
      .map((a) => a.id)
      .slice(0, 8);

    const tasksPairs = await Promise.all(
      openAlertIds.map(async (id) => {
        const { data } = await api.get(`/advanced/emergency-alerts/${id}/tasks`);
        return [id, data];
      })
    );

    setIncidentTasks(Object.fromEntries(tasksPairs));
  };

  useEffect(() => {
    fetchData().catch(() => {
      setErrorMessage("Unable to load security operations data.");
    });
  }, []);

  const onDeliveryChange = (e) => {
    setDeliveryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onAlertChange = (e) => {
    setAlertForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const createDelivery = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.post("/advanced/deliveries", {
        flatId: Number(deliveryForm.flatId),
        courierName: deliveryForm.courierName,
        contactNumber: deliveryForm.contactNumber || undefined,
        packageType: deliveryForm.packageType || undefined,
        expectedAt: deliveryForm.expectedAt ? new Date(deliveryForm.expectedAt).toISOString() : undefined,
      });
      setDeliveryForm(deliveryInitial);
      setStatusMessage("Delivery created.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to create delivery.");
    }
  };

  const updateDelivery = async (id, status) => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.patch(`/advanced/deliveries/${id}/status`, { status });
      setStatusMessage("Delivery status updated.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to update delivery.");
    }
  };

  const generatePin = async (id) => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      const { data } = await api.post(`/advanced/deliveries/${id}/pin`);
      setStatusMessage(`Handover PIN for delivery #${id}: ${data.handoverPin}`);
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to generate handover pin.");
    }
  };

  const updateVehicle = async (id, status) => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.patch(`/advanced/vehicles/${id}/status`, { status });
      setStatusMessage("Vehicle status updated.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to update vehicle.");
    }
  };

  const raiseAlert = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.post("/advanced/emergency-alerts", {
        level: alertForm.level,
        message: alertForm.message,
        flatId: alertForm.flatId ? Number(alertForm.flatId) : undefined,
      });
      setAlertForm(alertInitial);
      setStatusMessage("Emergency alert raised.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to raise alert.");
    }
  };

  const acknowledgeAlert = async (id, status) => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.patch(`/advanced/emergency-alerts/${id}/acknowledge`, { status });
      setStatusMessage("Alert updated.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to update alert.");
    }
  };

  const assignTask = async (alertId) => {
    if (!user?.id) {
      setErrorMessage("Unable to identify current guard user.");
      return;
    }

    const note = window.prompt("Task note for this incident");
    if (!note) return;

    try {
      await api.post(`/advanced/emergency-alerts/${alertId}/tasks`, {
        assignedToId: user?.id,
        note,
      });
      setStatusMessage("Incident task created.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to create incident task.");
    }
  };

  const updateTask = async (alertId, taskId, status) => {
    try {
      await api.patch(`/advanced/emergency-alerts/${alertId}/tasks/${taskId}`, { status });
      setStatusMessage("Incident task updated.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to update incident task.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="text-xl font-bold">Guard Dashboard</h2>
        <p className="mt-1 text-sm text-ink/70">
          Delivery tracking, vehicle checks, emergency escalation, and live guard metrics.
        </p>
      </section>

      {statusMessage ? <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm text-tide">{statusMessage}</p> : null}
      {errorMessage ? <p className="rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">{errorMessage}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Active Visitors", dashboard?.activeVisitors || 0],
          ["Expected Deliveries", dashboard?.expectedDeliveries || 0],
          ["Open Emergencies", dashboard?.openEmergencyAlerts || 0],
          ["Blocked Vehicles", dashboard?.blockedVehicles || 0],
          ["Open Complaints", dashboard?.openComplaints || 0],
        ].map(([label, value]) => (
          <div key={label} className="panel">
            <p className="text-xs uppercase text-ink/60">{label}</p>
            <p className="mt-2 text-3xl font-bold text-tide">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Delivery Tracking</h3>
          <form className="grid gap-3" onSubmit={createDelivery}>
            <select className="input" name="flatId" value={deliveryForm.flatId} onChange={onDeliveryChange} required>
              <option value="">Select Flat</option>
              {flats.map((flat) => (
                <option key={flat.id} value={flat.id}>{flat.block}-{flat.flatNumber}</option>
              ))}
            </select>
            <input className="input" name="courierName" placeholder="Courier / Vendor" value={deliveryForm.courierName} onChange={onDeliveryChange} required />
            <input className="input" name="contactNumber" placeholder="Contact number" value={deliveryForm.contactNumber} onChange={onDeliveryChange} />
            <input className="input" name="packageType" placeholder="Package type" value={deliveryForm.packageType} onChange={onDeliveryChange} />
            <input className="input" type="datetime-local" name="expectedAt" value={deliveryForm.expectedAt} onChange={onDeliveryChange} />
            <button type="submit" className="button-primary w-full">Add Delivery</button>
          </form>

          <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
            {deliveries.slice(0, 10).map((item) => (
              <div key={item.id} className="rounded-xl border border-ink/10 p-3">
                <p className="font-semibold">{item.courierName} | {item.status}</p>
                <p className="text-xs text-ink/70">{item.flat?.block}-{item.flat?.flatNumber}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => updateDelivery(item.id, "ARRIVED")}>Arrived</button>
                  <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => generatePin(item.id)}>Generate PIN</button>
                  <button type="button" className="rounded-lg bg-tide px-3 py-1 text-xs text-paper" onClick={() => updateDelivery(item.id, "COLLECTED")}>Collected</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Emergency Alerts</h3>
          <form className="grid gap-3" onSubmit={raiseAlert}>
            <select className="input" name="level" value={alertForm.level} onChange={onAlertChange}>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <select className="input" name="flatId" value={alertForm.flatId} onChange={onAlertChange}>
              <option value="">Common Area / Global</option>
              {flats.map((flat) => (
                <option key={flat.id} value={flat.id}>{flat.block}-{flat.flatNumber}</option>
              ))}
            </select>
            <textarea className="input min-h-24" name="message" placeholder="Emergency details" value={alertForm.message} onChange={onAlertChange} required />
            <button type="submit" className="button-primary w-full">Raise Alert</button>
          </form>

          <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
            {alerts.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-xl border border-ink/10 p-3">
                <p className="font-semibold">{item.level} | {item.status}</p>
                <p className="text-xs text-ink/70">{item.message}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => acknowledgeAlert(item.id, "ACKNOWLEDGED")}>Acknowledge</button>
                  <button type="button" className="rounded-lg bg-tide px-3 py-1 text-xs text-paper" onClick={() => acknowledgeAlert(item.id, "RESOLVED")}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Vehicle Management</h3>
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {vehicles.slice(0, 12).map((vehicle) => (
            <div key={vehicle.id} className="rounded-xl border border-ink/10 p-3">
              <p className="font-semibold">{vehicle.plateNumber} | {vehicle.status}</p>
              <p className="text-xs text-ink/70">{vehicle.flat?.block}-{vehicle.flat?.flatNumber} | {vehicle.owner?.name}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => updateVehicle(vehicle.id, "ACTIVE")}>Allow</button>
                <button type="button" className="rounded-lg bg-signal px-3 py-1 text-xs text-paper" onClick={() => updateVehicle(vehicle.id, "BLOCKED")}>Block</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Incident Command Tasks</h3>
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {alerts
              .filter((item) => ["OPEN", "ACKNOWLEDGED"].includes(item.status))
              .slice(0, 8)
              .map((item) => (
                <div key={item.id} className="rounded-xl border border-ink/10 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Alert #{item.id} | {item.level}</p>
                      <p className="text-xs text-ink/70">{item.message}</p>
                    </div>
                    <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => assignTask(item.id)}>
                      + Task
                    </button>
                  </div>

                  <div className="mt-2 space-y-2">
                    {(incidentTasks[item.id] || []).map((task) => (
                      <div key={task.id} className="rounded-lg bg-ink/5 p-2 text-xs">
                        <p className="font-medium">{task.note}</p>
                        <p className="text-ink/60">{task.status} | assigned to {task.assignedTo?.name}</p>
                        <div className="mt-1 flex gap-2">
                          <button type="button" className="rounded border border-ink/20 px-2 py-0.5" onClick={() => updateTask(item.id, task.id, "IN_PROGRESS")}>In Progress</button>
                          <button type="button" className="rounded border border-ink/20 px-2 py-0.5" onClick={() => updateTask(item.id, task.id, "RESOLVED")}>Done</button>
                        </div>
                      </div>
                    ))}
                    {(incidentTasks[item.id] || []).length === 0 && <p className="text-xs text-ink/60">No tasks yet.</p>}
                  </div>
                </div>
              ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Live Watchlist (Gate Intel)</h3>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {watchlist.slice(0, 20).map((w) => (
              <div key={w.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{w.type} | {w.value}</p>
                <p className="text-xs text-ink/60">{w.severity} | {w.reason}</p>
              </div>
            ))}
            {watchlist.length === 0 && <p className="text-sm text-ink/60">No active watchlist entries.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}

export default SecurityOperationsPage;
