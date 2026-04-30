import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";

const flatInitial = { block: "", flatNumber: "" };
const memberInitial = { name: "", email: "", phone: "", password: "" };
const PAGE_SIZE = 8;

function AdminFlatDetailsPage() {
  const [flats, setFlats] = useState([]);
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({ block: "", flatNumber: "", q: "" });
  const [activeModal, setActiveModal] = useState(null);
  const [editingFlat, setEditingFlat] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [flatForm, setFlatForm] = useState(flatInitial);
  const [memberForm, setMemberForm] = useState(memberInitial);
  const [newFlatMembers, setNewFlatMembers] = useState([memberInitial]);
  const [ownerIndex, setOwnerIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchFlats = async () => {
    const { data } = await api.get("/admin/flats");
    setFlats(data);
  };

  const fetchMembers = async (nextFilters = filters) => {
    const params = Object.fromEntries(Object.entries(nextFilters).filter(([, value]) => value));
    const { data } = await api.get("/admin/members", { params });
    setMembers(data);
  };

  const fetchAll = async () => {
    await Promise.all([fetchFlats(), fetchMembers({ block: "", flatNumber: "" })]);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const groupedFlats = useMemo(() => {
    const memberMap = new Map();
    for (const item of members) {
      const list = memberMap.get(item.flat?.id) || [];
      list.push(item);
      memberMap.set(item.flat?.id, list);
    }

    const all = flats.map((flat) => {
      const list = (memberMap.get(flat.id) || []).slice().sort((a, b) => (a.user?.id || 0) - (b.user?.id || 0));
      const owner = list.find((member) => member.isOwner) || list[0] || null;
      const others = list.filter((member) => member.id !== owner?.id);
      return { flat, owner, others, members: list };
    });

    const filtered = all.filter((item) => {
      if (filters.block && item.flat.block.toLowerCase() !== filters.block.toLowerCase()) {
        return false;
      }
      if (filters.flatNumber && item.flat.flatNumber.toLowerCase() !== filters.flatNumber.toLowerCase()) {
        return false;
      }
      if (!filters.q) {
        return true;
      }

      const needle = filters.q.toLowerCase();
      return item.members.some((member) => {
        const name = member.user?.name?.toLowerCase() || "";
        const phone = member.user?.phone?.toLowerCase() || "";
        const email = member.user?.email?.toLowerCase() || "";
        return name.includes(needle) || phone.includes(needle) || email.includes(needle);
      });
    });

    return filtered;
  }, [flats, members]);

  const totalPages = Math.max(1, Math.ceil(groupedFlats.length / PAGE_SIZE));
  const pagedFlats = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return groupedFlats.slice(start, start + PAGE_SIZE);
  }, [groupedFlats, currentPage]);

  const flatMemberValidation = useMemo(() => {
    return newFlatMembers.map((member) => {
      const errors = {};
      if (!member.name.trim()) {
        errors.name = "Name is required";
      }
      if (!member.password.trim()) {
        errors.password = "Password is required";
      } else if (member.password.trim().length < 6) {
        errors.password = "Password must be at least 6 characters";
      }
      if (!member.email.trim() && !member.phone.trim()) {
        errors.contact = "Enter either email or phone";
      }
      return errors;
    });
  }, [newFlatMembers]);

  const canSaveNewFlat = useMemo(() => {
    if (!flatForm.block.trim() || !flatForm.flatNumber.trim()) {
      return false;
    }

    return flatMemberValidation.every((errors) => Object.keys(errors).length === 0);
  }, [flatForm.block, flatForm.flatNumber, flatMemberValidation]);

  const openAddFlat = () => {
    setError("");
    setMessage("");
    setEditingFlat(null);
    setFlatForm(flatInitial);
    setNewFlatMembers([memberInitial]);
    setOwnerIndex(0);
    setActiveModal("flat");
  };

  const openEditFlat = (flat) => {
    setError("");
    setMessage("");
    setEditingFlat(flat);
    setFlatForm({ block: flat.block, flatNumber: flat.flatNumber });
    setActiveModal("flat");
  };

  const openAddMember = () => {
    setError("");
    setMessage("");
    setEditingMember(null);
    setMemberForm({ ...memberInitial, flatId: "", isOwner: false });
    setActiveModal("member");
  };

  const openEditMember = (member) => {
    setError("");
    setMessage("");
    setEditingMember(member);
    setMemberForm({
      name: member.user?.name || "",
      email: member.user?.email || "",
      phone: member.user?.phone || "",
      password: "",
      flatId: String(member.flat?.id || ""),
      isOwner: Boolean(member.isOwner),
    });
    setActiveModal("member");
  };

  const closeModal = () => setActiveModal(null);

  const onFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onFilterSubmit = async (e) => {
    e.preventDefault();
    await fetchMembers(filters);
    setCurrentPage(1);
  };

  const onFlatFormChange = (e) => {
    setFlatForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onMemberFormChange = (e) => {
    setMemberForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onMemberCountChange = (e) => {
    const count = Number(e.target.value);
    const next = Array.from({ length: count }, (_, index) => newFlatMembers[index] || { ...memberInitial });
    setNewFlatMembers(next);
    if (ownerIndex >= count) {
      setOwnerIndex(0);
    }
  };

  const onFlatMemberChange = (index, key, value) => {
    setNewFlatMembers((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  const saveFlat = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (editingFlat) {
        await api.patch(`/admin/flats/${editingFlat.id}`, flatForm);
        setMessage("Flat updated successfully.");
      } else {
        const membersPayload = newFlatMembers.map((member, index) => ({
          name: member.name,
          email: member.email || undefined,
          phone: member.phone || undefined,
          password: member.password,
          isOwner: index === ownerIndex,
        }));

        const invalidMember = membersPayload.find(
          (member) => !member.name || !member.password || (!member.email && !member.phone)
        );

        if (invalidMember) {
          setError("Each member needs name, password, and either email or phone.");
          return;
        }

        await api.post("/admin/flats-with-members", {
          block: flatForm.block,
          flatNumber: flatForm.flatNumber,
          members: membersPayload,
        });
        setMessage("Flat added successfully.");
      }
      closeModal();
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save flat.");
    }
  };

  const deleteFlat = async (flatId) => {
    const confirmed = window.confirm("Delete this flat? This should be used only when no members are linked.");
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/flats/${flatId}`);
      setMessage("Flat removed successfully.");
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove flat.");
    }
  };

  const saveMember = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const payload = {
      name: memberForm.name,
      email: memberForm.email || undefined,
      phone: memberForm.phone || undefined,
      flatId: Number(memberForm.flatId),
      isOwner: Boolean(memberForm.isOwner),
    };

    if (!editingMember || memberForm.password) {
      payload.password = memberForm.password;
    }

    try {
      if (editingMember) {
        await api.patch(`/admin/members/${editingMember.user?.id}`, payload);
        setMessage("Member updated successfully.");
      } else {
        await api.post("/admin/members", payload);
        setMessage("Member added successfully.");
      }
      closeModal();
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save member.");
    }
  };

  const deleteMember = async (member) => {
    const confirmed = window.confirm(`Remove member ${member.user?.name}?`);
    if (!confirmed) return;

    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/members/${member.user?.id}`);
      setMessage("Member removed successfully.");
      await fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to remove member.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Flat Details</h2>
          <p className="text-sm text-ink/70">Manage flats, owners, and members by block and flat number.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="button-primary" onClick={openAddFlat}>Add New Flat</button>
          <button type="button" className="button-accent" onClick={openAddMember}>Add Member To Existing Flat</button>
        </div>
      </section>

      {message ? <p className="rounded-xl bg-tide/10 px-4 py-2 text-sm text-tide">{message}</p> : null}
      {error ? <p className="rounded-xl bg-signal/10 px-4 py-2 text-sm text-signal">{error}</p> : null}

      <section className="panel">
        <h3 className="mb-3 text-lg font-semibold">Filter Flats</h3>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={onFilterSubmit}>
          <input className="input" name="block" placeholder="Block" value={filters.block} onChange={onFilterChange} />
          <input className="input" name="flatNumber" placeholder="Flat Number" value={filters.flatNumber} onChange={onFilterChange} />
          <input className="input" name="q" placeholder="Search member name / phone" value={filters.q} onChange={onFilterChange} />
          <button type="submit" className="button-primary">Apply</button>
        </form>
      </section>

      <section className="panel overflow-x-auto">
        <h3 className="mb-3 text-lg font-semibold">All Flat Details</h3>
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="py-2">Block</th>
              <th className="py-2">Flat No</th>
              <th className="py-2">Owner Name</th>
              <th className="py-2">Owner Contact</th>
              <th className="py-2">Other Members</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedFlats.map((item) => (
              <tr key={item.flat.id} className="border-b border-ink/5 align-top">
                <td className="py-2">{item.flat.block}</td>
                <td className="py-2">{item.flat.flatNumber}</td>
                <td className="py-2">{item.owner?.user?.name || "-"}</td>
                <td className="py-2">{item.owner?.user?.phone || item.owner?.user?.email || "-"}</td>
                <td className="py-2">
                  {item.others.length === 0 ? "-" : item.others.map((m) => `${m.user?.name} (${m.user?.phone || m.user?.email || "-"})`).join(", ")}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-xs" onClick={() => openEditFlat(item.flat)}>Edit Flat</button>
                    <button type="button" className="rounded-lg bg-signal px-3 py-1 text-xs text-paper" onClick={() => deleteFlat(item.flat.id)}>Remove Flat</button>
                    {item.members.map((member) => (
                      <div key={member.id} className="flex items-center gap-1 rounded-lg border border-ink/10 px-2 py-1">
                        <span className="text-xs">{member.user?.name}{member.isOwner ? " (Owner)" : ""}</span>
                        {!member.isOwner ? (
                          <button type="button" className="rounded border border-ink/20 px-1 text-[10px]" onClick={() => api.patch(`/admin/members/${member.user?.id}`, { isOwner: true }).then(fetchAll)}>Owner</button>
                        ) : null}
                        <button type="button" className="rounded border border-ink/20 px-1 text-[10px]" onClick={() => openEditMember(member)}>E</button>
                        <button type="button" className="rounded bg-signal px-1 text-[10px] text-paper" onClick={() => deleteMember(member)}>D</button>
                      </div>
                    ))}
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
              <h3 className="text-xl font-semibold">{activeModal === "flat" ? (editingFlat ? "Edit Flat" : "Add New Flat") : (editingMember ? "Edit Member" : "Add New Member")}</h3>
              <button type="button" className="rounded-lg border border-ink/20 px-3 py-1 text-sm" onClick={closeModal}>Close</button>
            </div>

            {activeModal === "flat" ? (
              <form className="space-y-3" onSubmit={saveFlat}>
                <input className="input" name="block" placeholder="Block" value={flatForm.block} onChange={onFlatFormChange} required />
                <input className="input" name="flatNumber" placeholder="Flat Number" value={flatForm.flatNumber} onChange={onFlatFormChange} required />

                {!editingFlat ? (
                  <>
                    <select className="input" value={newFlatMembers.length} onChange={onMemberCountChange}>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((count) => (
                        <option key={count} value={count}>{count} members</option>
                      ))}
                    </select>

                    <select className="input" value={ownerIndex} onChange={(e) => setOwnerIndex(Number(e.target.value))}>
                      {newFlatMembers.map((_, index) => (
                        <option key={index} value={index}>Owner: Member {index + 1}</option>
                      ))}
                    </select>

                    <div className="max-h-[340px] space-y-3 overflow-y-auto rounded-xl border border-ink/10 p-3">
                      {newFlatMembers.map((member, index) => (
                        <div key={index} className="space-y-2 rounded-lg border border-ink/10 p-3">
                          <p className="text-sm font-semibold">Member {index + 1}{ownerIndex === index ? " (Owner)" : ""}</p>
                          <input className="input" placeholder="Name" value={member.name} onChange={(e) => onFlatMemberChange(index, "name", e.target.value)} required />
                          {flatMemberValidation[index]?.name ? <p className="text-xs text-signal">{flatMemberValidation[index].name}</p> : null}
                          <input className="input" placeholder="Email" value={member.email} onChange={(e) => onFlatMemberChange(index, "email", e.target.value)} />
                          <input className="input" placeholder="Phone" value={member.phone} onChange={(e) => onFlatMemberChange(index, "phone", e.target.value)} />
                          {flatMemberValidation[index]?.contact ? <p className="text-xs text-signal">{flatMemberValidation[index].contact}</p> : null}
                          <input className="input" type="password" placeholder="Password" value={member.password} onChange={(e) => onFlatMemberChange(index, "password", e.target.value)} required />
                          {flatMemberValidation[index]?.password ? <p className="text-xs text-signal">{flatMemberValidation[index].password}</p> : null}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                {!editingFlat && !canSaveNewFlat ? <p className="text-xs text-ink/60">Complete block, flat number, and all generated member details to enable Save Flat.</p> : null}
                <button type="submit" className="button-primary w-full" disabled={!editingFlat && !canSaveNewFlat}>Save Flat</button>
              </form>
            ) : null}

            {activeModal === "member" ? (
              <form className="space-y-3" onSubmit={saveMember}>
                <input className="input" name="name" placeholder="Full Name" value={memberForm.name} onChange={onMemberFormChange} required />
                <input className="input" name="email" placeholder="Email" value={memberForm.email} onChange={onMemberFormChange} />
                <input className="input" name="phone" placeholder="Phone" value={memberForm.phone} onChange={onMemberFormChange} />
                <input className="input" type="password" name="password" placeholder={editingMember ? "New Password (optional)" : "Temporary Password"} value={memberForm.password} onChange={onMemberFormChange} required={!editingMember} />
                <select className="input" name="flatId" value={memberForm.flatId} onChange={onMemberFormChange} required>
                  <option value="">Select Flat</option>
                  {flats.map((flat) => (
                    <option key={flat.id} value={flat.id}>{flat.block}-{flat.flatNumber}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isOwner" checked={Boolean(memberForm.isOwner)} onChange={(e) => setMemberForm((prev) => ({ ...prev, isOwner: e.target.checked }))} />
                  Set as flat owner
                </label>
                <button type="submit" className="button-primary w-full">Save Member</button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminFlatDetailsPage;
