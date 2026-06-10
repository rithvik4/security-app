import { useEffect, useState } from "react";

import api from "../../api/client";

const staffInitial = { name: "", phone: "", category: "MAID" };
const inviteInitial = { guestName: "", guestPhone: "", purpose: "", validFrom: "", validUntil: "" };
const bookingInitial = { amenityId: "", date: "", startTime: "", endTime: "", notes: "" };

function MemberServicesPage() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [invites, setInvites] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [polls, setPolls] = useState([]);
  const [parkingSlots, setParkingSlots] = useState([]);
  const [staffForm, setStaffForm] = useState(staffInitial);
  const [inviteForm, setInviteForm] = useState(inviteInitial);
  const [bookingForm, setBookingForm] = useState(bookingInitial);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const load = async () => {
    const [staffRes, attRes, invRes, amenRes, bookRes, pollsRes, parkRes] = await Promise.all([
      api.get("/modules/staff"),
      api.get("/modules/staff/attendance"),
      api.get("/modules/invites"),
      api.get("/modules/amenities"),
      api.get("/modules/amenity-bookings"),
      api.get("/modules/polls"),
      api.get("/modules/parking/slots"),
    ]);
    setStaff(staffRes.data);
    setAttendance(attRes.data);
    setInvites(invRes.data);
    setAmenities(amenRes.data);
    setMyBookings(bookRes.data);
    setPolls(pollsRes.data);
    setParkingSlots(parkRes.data);
  };

  useEffect(() => { load().catch(() => setErrorMsg("Unable to load member services.")); }, []);

  const msg = (m) => { setStatusMsg(m); setErrorMsg(""); };
  const err = (e) => { setErrorMsg(e?.response?.data?.message || String(e)); setStatusMsg(""); };

  const addStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post("/modules/staff", staffForm);
      msg("Domestic staff registered.");
      setStaffForm(staffInitial);
      await load();
    } catch (ex) { err(ex); }
  };

  const toggleStaff = async (id, isActive) => {
    try {
      await api.patch(`/modules/staff/${id}`, { isActive: !isActive });
      msg(isActive ? "Staff deactivated." : "Staff reactivated.");
      await load();
    } catch (ex) { err(ex); }
  };

  const createInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/modules/invites", {
        ...inviteForm,
        validFrom: new Date(inviteForm.validFrom).toISOString(),
        validUntil: new Date(inviteForm.validUntil).toISOString(),
        guestPhone: inviteForm.guestPhone || undefined,
        purpose: inviteForm.purpose || undefined,
      });
      msg(`Invite created — OTP: ${res.data.otp} (share with your guest)`);
      setInviteForm(inviteInitial);
      await load();
    } catch (ex) { err(ex); }
  };

  const bookAmenity = async (e) => {
    e.preventDefault();
    try {
      await api.post("/modules/amenity-bookings", {
        amenityId: Number(bookingForm.amenityId),
        date: new Date(bookingForm.date).toISOString(),
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        notes: bookingForm.notes || undefined,
      });
      msg("Amenity booking requested.");
      setBookingForm(bookingInitial);
      await load();
    } catch (ex) { err(ex); }
  };

  const cancelBooking = async (id) => {
    try {
      await api.patch(`/modules/amenity-bookings/${id}/status`, { status: "CANCELLED" });
      msg("Booking cancelled.");
      await load();
    } catch (ex) { err(ex); }
  };

  const vote = async (pollId, optionId) => {
    try {
      await api.post(`/modules/polls/${pollId}/vote`, { optionId });
      msg("Vote submitted.");
      await load();
    } catch (ex) { err(ex); }
  };

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="text-xl font-bold">Resident Services Hub</h2>
        <p className="mt-1 text-sm text-ink/70">Domestic staff, visitor invites, amenity bookings, polls, and parking.</p>
      </section>

      {statusMsg ? <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm text-tide">{statusMsg}</p> : null}
      {errorMsg  ? <p className="rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">{errorMsg}</p> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Domestic staff */}
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Domestic Staff</h3>
          <form className="grid gap-3" onSubmit={addStaff}>
            <input className="input" placeholder="Name" value={staffForm.name} onChange={(e) => setStaffForm((p) => ({ ...p, name: e.target.value }))} required />
            <input className="input" placeholder="Phone" value={staffForm.phone} onChange={(e) => setStaffForm((p) => ({ ...p, phone: e.target.value }))} />
            <select className="input" value={staffForm.category} onChange={(e) => setStaffForm((p) => ({ ...p, category: e.target.value }))}>
              {["MAID", "DRIVER", "COOK", "PLUMBER", "ELECTRICIAN", "MILKMAN", "NEWSPAPER", "OTHER"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button type="submit" className="button-primary w-full">Register Staff</button>
          </form>

          <div className="mt-4 max-h-52 space-y-2 overflow-y-auto pr-1">
            {staff.map((s) => (
              <div key={s.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{s.name} <span className="text-xs text-ink/60">{s.category}</span></p>
                    <p className="text-ink/60">{s.phone || "—"} | {s.isActive ? <span className="text-tide">Active</span> : <span className="text-signal">Inactive</span>}</p>
                    {s.attendances?.[0] && <p className="text-xs text-ink/50">Last in: {new Date(s.attendances[0].checkedInAt).toLocaleString()}</p>}
                  </div>
                  <button type="button" className="rounded-lg border border-ink/20 px-2 py-1 text-xs" onClick={() => toggleStaff(s.id, s.isActive)}>
                    {s.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h4 className="mt-4 mb-2 text-sm font-semibold">Attendance History</h4>
          <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
            {attendance.slice(0, 10).map((a) => (
              <div key={a.id} className="rounded-xl border border-ink/10 p-2 text-xs">
                <p className="font-medium">{a.frequentVisitor?.name} — {a.checkedOutAt ? "OUT" : <span className="text-tide">IN</span>}</p>
                <p className="text-ink/60">In: {new Date(a.checkedInAt).toLocaleString()}{a.checkedOutAt ? ` | Out: ${new Date(a.checkedOutAt).toLocaleString()}` : ""}</p>
              </div>
            ))}
          </div>
        </article>

        {/* Visitor OTP Invite */}
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Visitor OTP Invite</h3>
          <form className="space-y-3" onSubmit={createInvite}>
            <input className="input" placeholder="Guest name" value={inviteForm.guestName} onChange={(e) => setInviteForm((p) => ({ ...p, guestName: e.target.value }))} required />
            <input className="input" placeholder="Guest phone (optional)" value={inviteForm.guestPhone} onChange={(e) => setInviteForm((p) => ({ ...p, guestPhone: e.target.value }))} />
            <input className="input" placeholder="Purpose" value={inviteForm.purpose} onChange={(e) => setInviteForm((p) => ({ ...p, purpose: e.target.value }))} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs text-ink/60">Valid From</label><input className="input" type="datetime-local" value={inviteForm.validFrom} onChange={(e) => setInviteForm((p) => ({ ...p, validFrom: e.target.value }))} required /></div>
              <div><label className="mb-1 block text-xs text-ink/60">Valid Until</label><input className="input" type="datetime-local" value={inviteForm.validUntil} onChange={(e) => setInviteForm((p) => ({ ...p, validUntil: e.target.value }))} required /></div>
            </div>
            <button type="submit" className="button-primary w-full">Generate OTP Invite</button>
          </form>

          <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
            {invites.map((inv) => (
              <div key={inv.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{inv.guestName}</p>
                <p className="font-mono text-lg font-bold text-tide">{inv.otp}</p>
                <p className="text-xs text-ink/60">{new Date(inv.validFrom).toLocaleString()} → {new Date(inv.validUntil).toLocaleString()}</p>
                <p className="text-xs">{inv.usedAt ? <span className="text-signal">Used {new Date(inv.usedAt).toLocaleString()}</span> : <span className="text-tide">Pending</span>}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Amenity Booking */}
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Amenity Booking</h3>
          <form className="grid gap-3" onSubmit={bookAmenity}>
            <select className="input" value={bookingForm.amenityId} onChange={(e) => setBookingForm((p) => ({ ...p, amenityId: e.target.value }))} required>
              <option value="">Select Amenity</option>
              {amenities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input className="input" type="date" value={bookingForm.date} onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value }))} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" type="time" value={bookingForm.startTime} onChange={(e) => setBookingForm((p) => ({ ...p, startTime: e.target.value }))} required />
              <input className="input" type="time" value={bookingForm.endTime} onChange={(e) => setBookingForm((p) => ({ ...p, endTime: e.target.value }))} required />
            </div>
            <input className="input" placeholder="Notes" value={bookingForm.notes} onChange={(e) => setBookingForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit" className="button-primary w-full">Request Booking</button>
          </form>

          <div className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1">
            {myBookings.map((b) => (
              <div key={b.id} className="rounded-xl border border-ink/10 p-3 text-sm">
                <p className="font-semibold">{b.amenity?.name} | {b.status}</p>
                <p className="text-ink/70">{new Date(b.date).toLocaleDateString()} {b.startTime}–{b.endTime}</p>
                {b.status === "PENDING" && <button type="button" className="mt-1 rounded-lg bg-signal px-3 py-1 text-xs text-paper" onClick={() => cancelBooking(b.id)}>Cancel</button>}
              </div>
            ))}
          </div>
        </article>

        {/* Polls */}
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Society Polls</h3>
          <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
            {polls.map((poll) => {
              const total = poll.options.reduce((s, o) => s + o._count.votes, 0);
              return (
                <div key={poll.id} className="rounded-xl border border-ink/10 p-3">
                  <p className="font-semibold">{poll.question}</p>
                  <p className="text-xs text-ink/60 mb-2">{total} votes | {poll.isActive ? `closes ${new Date(poll.closesAt).toLocaleDateString()}` : "Closed"}</p>
                  <div className="space-y-2">
                    {poll.options.map((opt) => {
                      const pct = total ? Math.round(opt._count.votes / total * 100) : 0;
                      return (
                        <div key={opt.id}>
                          <div className="flex items-center justify-between text-sm mb-0.5">
                            <span>{opt.text}</span>
                            <span className="text-ink/60">{opt._count.votes} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-ink/10">
                            <div className="h-1.5 rounded-full bg-tide" style={{ width: `${pct}%` }} />
                          </div>
                          {poll.isActive && (
                            <button type="button" className="mt-1 rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => vote(poll.id, opt.id)}>Vote</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {/* Parking info */}
      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Parking Status</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {parkingSlots.map((slot) => {
            const occupied = slot.allocations?.length > 0;
            return (
              <div key={slot.id} className={`rounded-xl border p-3 text-sm ${occupied ? "border-signal/40 bg-signal/5" : "border-tide/40 bg-tide/5"}`}>
                <p className="font-semibold">{slot.slotNumber}</p>
                <p className="text-xs text-ink/60">{slot.type}{slot.block ? ` · ${slot.block}` : ""}</p>
                <p className="text-xs mt-1">{occupied ? `🚗 ${slot.allocations[0]?.vehicleNo}` : "Free"}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default MemberServicesPage;
