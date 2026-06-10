import { useEffect, useState } from "react";

import api from "../../api/client";

function SecurityModulesPage() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [inviteOtp, setInviteOtp] = useState("");
  const [inviteResult, setInviteResult] = useState(null);
  const [parkingSlots, setParkingSlots] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const load = async () => {
    const [staffRes, attRes, slotsRes, allocRes] = await Promise.all([
      api.get("/modules/staff"),
      api.get("/modules/staff/attendance"),
      api.get("/modules/parking/slots"),
      api.get("/modules/parking/allocations?active=true"),
    ]);
    setStaff(staffRes.data);
    setAttendance(attRes.data);
    setParkingSlots(slotsRes.data);
    setAllocations(allocRes.data);
  };

  useEffect(() => { load().catch(() => setErrorMsg("Unable to load data.")); }, []);

  const msg = (m) => { setStatusMsg(m); setErrorMsg(""); };
  const err = (e) => { setErrorMsg(e?.response?.data?.message || String(e)); setStatusMsg(""); };

  const checkin = async (frequentVisitorId) => {
    try {
      await api.post("/modules/staff/checkin", { frequentVisitorId });
      msg("Staff checked in.");
      await load();
    } catch (ex) { err(ex); }
  };

  const checkout = async (frequentVisitorId) => {
    try {
      await api.post("/modules/staff/checkout", { frequentVisitorId });
      msg("Staff checked out.");
      await load();
    } catch (ex) { err(ex); }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setInviteResult(null);
    try {
      const res = await api.post("/modules/invites/verify", { otp: inviteOtp });
      setInviteResult(res.data);
      msg(`Invite verified — ${res.data.invite.guestName} admitted to ${res.data.visitorLog.flat?.block}-${res.data.visitorLog.flat?.flatNumber}`);
      setInviteOtp("");
    } catch (ex) { err(ex); }
  };

  const allocate = async (slotId) => {
    const vehicleNo = prompt("Vehicle number:");
    if (!vehicleNo) return;
    const purpose = "VISITOR";
    try {
      await api.post(`/modules/parking/slots/${slotId}/allocate`, { vehicleNo, purpose });
      msg(`Slot allocated to ${vehicleNo}.`);
      await load();
    } catch (ex) { err(ex); }
  };

  const release = async (slotId) => {
    try {
      await api.post(`/modules/parking/slots/${slotId}/release`);
      msg("Slot released.");
      await load();
    } catch (ex) { err(ex); }
  };

  // Determine check-in state per staff member
  const activeCheckIns = new Set(
    attendance.filter((a) => !a.checkedOutAt).map((a) => a.frequentVisitor?.id)
  );

  return (
    <div className="space-y-6">
      <section className="panel">
        <h2 className="text-xl font-bold">Security Modules</h2>
        <p className="mt-1 text-sm text-ink/70">Staff check-in/out, OTP invite verification, and parking slot control.</p>
      </section>

      {statusMsg ? <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm text-tide">{statusMsg}</p> : null}
      {errorMsg  ? <p className="rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">{errorMsg}</p> : null}

      <section className="grid gap-6 lg:grid-cols-2">
        {/* Staff check-in */}
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">Domestic Staff Check-in / Check-out</h3>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {staff.filter((s) => s.isActive).map((s) => {
              const checkedIn = activeCheckIns.has(s.id);
              return (
                <div key={s.id} className="rounded-xl border border-ink/10 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{s.name} <span className="text-xs text-ink/60">{s.category}</span></p>
                      <p className="text-xs text-ink/70">{s.flat?.block}-{s.flat?.flatNumber} | {checkedIn ? <span className="text-tide font-semibold">IN</span> : "OUT"}</p>
                    </div>
                    <div className="flex gap-2">
                      {!checkedIn && <button type="button" className="rounded-lg bg-tide px-3 py-1 text-xs text-paper" onClick={() => checkin(s.id)}>Check In</button>}
                      {checkedIn  && <button type="button" className="rounded-lg bg-signal px-3 py-1 text-xs text-paper" onClick={() => checkout(s.id)}>Check Out</button>}
                    </div>
                  </div>
                </div>
              );
            })}
            {staff.filter((s) => s.isActive).length === 0 && <p className="text-sm text-ink/60">No active staff registered.</p>}
          </div>

          <h4 className="mt-4 mb-2 text-sm font-semibold">Today's Attendance</h4>
          <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
            {attendance.slice(0, 15).map((a) => (
              <div key={a.id} className="rounded-xl border border-ink/10 p-2 text-xs">
                <p className="font-medium">{a.frequentVisitor?.name} | {a.checkedOutAt ? "OUT" : <span className="text-tide">IN</span>}</p>
                <p className="text-ink/60">In: {new Date(a.checkedInAt).toLocaleTimeString()}{a.checkedOutAt ? ` · Out: ${new Date(a.checkedOutAt).toLocaleTimeString()}` : ""}</p>
              </div>
            ))}
          </div>
        </article>

        {/* OTP Invite Verify */}
        <article className="panel">
          <h3 className="mb-3 text-lg font-semibold">OTP Invite Verification</h3>
          <p className="mb-3 text-sm text-ink/70">Enter the 6-digit OTP from the resident's invite to admit a pre-approved guest.</p>
          <form className="space-y-3" onSubmit={verifyOtp}>
            <input
              className="input text-center text-2xl font-mono tracking-widest"
              placeholder="000000"
              maxLength={6}
              value={inviteOtp}
              onChange={(e) => setInviteOtp(e.target.value.replace(/\D/g, ""))}
              required
            />
            <button type="submit" className="button-primary w-full">Verify &amp; Admit Guest</button>
          </form>

          {inviteResult && (
            <div className="mt-4 rounded-xl bg-tide/10 p-4">
              <p className="font-semibold text-tide">✓ Admitted: {inviteResult.invite?.guestName}</p>
              <p className="text-sm">Flat: {inviteResult.visitorLog?.flat?.block}-{inviteResult.visitorLog?.flat?.flatNumber}</p>
              <p className="text-xs text-ink/60">Visitor log #{inviteResult.visitorLog?.id} created automatically</p>
            </div>
          )}
        </article>
      </section>

      {/* Parking Management */}
      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Parking Slot Control</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {parkingSlots.map((slot) => {
            const occupied = slot.allocations?.length > 0;
            const alloc = slot.allocations?.[0];
            return (
              <div key={slot.id} className={`rounded-xl border p-3 text-sm ${occupied ? "border-signal/40 bg-signal/5" : "border-tide/40 bg-tide/5"}`}>
                <p className="font-bold text-base">{slot.slotNumber}</p>
                <p className="text-xs text-ink/60">{slot.type}{slot.block ? ` · ${slot.block}` : ""}</p>
                {occupied ? (
                  <>
                    <p className="mt-1 font-semibold">{alloc.vehicleNo}</p>
                    <p className="text-xs text-ink/60">{alloc.purpose} | {new Date(alloc.allocatedAt).toLocaleTimeString()}</p>
                    <button type="button" className="mt-2 rounded-lg bg-signal px-3 py-1 text-xs text-paper w-full" onClick={() => release(slot.id)}>Release Slot</button>
                  </>
                ) : (
                  <button type="button" className="mt-2 rounded-lg bg-tide px-3 py-1 text-xs text-paper w-full" onClick={() => allocate(slot.id)}>Assign Vehicle</button>
                )}
              </div>
            );
          })}
          {parkingSlots.length === 0 && <p className="col-span-4 text-sm text-ink/60">No parking slots configured. Admin needs to add slots.</p>}
        </div>
      </section>
    </div>
  );
}

export default SecurityModulesPage;
