import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Tag,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  fetchDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  type Discount,
  type DiscountPayload,
} from "../lib/supabase";

// ─── Catalog data ─────────────────────────────────────────────────────────────
// Must stay in sync with api/_shared/catalog.ts

const PROPERTIES = [
  { slug: "premier-pool-house", name: "Premier Pool House" },
  { slug: "premier-patio",      name: "Premier Patio" },
] as const;

const RATE_LABELS_BY_PROPERTY: Record<string, string[]> = {
  "premier-pool-house": [
    "Day Basic",
    "Day Premium",
    "Night Basic",
    "Night Premium",
    "Platinum",
    "Day Time",
    "Night Time",
    "Overnight",
  ],
  "premier-patio": [
    "Day Premium",
    "Night Premium",
    "Overnight Platinum",
  ],
};

// Labels that appear under more than one property slug
const _labelPropertyMap = new Map<string, Set<string>>();
for (const [slug, labels] of Object.entries(RATE_LABELS_BY_PROPERTY)) {
  for (const lbl of labels) {
    if (!_labelPropertyMap.has(lbl)) _labelPropertyMap.set(lbl, new Set());
    _labelPropertyMap.get(lbl)!.add(slug);
  }
}
const CROSS_PROPERTY_LABELS = new Set(
  [..._labelPropertyMap.entries()]
    .filter(([, props]) => props.size > 1)
    .map(([lbl]) => lbl),
);

// ─── Status ───────────────────────────────────────────────────────────────────

type DiscountStatus = "active" | "upcoming" | "inactive" | "expired";

function getStatus(d: Discount): DiscountStatus {
  const today = new Date().toISOString().split("T")[0];
  if (d.end_date < today) return "expired";
  if (!d.active) return "inactive";
  if (d.start_date > today) return "upcoming";
  return "active";
}

const STATUS_CONFIG: Record<DiscountStatus, { label: string; cls: string }> = {
  active:   { label: "Active",   cls: "bg-green-50 text-green-700 border-green-200" },
  upcoming: { label: "Upcoming", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  inactive: { label: "Inactive", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  expired:  { label: "Expired",  cls: "bg-[#f5f0e8] text-[#8a8a7a] border-[#e0d8ce]" },
};

// ─── Display helpers ──────────────────────────────────────────────────────────

function scopeDisplay(d: Discount): string {
  if (d.applies_to === "all") return "All bookings";
  if (d.applies_to === "property") {
    const names = (d.property_ids ?? []).map(
      (slug) => PROPERTIES.find((p) => p.slug === slug)?.name ?? slug,
    );
    return names.join(", ") || "—";
  }
  const labels = d.rate_labels ?? [];
  if (labels.length === 0) return "—";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels[0]}, +${labels.length - 1} more`;
}

function fmtDate(iso: string): string {
  const [y, m, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, day, 12)));
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  percentage: string;
  applies_to: "all" | "property" | "rate";
  property_ids: string[];
  rate_labels: string[];
  start_date: string;
  end_date: string;
  active: boolean;
}

function emptyForm(): FormState {
  return {
    name: "",
    percentage: "",
    applies_to: "all",
    property_ids: [],
    rate_labels: [],
    start_date: "",
    end_date: "",
    active: true,
  };
}

function discountToForm(d: Discount): FormState {
  return {
    name: d.name,
    percentage: String(d.percentage),
    applies_to: d.applies_to,
    property_ids: d.property_ids ?? [],
    rate_labels: d.rate_labels ?? [],
    start_date: d.start_date,
    end_date: d.end_date,
    active: d.active,
  };
}

function formToPayload(form: FormState): DiscountPayload {
  return {
    name: form.name.trim(),
    percentage: Number(form.percentage),
    applies_to: form.applies_to,
    property_ids: form.applies_to === "property" ? form.property_ids : null,
    rate_labels:  form.applies_to === "rate"     ? form.rate_labels  : null,
    start_date: form.start_date,
    end_date:   form.end_date,
    active: form.active,
  };
}

// ─── Overlap check ────────────────────────────────────────────────────────────

function hasOverlappingAllDiscount(
  discounts: Discount[],
  startDate: string,
  endDate: string,
  editingId?: string,
): boolean {
  if (!startDate || !endDate) return false;
  return discounts.some(
    (d) =>
      d.id !== editingId &&
      d.active &&
      d.applies_to === "all" &&
      getStatus(d) !== "expired" &&
      d.start_date <= endDate &&
      d.end_date >= startDate,
  );
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const INPUT_CLS =
  "w-full rounded-lg border border-[#e9e2d7] bg-white px-3 py-2.5 text-sm text-[#1a1a1a] outline-none transition-colors focus:border-[#c9a96e] focus:shadow-[0_0_0_3px_rgba(201,169,110,0.10)]";
const INPUT_ERR =
  "border-red-300 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.08)]";
const LABEL_CLS =
  "block text-[10px] tracking-widest uppercase text-[#8a8a7a] mb-1.5";

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ discount }: { discount: Discount }) {
  const { label, cls } = STATUS_CONFIG[getStatus(discount)];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}
      style={{ fontFamily: "Jost, sans-serif" }}
    >
      {label}
    </span>
  );
}

// ─── PropertySelector ─────────────────────────────────────────────────────────

function PropertySelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(slug: string) {
    onChange(
      selected.includes(slug)
        ? selected.filter((s) => s !== slug)
        : [...selected, slug],
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {PROPERTIES.map((p) => (
        <label
          key={p.slug}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <input
            type="checkbox"
            checked={selected.includes(p.slug)}
            onChange={() => toggle(p.slug)}
            className="h-3.5 w-3.5 rounded border-[#d8c3a0] accent-[#c9a96e] cursor-pointer"
          />
          <span
            className="text-sm text-[#1a1a1a] group-hover:text-[#c9a96e] transition-colors"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            {p.name}
          </span>
        </label>
      ))}
    </div>
  );
}

// ─── RateLabelSelector ────────────────────────────────────────────────────────

function RateLabelSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (labels: string[]) => void;
}) {
  function toggle(label: string) {
    onChange(
      selected.includes(label)
        ? selected.filter((l) => l !== label)
        : [...selected, label],
    );
  }

  const hasCrossPropertyWarning = selected.some((l) =>
    CROSS_PROPERTY_LABELS.has(l),
  );

  return (
    <div className="flex flex-col gap-4">
      {PROPERTIES.map((p) => {
        const labels = RATE_LABELS_BY_PROPERTY[p.slug] ?? [];
        return (
          <div key={p.slug}>
            <p
              className="mb-2 text-[9px] uppercase tracking-widest text-[#a0988b]"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              {p.name}
            </p>
            <div className="flex flex-col gap-1.5">
              {labels.map((label) => (
                <label
                  key={`${p.slug}:${label}`}
                  className="flex items-center gap-2.5 cursor-pointer group select-none"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(label)}
                    onChange={() => toggle(label)}
                    className="h-3.5 w-3.5 rounded border-[#d8c3a0] accent-[#c9a96e] cursor-pointer"
                  />
                  <span
                    className="text-sm text-[#1a1a1a] group-hover:text-[#c9a96e] transition-colors"
                    style={{ fontFamily: "Jost, sans-serif" }}
                  >
                    {label}
                    {CROSS_PROPERTY_LABELS.has(label) && (
                      <span className="ml-1.5 text-[9px] text-[#b0a898]">
                        · multi-property
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {hasCrossPropertyWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle
            size={12}
            color="#d97706"
            className="mt-0.5 shrink-0"
          />
          <p
            className="text-[11px] text-amber-700 leading-relaxed"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            One or more selected labels exist in both properties. This discount
            will apply to all matching bookings regardless of property.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── DiscountFormModal ────────────────────────────────────────────────────────

function DiscountFormModal({
  editing,
  discounts,
  onSave,
  onClose,
}: {
  editing: Discount | null;
  discounts: Discount[];
  onSave: (payload: DiscountPayload) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    editing ? discountToForm(editing) : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Name is required.";
    const pct = Number(form.percentage);
    if (!form.percentage || isNaN(pct) || pct < 1 || pct > 100)
      errs.percentage = "Enter a number between 1 and 100.";
    if (!form.start_date) errs.start_date = "Start date is required.";
    if (!form.end_date) errs.end_date = "End date is required.";
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      errs.end_date = "End date must be on or after start date.";
    if (form.applies_to === "property" && form.property_ids.length === 0)
      errs.property_ids = "Select at least one property.";
    if (form.applies_to === "rate" && form.rate_labels.length === 0)
      errs.rate_labels = "Select at least one rate label.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const showOverlapWarning = hasOverlappingAllDiscount(
    discounts,
    form.start_date,
    form.end_date,
    editing?.id,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(formToPayload(form));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[rgba(12,12,10,0.52)] backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.22 }}
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-[#fcfaf7] shadow-[0_32px_90px_rgba(20,18,14,0.24)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#ede8df] px-6 py-5">
          <div>
            <p className="section-label text-[9px]">
              {editing ? "Edit" : "New"} Discount
            </p>
            <h3
              style={{
                fontFamily: "Cormorant Garamond, serif",
                fontSize: "1.4rem",
                fontWeight: 400,
                color: "#1a1a1a",
                lineHeight: 1.1,
              }}
            >
              {editing ? "Edit Discount" : "Create Discount"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-[#ece5da] bg-white/80 p-1.5 text-[#8a8a7a] hover:border-[#d8c3a0] transition-colors disabled:opacity-40"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
          {/* Name */}
          <div>
            <label className={LABEL_CLS}>Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Holy Week Promo"
              className={`${INPUT_CLS} ${errors.name ? INPUT_ERR : ""}`}
              style={{ fontFamily: "Jost, sans-serif" }}
            />
            {errors.name && (
              <p className="mt-1 text-[11px] text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Percentage */}
          <div>
            <label className={LABEL_CLS}>Discount Percentage *</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                step="0.01"
                value={form.percentage}
                onChange={(e) => set("percentage", e.target.value)}
                placeholder="e.g. 10"
                className={`${INPUT_CLS} ${errors.percentage ? INPUT_ERR : ""} pr-8`}
                style={{ fontFamily: "Jost, sans-serif" }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#8a8a7a]">
                %
              </span>
            </div>
            {errors.percentage && (
              <p className="mt-1 text-[11px] text-red-500">{errors.percentage}</p>
            )}
          </div>

          {/* Scope */}
          <div>
            <label className={LABEL_CLS}>Applies To *</label>
            <select
              value={form.applies_to}
              onChange={(e) => {
                set("applies_to", e.target.value as FormState["applies_to"]);
                set("property_ids", []);
                set("rate_labels", []);
              }}
              className={`${INPUT_CLS} appearance-none cursor-pointer`}
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              <option value="all">All bookings</option>
              <option value="property">Specific properties</option>
              <option value="rate">Specific rate labels</option>
            </select>
            <p
              className="mt-1.5 text-[11px] text-[#8a8a7a]"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              {form.applies_to === "all" &&
                "Applies to every booking within the date range."}
              {form.applies_to === "property" &&
                "Applies only to bookings for the selected properties."}
              {form.applies_to === "rate" &&
                "Applies only to bookings with the selected rate labels."}
            </p>
          </div>

          {/* Property selector */}
          {form.applies_to === "property" && (
            <div>
              <label className={LABEL_CLS}>Properties *</label>
              <div className="rounded-lg border border-[#e9e2d7] bg-white p-4">
                <PropertySelector
                  selected={form.property_ids}
                  onChange={(ids) => set("property_ids", ids)}
                />
              </div>
              {errors.property_ids && (
                <p className="mt-1 text-[11px] text-red-500">{errors.property_ids}</p>
              )}
            </div>
          )}

          {/* Rate label selector */}
          {form.applies_to === "rate" && (
            <div>
              <label className={LABEL_CLS}>Rate Labels *</label>
              <div className="rounded-lg border border-[#e9e2d7] bg-white p-4">
                <RateLabelSelector
                  selected={form.rate_labels}
                  onChange={(labels) => set("rate_labels", labels)}
                />
              </div>
              {errors.rate_labels && (
                <p className="mt-1 text-[11px] text-red-500">{errors.rate_labels}</p>
              )}
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Start Date *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className={`${INPUT_CLS} ${errors.start_date ? INPUT_ERR : ""}`}
                style={{ fontFamily: "Jost, sans-serif" }}
              />
              {errors.start_date && (
                <p className="mt-1 text-[11px] text-red-500">{errors.start_date}</p>
              )}
            </div>
            <div>
              <label className={LABEL_CLS}>End Date *</label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => set("end_date", e.target.value)}
                className={`${INPUT_CLS} ${errors.end_date ? INPUT_ERR : ""}`}
                style={{ fontFamily: "Jost, sans-serif" }}
              />
              {errors.end_date && (
                <p className="mt-1 text-[11px] text-red-500">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Overlap warning (non-blocking) */}
          {showOverlapWarning && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <AlertTriangle
                size={13}
                color="#d97706"
                className="mt-0.5 shrink-0"
              />
              <p
                className="text-[11px] text-amber-700 leading-relaxed"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                Another "All bookings" discount overlaps this date range. Both
                will be evaluated — the one with the higher percentage will apply.
              </p>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[#e9e2d7] bg-white px-4 py-3">
            <div>
              <p
                className="text-sm font-medium text-[#1a1a1a]"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                Active
              </p>
              <p
                className="text-[11px] text-[#8a8a7a]"
                style={{ fontFamily: "Jost, sans-serif" }}
              >
                Discount is evaluated for qualifying bookings
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.active}
              onClick={() => set("active", !form.active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#c9a96e] focus:ring-offset-2 ${
                form.active ? "bg-[#c9a96e]" : "bg-[#d8d1c8]"
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                  form.active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 border-t border-[#ede8df] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs uppercase tracking-widest text-[#8a8a7a] hover:text-[#1a1a1a] transition-colors disabled:opacity-40"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#c9a96e] px-5 py-2.5 text-sm text-white transition-colors hover:bg-[#b89460] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              {saving && (
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              )}
              {editing ? "Save Changes" : "Create Discount"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── DiscountRow ──────────────────────────────────────────────────────────────

function DiscountRow({
  discount: d,
  togglingId,
  isExpired = false,
  onEdit,
  onToggle,
  onDelete,
}: {
  discount: Discount;
  togglingId: string | null;
  isExpired?: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      className={`border-b border-[#ede8df] last:border-0 transition-colors ${
        isExpired ? "opacity-55" : "hover:bg-[#faf8f5]"
      }`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Tag size={12} color="#c9a96e" strokeWidth={1.5} className="shrink-0" />
          <span
            className="font-medium text-[#1a1a1a] leading-snug"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            {d.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className="font-semibold text-[#c9a96e]"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          {d.percentage}%
        </span>
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        <span
          className="block truncate text-[#4a4a4a]"
          style={{ fontFamily: "Jost, sans-serif" }}
          title={scopeDisplay(d)}
        >
          {scopeDisplay(d)}
        </span>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className="text-[#4a4a4a]"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          {fmtDate(d.start_date)} – {fmtDate(d.end_date)}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge discount={d} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {/* Edit — hidden for expired */}
          {!isExpired && (
            <button
              onClick={onEdit}
              title="Edit"
              className="rounded-lg p-1.5 text-[#8a8a7a] transition-all hover:bg-[#f0e8d8] hover:text-[#c9a96e]"
            >
              <Pencil size={13} strokeWidth={1.5} />
            </button>
          )}

          {/* Toggle active */}
          <button
            onClick={onToggle}
            disabled={togglingId === d.id || isExpired}
            title={d.active ? "Deactivate" : "Activate"}
            className={`rounded-lg p-1.5 transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              d.active
                ? "text-green-600 hover:bg-red-50 hover:text-red-500"
                : "text-[#b0a898] hover:bg-green-50 hover:text-green-600"
            }`}
          >
            <Power size={13} strokeWidth={1.5} />
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            title="Delete"
            className="rounded-lg p-1.5 text-[#8a8a7a] transition-all hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── DiscountsTab (main export) ───────────────────────────────────────────────

export default function DiscountsTab() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DiscountStatus>("all");
  const [showExpired, setShowExpired] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const data = await fetchDiscounts();
    setDiscounts(data);
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(d: Discount) {
    setEditing(d);
    setModalOpen(true);
  }

  async function handleSave(payload: DiscountPayload) {
    if (editing) {
      const ok = await updateDiscount(editing.id, payload);
      if (ok) {
        setDiscounts((prev) =>
          prev.map((d) => (d.id === editing.id ? { ...d, ...payload } : d)),
        );
        toast.success("Discount updated");
        setModalOpen(false);
      } else {
        toast.error("Failed to update discount");
      }
    } else {
      const created = await createDiscount(payload);
      if (created) {
        setDiscounts((prev) => [created, ...prev]);
        toast.success("Discount created");
        setModalOpen(false);
      } else {
        toast.error("Failed to create discount");
      }
    }
  }

  async function handleToggle(d: Discount) {
    setTogglingId(d.id);
    const ok = await updateDiscount(d.id, { active: !d.active });
    if (ok) {
      setDiscounts((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, active: !d.active } : x)),
      );
      toast.success(d.active ? "Discount deactivated" : "Discount activated");
    } else {
      toast.error("Failed to update discount");
    }
    setTogglingId(null);
  }

  async function handleDelete(d: Discount) {
    if (!window.confirm(`Delete "${d.name}"? This cannot be undone.`)) return;
    const ok = await deleteDiscount(d.id);
    if (ok) {
      setDiscounts((prev) => prev.filter((x) => x.id !== d.id));
      toast.success("Discount deleted");
    } else {
      toast.error("Failed to delete discount");
    }
  }

  // Partition into live (non-expired) and expired
  const { live, expired } = useMemo(() => {
    const live: Discount[] = [];
    const expired: Discount[] = [];
    for (const d of discounts) {
      if (getStatus(d) === "expired") expired.push(d);
      else live.push(d);
    }
    return { live, expired };
  }, [discounts]);

  // Apply status filter to live rows
  const filtered = useMemo(() => {
    if (statusFilter === "all") return live;
    return live.filter((d) => getStatus(d) === statusFilter);
  }, [live, statusFilter]);

  const TABLE_HEADERS = ["Name", "Discount", "Applies To", "Date Range", "Status", ""];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className="text-[10px] tracking-widest uppercase text-[#8a8a7a]"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            Discount Rules
          </p>
          <p
            className="mt-0.5 text-[12px] text-[#7b7468]"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            The highest matching discount applies automatically per booking.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 self-start rounded-xl bg-[#c9a96e] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#b89460]"
          style={{ fontFamily: "Jost, sans-serif" }}
        >
          <Plus size={14} />
          New Discount
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "active", "upcoming", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-[11px] transition-all ${
              statusFilter === f
                ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                : "border-[#e6ddd1] bg-white text-[#8a8a7a] hover:border-[#c9a96e] hover:text-[#c9a96e]"
            }`}
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            {f === "all" ? "All" : STATUS_CONFIG[f].label}
          </button>
        ))}
      </div>

      {/* Main table */}
      <div className="overflow-hidden rounded-xl border border-[#ede8df] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#c9a96e] border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-xs"
              style={{ fontFamily: "Jost, sans-serif" }}
            >
              <thead>
                <tr className="border-b border-[#ede8df] bg-[#faf8f5]">
                  {TABLE_HEADERS.map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-[#8a8a7a]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <DiscountRow
                    key={d.id}
                    discount={d}
                    togglingId={togglingId}
                    onEdit={() => openEdit(d)}
                    onToggle={() => handleToggle(d)}
                    onDelete={() => handleDelete(d)}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={TABLE_HEADERS.length}
                      className="py-14 text-center text-[#8a8a7a]"
                      style={{ fontFamily: "Jost, sans-serif" }}
                    >
                      {statusFilter === "all"
                        ? "No discounts yet. Create one to get started."
                        : `No ${STATUS_CONFIG[statusFilter as DiscountStatus]?.label.toLowerCase()} discounts.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expired section (collapsed by default) */}
      {expired.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#ede8df] bg-white">
          <button
            onClick={() => setShowExpired((p) => !p)}
            className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#faf8f5]"
            style={{ fontFamily: "Jost, sans-serif" }}
          >
            <span className="text-[11px] text-[#8a8a7a]">
              {expired.length} expired discount
              {expired.length !== 1 ? "s" : ""}
            </span>
            {showExpired ? (
              <ChevronDown size={14} color="#8a8a7a" />
            ) : (
              <ChevronRight size={14} color="#8a8a7a" />
            )}
          </button>

          <AnimatePresence>
            {showExpired && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="overflow-x-auto border-t border-[#ede8df]">
                  <table
                    className="w-full text-xs"
                    style={{ fontFamily: "Jost, sans-serif" }}
                  >
                    <tbody>
                      {expired.map((d) => (
                        <DiscountRow
                          key={d.id}
                          discount={d}
                          togglingId={togglingId}
                          isExpired
                          onEdit={() => openEdit(d)}
                          onToggle={() => handleToggle(d)}
                          onDelete={() => handleDelete(d)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit modal */}
      <AnimatePresence>
        {modalOpen && (
          <DiscountFormModal
            editing={editing}
            discounts={discounts}
            onSave={handleSave}
            onClose={() => setModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
