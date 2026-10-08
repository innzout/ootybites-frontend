"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, MapPin, Phone } from "lucide-react";
import type { Address } from "@/types";
import {
  updateMe,
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  type AddressInput,
} from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import { validateFields, required, phoneIN, pincode } from "@/lib/validators";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { AddressFields, emptyAddress, DEFAULT_STATE } from "@/components/shop/AddressFields";

const emptyAddr = { ...emptyAddress };

export default function AccountPage() {
  const router = useRouter();
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const customer = useAuthStore((s) => s.customer);
  const setName = useAuthStore((s) => s.setName);
  const logout = useAuthStore((s) => s.logout);

  const [ready, setReady] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyAddr);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDefault, setEditingDefault] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingAddr, setSavingAddr] = useState(false);

  // If a request reports the session is gone, sign out cleanly.
  function handle401(ex: unknown): boolean {
    if (ex instanceof ApiException && ex.status === 401) {
      logout();
      router.replace("/login");
      return true;
    }
    return false;
  }

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (ready && !isAuthed) router.replace("/login");
  }, [ready, isAuthed, router]);

  function loadAddresses() {
    listAddresses()
      .then((d) => setAddresses(d.addresses ?? []))
      .catch(handle401)
      .finally(() => setLoadingAddr(false));
  }
  useEffect(() => {
    if (isAuthed) loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  async function saveName() {
    setSavingName(true);
    try {
      const me = await updateMe(nameDraft.trim());
      setName(me.name ?? "");
      setEditingName(false);
      toast.success("Profile updated");
    } catch (ex) {
      if (!handle401(ex)) toast.error(ex instanceof ApiException ? ex.message : "Could not update");
    } finally {
      setSavingName(false);
    }
  }

  function openAdd() {
    setEditingId(null);
    setEditingDefault(false);
    setForm(emptyAddr);
    setErrors({});
    setShowForm(true);
  }
  function openEdit(a: Address) {
    setEditingId(a.id);
    setEditingDefault(a.is_default);
    setForm({ name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "", city: a.city, state: a.state, pincode: a.pincode, lat: a.lat, lng: a.lng });
    setErrors({});
    setShowForm(true);
  }

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateFields(form as unknown as Record<string, string>, {
      name: [required], phone: [phoneIN], line1: [required], city: [required], state: [required], pincode: [pincode],
    });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSavingAddr(true);
    const input: AddressInput = { ...form, state: form.state || DEFAULT_STATE, is_default: editingId ? editingDefault : addresses.length === 0 };
    try {
      if (editingId) await updateAddress(editingId, input);
      else await createAddress(input);
      toast.success(editingId ? "Address updated" : "Address added");
      setShowForm(false);
      loadAddresses();
    } catch (ex) {
      if (!handle401(ex)) toast.error(ex instanceof ApiException ? ex.message : "Could not save address");
    } finally {
      setSavingAddr(false);
    }
  }

  async function makeDefault(a: Address) {
    await updateAddress(a.id, {
      name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 ?? "",
      city: a.city, state: a.state, pincode: a.pincode, is_default: true,
    }).catch(handle401);
    toast.success("Default delivery address set");
    loadAddresses();
  }
  async function removeAddress(id: string) {
    if (!(await askConfirm({ title: "Delete address?", tone: "danger", confirmText: "Delete" }))) return;
    await deleteAddress(id).catch(handle401);
    loadAddresses();
  }

  if (!ready || !isAuthed)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-ink">Your profile</h1>

      {/* Details — read mode with edit icon */}
      <Card className="mt-5 p-5">
        {!editingName ? (
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Name</p>
              <p className="mt-0.5 font-display text-lg font-bold text-ink">
                {customer?.name?.trim() || <span className="text-muted">Not set</span>}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                <Phone className="h-3.5 w-3.5" /> {customer?.phone}
              </p>
            </div>
            <button
              onClick={() => {
                setNameDraft(customer?.name ?? "");
                setEditingName(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:border-brand-400 hover:text-brand-600"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Edit name</p>
            <Input label="Name" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Your name" />
            <div className="mt-3 flex gap-2">
              <Button onClick={saveName} loading={savingName} disabled={!nameDraft.trim()}>
                Save
              </Button>
              <Button variant="ghost" onClick={() => setEditingName(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Addresses — cards with edit/delete icons; form hidden until add/edit */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Delivery addresses</h2>
        {!showForm && (
          <button onClick={openAdd} className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-brand-600">
            <Plus className="h-4 w-4" /> Add
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">Your default is used for delivery — you can change it per order at checkout.</p>

      {loadingAddr ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {addresses.length === 0 && !showForm && (
            <Card className="py-10 text-center text-sm text-muted">No saved addresses yet.</Card>
          )}
          {addresses.map((a) => (
            <Card key={a.id} className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0 text-brand-500" />
                  <p className="font-semibold text-ink">{a.name}</p>
                  {a.is_default && <Badge tone="brand">Default</Badge>}
                </div>
                <p className="mt-1 pl-6 text-sm text-muted">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} - {a.pincode}
                </p>
                <p className="pl-6 text-sm text-muted">{a.phone}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!a.is_default && (
                  <button onClick={() => makeDefault(a)} className="rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-brand-600 hover:border-brand-400">
                    Set default
                  </button>
                )}
                <button onClick={() => openEdit(a)} aria-label="Edit" className="rounded-full p-1.5 text-muted hover:bg-brand-50 hover:text-brand-600">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => removeAddress(a.id)} aria-label="Delete" className="rounded-full p-1.5 text-red-500 hover:bg-red-50">
                  ✕
                </button>
              </div>
            </Card>
          ))}

          {/* The editor is a dialog rather than a panel appended to the list: the
              form (map picker + eight fields) is taller than the viewport on a
              phone, so inline it pushed the saved addresses off-screen and the
              Save button landed below the fold. The modal also traps focus and
              closes on Escape. */}
          <Modal
            open={showForm}
            onClose={() => setShowForm(false)}
            title={editingId ? "Edit address" : "New address"}
            subtitle="Drop a pin or search, then check the details below."
            size="lg"
            footer={
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                {/* form="address-form" lets the action sit in the modal footer
                    while still submitting the form in the body. */}
                <Button type="submit" form="address-form" loading={savingAddr}>
                  {editingId ? "Save changes" : "Add address"}
                </Button>
              </div>
            }
          >
            <form
              id="address-form"
              onSubmit={saveAddress}
              // Enter inside the Places search box would otherwise submit the
              // whole address form — saving a half-filled address the moment the
              // customer pressed Enter to pick a suggestion. Swallow it there;
              // every other field keeps normal Enter-to-submit.
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                const el = e.target as HTMLElement | null;
                if (el?.closest(".ob-place-autocomplete")) e.preventDefault();
              }}
            >
              <AddressFields value={form} set={(patch) => setForm((f) => ({ ...f, ...patch }))} errors={errors} />
            </form>
          </Modal>
        </div>
      )}

      <div className="mt-8">
        <Button variant="outline" onClick={() => { logout(); router.push("/"); }}>
          Log out
        </Button>
      </div>
    </div>
  );
}
