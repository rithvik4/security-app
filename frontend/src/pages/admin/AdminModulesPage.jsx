import { useEffect, useState } from "react";

import api from "../../api/client";

const slotInitial = { slotNumber: "", type: "VISITOR", block: "" };
const amenityInitial = { name: "", description: "", capacity: 1 };
const pollInitial = { question: "", description: "", closesAt: "", options: ["", ""] };

function AdminModulesPage() {
  const [parkingSlots, setParkingSlots] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [polls, setPolls] = useState([]);
  const [slotForm, setSlotForm] = useState(slotInitial);
  const [amenityForm, setAmenityForm] = useState(amenityInitial);
  const [pollForm, setPollForm] = useState(pollInitial);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const [slotsRes, amenRes, bookRes, pollsRes] = await Promise.all([
      api.get("/modules/parking/slots"),
      api.get("/modules/amenities"),
      api.get("/modules/amenity-bookings"),
      api.get("/modules/polls"),
    ]);
    setParkingSlots(slotsRes.data);
    setAmenities(amenRes.data);
    setBookings(bookRes.data);
    setPolls(pollsRes.data);
  };

  useEffect(() => { load().catch(() => setError("Unable to load module data.")); }, []);

  const msg = (m) => { setStatus(m); setError(""); };
  const err = (e) => { setError(e?.response?.data?.message || String(e)); setStatus(""); };

  // Parking
  const addSlot = async (e) => {
    e.preventDefault();
    try {
      await api.post("/modules/parking/slots", { ...slotForm, block: slotForm.block || undefined });
      msg("Parking slot added.");
      setSlotForm(slotInitial);
      await load();
    } catch (ex) { err(ex); }
  };

  const allocate = async (id) => {
    const vehicleNo = prompt("Vehicle number:");
    if (!vehicleNo) return;
    try {
      await api.post(`/modules/parking/slots/${id}/allocate`, { vehicleNo, purpose: "VISITOR" });
      msg("Slot allocated.");
      await load();
    } catch (ex) { err(ex); }
  };

  const release = async (id) => {
    try {
      await api.post(`/modules/parking/slots/${id}/release`);
      msg("Slot released.");
      await load();
    } catch (ex) { err(ex); }
  };

  // Amenities
  const addAmenity = async (e) => {
    e.preventDefault();
    try {
      await api.post("/modules/amenities", { ...amenityForm, capacity: Number(amenityForm.capacity) });
      msg("Amenity added.");
      setAmenityForm(amenityInitial);
      await load();
    } catch (ex) { err(ex); }
  };

  const updateBooking = async (id, status) => {
    try {
      await api.patch(`/modules/amenity-bookings/${id}/status`, { status });
      msg(`Booking ${status.toLowerCase()}.`);
      await load();
    } catch (ex) { err(ex); }
  };

  // Polls
  const addPoll = async (e) => {
    e.preventDefault();
    try {
      await api.post("/modules/polls", {
        ...pollForm,
        options: pollForm.options.filter((o) => o.trim()),
      });
      msg("Poll created.");
      setPollForm(pollInitial);
      await load();
    } catch (ex) { err(ex); }
  };

  const closePoll = async (id) => {
    try {
      await api.patch(`/modules/polls/${id}/close`);
      msg("Poll closed.");
      await load();
    } catch (ex) { err(ex); }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="text-xl font-bold">Amenities · Polls · Parking</h2>
        <p className="mt-1 text-sm text-ink/70">Manage society amenities, community polls, and parking slots.</p>
      </section>

      {status ? <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm text-tide">{status}</p> : null}
      {error  ? <p className="rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">{error}</p> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Parking */}
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Parking Slot Management</h3>
          <form className="grid gap-3" onSubmit={addSlot}>
            <input className="input" placeholder="Slot number (e.g. B-01)" value={slotForm.slotNumber} onChange={(e) => setSlotForm((p) => ({ ...p, slotNumber: e.target.value }))} required />
            <select className="input" value={slotForm.type} onChange={(e) => setSlotForm((p) => ({ ...p, type: e.target.value }))}>
              <option value="CAR">Car</option>
              <option value="BIKE">Bike</option>
              <option value="VISITOR">Visitor</option>
              <option value="RESERVED">Reserved</option>
            </select>
            <input className="input" placeholder="Block (optional)" value={slotForm.block} onChange={(e) => setSlotForm((p) => ({ ...p, block: e.target.value }))} />
            <button type="submit" className="button-primary w-full">Add Slot</button>
          </form>
          <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
            {parkingSlots.map((slot) => {
              const occupied = slot.allocations?.length > 0;
              return (
                <div key={slot.id} className="rounded-xl border border-ink/10 p-3">
                  <p className="font-semibold">{slot.slotNumber} <span className="text-xs text-ink/60">({slot.type})</span> — {occupied ? <span className="text-signal">{slot.allocations[0]?.vehicleNo}</span> : <span className="text-tide">Free</span>}</p>
                  <div className="mt-1 flex gap-2">
                    {!occupied && <button type="button" className="rounded-lg bg-tide px-3 py-1 text-xs text-paper" onClick={() => allocate(slot.id)}>Assign Vehicle</button>}
                    {occupied  && <button type="button" className="rounded-lg bg-signal px-3 py-1 text-xs text-paper" onClick={() => release(slot.id)}>Release</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Amenities */}
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Amenity Management</h3>
          <form className="grid gap-3" onSubmit={addAmenity}>
            <input className="input" placeholder="Amenity name (Pool, Gym, Clubhouse)" value={amenityForm.name} onChange={(e) => setAmenityForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="input" placeholder="Description" value={amenityForm.description} onChange={(e) => setAmenityForm((p) => ({ ...p, description: e.target.value }))} />
            <input className="input" type="number" min="1" placeholder="Capacity (concurrent bookings)" value={amenityForm.capacity} onChange={(e) => setAmenityForm((p) => ({ ...p, capacity: e.target.value }))} required />
            <button type="submit" className="button-primary w-full">Add Amenity</button>
          </form>
          <div className="mt-3 space-y-1">
            {amenities.map((a) => (
              <div key={a.id} className="rounded-xl border border-ink/10 p-2 text-sm">
                <span className="font-semibold">{a.name}</span> <span className="text-ink/60">capacity={a.capacity}</span>
              </div>
            ))}
          </div>

          <h4 className="mt-4 mb-2 text-sm font-semibold">Pending Bookings</h4>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {bookings.filter((b) => b.status === "PENDING").map((b) => (
              <div key={b.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{b.amenity?.name} | {b.user?.name}</p>
                <p className="text-ink/70">{new Date(b.date).toLocaleDateString()} {b.startTime}–{b.endTime}</p>
                <div className="mt-1 flex gap-2">
                  <button type="button" className="rounded-lg bg-tide px-3 py-1 text-xs text-paper" onClick={() => updateBooking(b.id, "CONFIRMED")}>Confirm</button>
                  <button type="button" className="rounded-lg bg-signal px-3 py-1 text-xs text-paper" onClick={() => updateBooking(b.id, "CANCELLED")}>Cancel</button>
                </div>
              </div>
            ))}
            {bookings.filter((b) => b.status === "PENDING").length === 0 && (
              <p className="text-xs text-ink/60">No pending bookings.</p>
            )}
          </div>
        </article>
      </section>

      {/* Polls */}
      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Society Polls &amp; Voting</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <form className="space-y-3" onSubmit={addPoll}>
            <input className="input" placeholder="Poll question" value={pollForm.question} onChange={(e) => setPollForm((p) => ({ ...p, question: e.target.value }))} required />
            <input className="input" placeholder="Description (optional)" value={pollForm.description} onChange={(e) => setPollForm((p) => ({ ...p, description: e.target.value }))} />
            <input className="input" type="datetime-local" value={pollForm.closesAt} onChange={(e) => setPollForm((p) => ({ ...p, closesAt: e.target.value }))} required />
            <div className="space-y-2">
              {pollForm.options.map((opt, i) => (
                <input key={i} className="input" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => setPollForm((p) => { const opts = [...p.options]; opts[i] = e.target.value; return { ...p, options: opts }; })} />
              ))}
              <button type="button" className="text-xs text-tide underline" onClick={() => setPollForm((p) => ({ ...p, options: [...p.options, ""] }))}>+ Add option</button>
            </div>
            <button type="submit" className="button-primary w-full">Create Poll</button>
          </form>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {polls.map((poll) => {
              const total = poll.options.reduce((s, o) => s + o._count.votes, 0);
              return (
                <div key={poll.id} className="rounded-xl border border-ink/10 p-3">
                  <p className="font-semibold">{poll.question}</p>
                  <p className="text-xs text-ink/60">{poll.isActive ? "Active" : "Closed"} | {total} votes | closes {new Date(poll.closesAt).toLocaleDateString()}</p>
                  {poll.options.map((o) => (
                    <div key={o.id} className="mt-1 flex items-center justify-between text-sm">
                      <span>{o.text}</span>
                      <span className="text-ink/60">{o._count.votes} ({total ? Math.round(o._count.votes / total * 100) : 0}%)</span>
                    </div>
                  ))}
                  {poll.isActive && (
                    <button type="button" className="mt-2 rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => closePoll(poll.id)}>Close Poll</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminModulesPage;
