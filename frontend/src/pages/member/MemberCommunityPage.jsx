import { useEffect, useState } from "react";

import api from "../../api/client";

const vehicleInitial = { plateNumber: "", type: "", brand: "", color: "" };
const complaintInitial = { category: "", subject: "", description: "" };

function MemberCommunityPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [vehicleForm, setVehicleForm] = useState(vehicleInitial);
  const [complaintForm, setComplaintForm] = useState(complaintInitial);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = async () => {
    const [
      deliveriesRes,
      vehiclesRes,
      alertsRes,
      invoicesRes,
      complaintsRes,
      announcementsRes,
    ] = await Promise.all([
      api.get("/advanced/deliveries"),
      api.get("/advanced/vehicles"),
      api.get("/advanced/emergency-alerts"),
      api.get("/advanced/maintenance-invoices"),
      api.get("/advanced/complaints"),
      api.get("/advanced/announcements"),
    ]);

    setDeliveries(deliveriesRes.data);
    setVehicles(vehiclesRes.data);
    setAlerts(alertsRes.data);
    setInvoices(invoicesRes.data);
    setComplaints(complaintsRes.data);
    setAnnouncements(announcementsRes.data);
  };

  useEffect(() => {
    fetchData().catch(() => {
      setErrorMessage("Unable to load member community data.");
    });
  }, []);

  const onVehicleChange = (e) => {
    setVehicleForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onComplaintChange = (e) => {
    setComplaintForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const registerVehicle = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.post("/advanced/vehicles", {
        plateNumber: vehicleForm.plateNumber,
        type: vehicleForm.type,
        brand: vehicleForm.brand || undefined,
        color: vehicleForm.color || undefined,
      });
      setVehicleForm(vehicleInitial);
      setStatusMessage("Vehicle registered.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to register vehicle.");
    }
  };

  const collectDelivery = async (id) => {
    setStatusMessage("");
    setErrorMessage("");

    const pin = window.prompt("Enter 4-digit handover PIN from security gate");
    if (!pin) {
      return;
    }

    try {
      await api.post(`/advanced/deliveries/${id}/handover-verify`, { pin });
      setStatusMessage("Delivery handover verified and marked collected.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to update delivery.");
    }
  };

  const payInvoice = async (id, amount) => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.post(`/advanced/maintenance-invoices/${id}/payments`, {
        amount,
        method: "UPI",
        reference: `UPI-${Date.now()}`,
      });
      setStatusMessage("Maintenance payment recorded.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to pay invoice.");
    }
  };

  const createComplaint = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.post("/advanced/complaints", complaintForm);
      setComplaintForm(complaintInitial);
      setStatusMessage("Complaint submitted.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to create complaint.");
    }
  };

  const raiseAlert = async (level) => {
    setStatusMessage("");
    setErrorMessage("");

    try {
      await api.post("/advanced/emergency-alerts", {
        level,
        message: `Resident emergency alert (${level})`,
      });
      setStatusMessage("Emergency alert sent to security desk.");
      await fetchData();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Unable to send alert.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="text-xl font-bold">Resident Community Hub</h2>
        <p className="mt-1 text-sm text-ink/70">
          Delivery tracking, vehicle registration, maintenance payments, complaints, alerts, and announcements.
        </p>
      </section>

      {statusMessage ? <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm text-tide">{statusMessage}</p> : null}
      {errorMessage ? <p className="rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">{errorMessage}</p> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Delivery Tracking</h3>
          <div className="space-y-2">
            {deliveries.length === 0 ? <p className="text-sm text-ink/70">No deliveries found.</p> : null}
            {deliveries.slice(0, 8).map((delivery) => (
              <div key={delivery.id} className="rounded-xl border border-ink/10 p-3">
                <p className="font-semibold">{delivery.courierName} | {delivery.status}</p>
                <p className="text-xs text-ink/70">{delivery.packageType || "General package"}</p>
                {delivery.status !== "COLLECTED" ? (
                  <button type="button" className="mt-2 rounded-lg bg-tide px-3 py-1 text-xs text-paper" onClick={() => collectDelivery(delivery.id)}>
                    Mark Collected
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Vehicle Management</h3>
          <form className="grid gap-3" onSubmit={registerVehicle}>
            <input className="input" name="plateNumber" placeholder="Plate Number" value={vehicleForm.plateNumber} onChange={onVehicleChange} required />
            <input className="input" name="type" placeholder="Type (Car/Bike)" value={vehicleForm.type} onChange={onVehicleChange} required />
            <input className="input" name="brand" placeholder="Brand" value={vehicleForm.brand} onChange={onVehicleChange} />
            <input className="input" name="color" placeholder="Color" value={vehicleForm.color} onChange={onVehicleChange} />
            <button type="submit" className="button-primary w-full">Register Vehicle</button>
          </form>

          <div className="mt-4 space-y-2">
            {vehicles.slice(0, 5).map((vehicle) => (
              <div key={vehicle.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{vehicle.plateNumber} | {vehicle.status}</p>
                <p className="text-ink/70">{vehicle.type} {vehicle.brand ? `| ${vehicle.brand}` : ""}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Maintenance Payments</h3>
          <div className="space-y-2">
            {invoices.length === 0 ? <p className="text-sm text-ink/70">No invoices for your flat.</p> : null}
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-xl border border-ink/10 p-3">
                <p className="font-semibold">{invoice.month}/{invoice.year} | INR {invoice.amount}</p>
                <p className="text-xs text-ink/70">Due: {new Date(invoice.dueDate).toLocaleDateString()} | {invoice.status}</p>
                {invoice.status !== "PAID" ? (
                  <button type="button" className="mt-2 rounded-lg bg-tide px-3 py-1 text-xs text-paper" onClick={() => payInvoice(invoice.id, invoice.amount)}>
                    Pay Full Amount
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Complaint Ticketing</h3>
          <form className="space-y-3" onSubmit={createComplaint}>
            <input className="input" name="category" placeholder="Category (Plumbing, Noise, Lift)" value={complaintForm.category} onChange={onComplaintChange} required />
            <input className="input" name="subject" placeholder="Subject" value={complaintForm.subject} onChange={onComplaintChange} required />
            <textarea className="input min-h-24" name="description" placeholder="Description" value={complaintForm.description} onChange={onComplaintChange} required />
            <button type="submit" className="button-primary w-full">Create Complaint</button>
          </form>

          <div className="mt-4 max-h-40 space-y-2 overflow-y-auto pr-1">
            {complaints.slice(0, 6).map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{ticket.subject}</p>
                <p className="text-ink/70">{ticket.category} | {ticket.status}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Emergency Alerts</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-paper" onClick={() => raiseAlert("HIGH")}>Raise High Alert</button>
            <button type="button" className="rounded-lg bg-signal px-3 py-2 text-xs font-semibold text-paper" onClick={() => raiseAlert("CRITICAL")}>SOS Critical Alert</button>
          </div>
          <div className="mt-4 max-h-40 space-y-2 overflow-y-auto pr-1">
            {alerts.slice(0, 6).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{alert.level} | {alert.status}</p>
                <p className="text-ink/70">{alert.message}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Community Communication</h3>
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {announcements.map((item) => (
              <div key={item.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{item.title}</p>
                <p className="text-ink/70">{item.message}</p>
                <p className="text-xs text-ink/60">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}

export default MemberCommunityPage;
