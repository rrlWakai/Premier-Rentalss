export const STATUS_TAILWIND: Record<string, string> = {
  confirmed: "text-green-600 bg-green-50 border-green-200",
  pending:   "text-amber-600 bg-amber-50 border-amber-200",
  cancelled: "text-red-500 bg-red-50 border-red-200",
  completed: "text-purple-600 bg-purple-50 border-purple-200",
};

export const STATUS_HEX: Record<string, string> = {
  confirmed: "#22c55e",
  pending:   "#f59e0b",
  cancelled: "#ef4444",
  completed: "#8b5cf6",
};

export const PAYMENT_ACTIVE_CLS: Record<string, string> = {
  paid:     "bg-green-50 text-green-600 border-green-200",
  unpaid:   "bg-amber-50 text-amber-600 border-amber-200",
  refunded: "bg-blue-50 text-blue-600 border-blue-200",
  failed:   "bg-red-50 text-red-500 border-red-200",
  partial:  "bg-orange-50 text-orange-500 border-orange-200",
};

export const PAYMENT_TEXT_CLS: Record<string, string> = {
  paid:     "text-green-600",
  unpaid:   "text-amber-500",
  refunded: "text-blue-500",
  failed:   "text-red-500",
  partial:  "text-orange-500",
};
