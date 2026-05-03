import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-gray-700 text-gray-300 border-gray-600",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-600/20 text-blue-400 border-blue-500/30",
  },
  awaiting_approval: {
    label: "Awaiting Review",
    className: "bg-amber-600/20 text-amber-400 border-amber-500/30",
  },
  approved: {
    label: "Approved",
    className: "bg-green-600/20 text-green-400 border-green-500/30",
  },
  deployed: {
    label: "Deployed",
    className: "bg-indigo-600/20 text-indigo-400 border-indigo-500/30",
  },
  failed: {
    label: "Failed",
    className: "bg-red-600/20 text-red-400 border-red-500/30",
  },
};

export default function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    className: "bg-gray-700 text-gray-300 border-gray-600",
  };
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium px-2 py-0.5 border", cfg.className)}
    >
      {cfg.label}
    </Badge>
  );
}
