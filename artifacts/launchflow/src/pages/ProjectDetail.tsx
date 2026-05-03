import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  getGetProjectQueryOptions,
  useRunProjectAgents,
  useApproveProject,
  useUpdateProjectAsset,
  getListProjectAssetsQueryOptions,
  getListProjectCompetitorsQueryOptions,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  Globe,
  DollarSign,
  Users,
  FileText,
  BarChart2,
  ThumbsUp,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";

// ─── Elapsed Timer Hook ───────────────────────────────────────────────────────

function useElapsedTimer(startedAt: string | null | undefined, active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !startedAt) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
      return;
    }
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, startedAt]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ─── Asset Types ──────────────────────────────────────────────────────────────

interface AssetItem {
  id: string;
  title: string;
  assetType: string;
  content: string;
  isApproved: boolean;
  modelUsed?: string;
  tokensUsed?: number;
}

// ─── Approval Modal ───────────────────────────────────────────────────────────

function ApprovalModal({
  projectId,
  onClose,
  onApprove,
  isPending,
}: {
  projectId: string;
  onClose: () => void;
  onApprove: () => void;
  isPending: boolean;
}) {
  const [confirmInput, setConfirmInput] = useState("");
  const { data } = useQuery(getListProjectAssetsQueryOptions(projectId));
  const assets = (data as { assets?: AssetItem[] })?.assets ?? [];
  const checkableAssets = assets.filter((a) => a.assetType !== "landing_page_html");

  const [checked, setChecked] = useState<Set<string>>(new Set());
  useEffect(() => {
    setChecked(new Set(checkableAssets.map((a) => a.id)));
  }, [checkableAssets.length]);

  const canApprove = confirmInput === "APPROVE" && !isPending;

  const assetTypeLabel: Record<string, string> = {
    positioning_doc: "Positioning Doc",
    meta_ad_copy: "Meta Ad Copy (3 Variants)",
    cold_email_sequence: "Cold Email Sequence",
    social_post: "Social Media Posts",
    landing_page_html: "Landing Page HTML",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-[#0d0f16] border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="text-center space-y-2 pb-1">
            <div className="text-4xl mb-1">⚠️</div>
            <h2 className="text-xl font-bold text-white">Final Approval Required</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Review all generated assets below. Once confirmed, this strategy will be marked as approved and deployed.
            </p>
          </div>

          {/* Asset checklist */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-3">
              Generated Assets
            </p>
            {checkableAssets.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
              </div>
            ) : (
              checkableAssets.map((asset) => (
                <label
                  key={asset.id}
                  className="flex items-center gap-3 p-3 bg-gray-800/60 border border-gray-700/50 rounded-xl cursor-pointer hover:bg-gray-800 transition-colors select-none"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(asset.id)}
                    onChange={(e) => {
                      const next = new Set(checked);
                      e.target.checked ? next.add(asset.id) : next.delete(asset.id);
                      setChecked(next);
                    }}
                    className="w-4 h-4 rounded accent-indigo-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{asset.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {assetTypeLabel[asset.assetType] ?? asset.assetType}
                    </p>
                  </div>
                  {asset.isApproved && (
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  )}
                </label>
              ))
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-gray-800" />

          {/* Confirm input */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Type{" "}
              <span className="font-mono font-bold text-white bg-gray-800 px-1.5 py-0.5 rounded text-xs">
                APPROVE
              </span>{" "}
              to confirm
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Type APPROVE to confirm"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-1">
            <Button
              onClick={onApprove}
              disabled={!canApprove}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-35 disabled:cursor-not-allowed text-white font-semibold gap-2 text-sm"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              Approve &amp; Deploy Strategy
            </Button>
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors py-2 min-h-[44px]"
            >
              Not Yet — Continue Reviewing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const prevAwaitingRef = useRef(false);

  const { data: project, isLoading, refetch } = useQuery({
    ...getGetProjectQueryOptions(id!),
    refetchInterval: (query) => {
      const status = (query.state.data as { status?: string })?.status;
      return status === "processing" ? 3000 : false;
    },
  });

  const p = project as
    | (typeof project & {
        productName: string;
        productDescription: string;
        targetAudience: string;
        websiteUrl?: string;
        budget?: string;
        status: string;
        createdAt: string;
        positioningStatement?: string;
        isApprovedByHuman: boolean;
        competitorAgentStatus: string;
        marketingAgentStatus: string;
        landingPageAgentStatus: string;
        processingStartedAt?: string;
      })
    | undefined;

  const awaitingApproval = p?.status === "awaiting_approval";
  const isApproved = (p?.isApprovedByHuman || p?.status === "approved") ?? false;

  // Auto-open modal the first time status transitions to awaiting_approval
  useEffect(() => {
    if (awaitingApproval && !isApproved && !prevAwaitingRef.current) {
      setModalOpen(true);
    }
    prevAwaitingRef.current = awaitingApproval && !isApproved;
  }, [awaitingApproval, isApproved]);

  const runAgentsMutation = useRunProjectAgents({
    mutation: {
      onSuccess: () => {
        toast({ title: "Agents started!", description: "This may take a moment..." });
        refetch();
      },
      onError: () => {
        toast({ title: "Failed to start agents", variant: "destructive" });
      },
    },
  });

  const approveMutation = useApproveProject({
    mutation: {
      onSuccess: () => {
        toast({ title: "✅ Strategy approved and deployed!" });
        setModalOpen(false);
        qc.invalidateQueries({ queryKey: ["projects"] });
        refetch();
      },
      onError: () => {
        toast({ title: "Failed to approve project", variant: "destructive" });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48 bg-gray-900" />
        <Skeleton className="h-48 w-full bg-gray-900" />
        <Skeleton className="h-64 w-full bg-gray-900" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-gray-400">Project not found.</p>
        <Link href="/projects">
          <a className="text-indigo-400 text-sm mt-2 inline-block">← Back to projects</a>
        </Link>
      </div>
    );
  }

  const canRunAgents = p.status === "pending";
  const isProcessing = p.status === "processing";

  return (
    <>
      {/* Approval Modal */}
      {modalOpen && awaitingApproval && !isApproved && (
        <ApprovalModal
          projectId={id!}
          onClose={() => setModalOpen(false)}
          onApprove={() => approveMutation.mutate({ projectId: id!, data: { approved: true } })}
          isPending={approveMutation.isPending}
        />
      )}

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Link href="/projects">
            <a className="text-gray-400 hover:text-gray-200 transition-colors mt-1 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2">
              <ArrowLeft className="w-4 h-4" />
            </a>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-semibold text-white break-words">{p.productName}</h1>
              <StatusBadge status={p.status} />
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Created {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
            {canRunAgents && (
              <Button
                onClick={() => runAgentsMutation.mutate({ projectId: id! })}
                disabled={runAgentsMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs sm:text-sm h-10 sm:h-auto"
              >
                {runAgentsMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Run AI Agents</span>
                <span className="sm:hidden">Run</span>
              </Button>
            )}
            {isProcessing && (
              <Button disabled variant="outline" className="border-gray-700 text-gray-400 gap-1.5 text-xs sm:text-sm h-10">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Agents Running...</span>
                <span className="sm:hidden">Running...</span>
              </Button>
            )}
            {awaitingApproval && !isApproved && (
              <Button
                onClick={() => setModalOpen(true)}
                className="bg-green-600 hover:bg-green-500 text-white gap-1.5 text-xs sm:text-sm h-10"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Approve Strategy</span>
                <span className="sm:hidden">Approve</span>
              </Button>
            )}
            {isApproved && (
              <Badge className="bg-green-600/20 text-green-400 border border-green-500/30 px-3 py-1.5 text-xs flex items-center gap-1.5 h-10 sm:h-auto">
                <CheckCircle className="w-3.5 h-3.5" />
                Approved
              </Badge>
            )}
          </div>
        </div>

        {/* Banners */}
        {isProcessing && (
          <ProcessingBanner startedAt={p.processingStartedAt} isProcessing={isProcessing} />
        )}

        {awaitingApproval && !isApproved && (
          <Card className="bg-amber-900/20 border-amber-800">
            <CardContent className="flex items-center gap-3 py-3 sm:py-4">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-300 font-medium">Strategy Ready for Review</p>
                <p className="text-xs text-amber-400 mt-0.5 hidden sm:block">
                  AI agents have completed. Review the assets and approve to proceed.
                </p>
              </div>
              <Button
                onClick={() => setModalOpen(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-500 text-white gap-1.5 flex-shrink-0 min-h-[44px]"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Review &amp; Approve
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {p.targetAudience && (
            <InfoCard icon={Users} label="Audience" value={p.targetAudience} />
          )}
          {p.websiteUrl && (
            <InfoCard icon={Globe} label="Website" value={p.websiteUrl} />
          )}
          {p.budget && (
            <InfoCard icon={DollarSign} label="Budget" value={p.budget} />
          )}
          <InfoCard
            icon={Clock}
            label="Agent Status"
            value={isProcessing ? "Running" : p.status === "pending" ? "Not started" : "Completed"}
          />
        </div>

        {/* Tabs — wrapping on mobile */}
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="bg-gray-900 border border-gray-800 inline-flex w-auto min-w-full sm:w-full">
              <TabsTrigger
                value="overview"
                className="flex-1 data-[state=active]:bg-gray-800 text-gray-400 data-[state=active]:text-white text-xs whitespace-nowrap"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="assets"
                className="flex-1 data-[state=active]:bg-gray-800 text-gray-400 data-[state=active]:text-white text-xs whitespace-nowrap"
              >
                Assets
              </TabsTrigger>
              <TabsTrigger
                value="competitors"
                className="flex-1 data-[state=active]:bg-gray-800 text-gray-400 data-[state=active]:text-white text-xs whitespace-nowrap"
              >
                Competitors
              </TabsTrigger>
              <TabsTrigger
                value="landing"
                className="flex-1 data-[state=active]:bg-gray-800 text-gray-400 data-[state=active]:text-white text-xs whitespace-nowrap"
              >
                Landing Page
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-4">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-300">Product Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{p.productDescription}</p>
              </CardContent>
            </Card>

            {p.positioningStatement && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400" />
                    AI-Generated Positioning Statement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 leading-relaxed italic">{p.positioningStatement}</p>
                </CardContent>
              </Card>
            )}

            <AgentStatusPanel project={p as Record<string, string>} />
          </TabsContent>

          <TabsContent value="assets">
            <AssetsTab projectId={id!} />
          </TabsContent>

          <TabsContent value="competitors">
            <CompetitorsTab projectId={id!} />
          </TabsContent>

          <TabsContent value="landing">
            <LandingPageTab projectId={id!} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// ─── Processing Banner ────────────────────────────────────────────────────────

function ProcessingBanner({ startedAt, isProcessing }: { startedAt?: string; isProcessing: boolean }) {
  const elapsed = useElapsedTimer(startedAt, isProcessing);
  return (
    <Card className="bg-blue-900/20 border-blue-800">
      <CardContent className="flex items-center gap-3 py-3 sm:py-4">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-blue-300 font-medium">AI Agents Working</p>
          <p className="text-xs text-blue-400 mt-0.5 hidden sm:block">
            Researching competitors, building positioning, generating marketing assets...
          </p>
        </div>
        {startedAt && (
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-blue-500 uppercase tracking-wide">Elapsed</p>
            <p className="text-lg font-mono font-semibold text-blue-300 leading-none mt-0.5">{elapsed}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Landing Page Tab ─────────────────────────────────────────────────────────

function LandingPageTab({ projectId }: { projectId: string }) {
  const previewUrl = `/api/projects/${projectId}/preview`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">AI-generated landing page preview</p>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-1.5 text-xs min-h-[44px]"
          onClick={() => window.open(previewUrl, "_blank")}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Full Page
        </Button>
      </div>
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #1f2937", background: "#0a0a0f" }}>
        <iframe
          src={previewUrl}
          width="100%"
          height="500"
          style={{ display: "block", border: "none", borderRadius: 8 }}
          title="Landing Page Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-500 truncate">{label}</span>
        </div>
        <p className="text-xs text-gray-300 truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

function AgentStatusPanel({ project }: { project: Record<string, string> }) {
  const agents = [
    { key: "competitorAgentStatus", label: "Competitor Research" },
    { key: "marketingAgentStatus", label: "Marketing Copy" },
    { key: "landingPageAgentStatus", label: "Landing Page" },
  ];
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-300">Agent Pipeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agents.map(({ key, label }) => {
          const status = project[key] ?? "idle";
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-sm text-gray-400 truncate">{label}</span>
              <AgentStatusBadge status={status} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AgentStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    idle: { label: "Idle", icon: Clock, className: "text-gray-400" },
    running: { label: "Running", icon: Loader2, className: "text-blue-400" },
    completed: { label: "Done", icon: CheckCircle, className: "text-green-400" },
    error: { label: "Error", icon: AlertCircle, className: "text-red-400" },
  };
  const cfg = configs[status] ?? configs.idle;
  const Icon = cfg.icon;
  return (
    <span className={`text-xs flex items-center gap-1.5 flex-shrink-0 ${cfg.className}`}>
      <Icon className={`w-3.5 h-3.5 ${status === "running" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

// ─── Assets Tab ───────────────────────────────────────────────────────────────

function AssetsTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(getListProjectAssetsQueryOptions(projectId));
  const assets = (data as { assets?: AssetItem[] })?.assets ?? [];
  const nonLandingAssets = assets.filter((a) => a.assetType !== "landing_page_html");

  const updateAsset = useUpdateProjectAsset({
    mutation: {
      onSuccess: () => {
        toast({ title: "Asset updated" });
        qc.invalidateQueries({ queryKey: ["projects"] });
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full bg-gray-900" />)}
      </div>
    );
  }

  if (nonLandingAssets.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <FileText className="w-8 h-8 text-gray-700" />
          <p className="text-sm text-gray-500">No assets generated yet. Run AI agents first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {nonLandingAssets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onApprove={(approved) =>
            updateAsset.mutate({ projectId, assetId: asset.id, data: { isApproved: approved } })
          }
        />
      ))}
    </div>
  );
}

function AssetCard({ asset, onApprove }: { asset: AssetItem; onApprove: (approved: boolean) => void }) {
  const [expanded, setExpanded] = useState(false);
  const assetTypeLabel: Record<string, string> = {
    meta_ad_copy: "Meta Ad Copy",
    cold_email_sequence: "Cold Email Sequence",
    blog_post: "Blog Post",
    landing_page_html: "Landing Page",
    positioning_doc: "Positioning Doc",
    social_post: "Social Posts",
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-sm text-white break-words">{asset.title}</CardTitle>
              {asset.isApproved && (
                <Badge className="bg-green-600/20 text-green-400 border-green-500/30 border text-xs px-1.5 py-0 flex items-center gap-1 flex-shrink-0">
                  <CheckCircle className="w-3 h-3" />
                  Approved
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">
                {assetTypeLabel[asset.assetType] ?? asset.assetType}
              </Badge>
              {asset.tokensUsed && (
                <span className="text-xs text-gray-600">{asset.tokensUsed.toLocaleString()} tokens</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-700 text-gray-400 hover:bg-gray-800 text-xs h-9 min-w-[72px]"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Collapse" : "Expand"}
            </Button>
            {!asset.isApproved ? (
              <Button
                size="sm"
                className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 text-xs h-9 gap-1"
                onClick={() => onApprove(true)}
              >
                <ThumbsUp className="w-3 h-3" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-400 hover:bg-gray-800 text-xs h-9"
                onClick={() => onApprove(false)}
              >
                Revoke
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
              {asset.content}
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Competitors Tab ──────────────────────────────────────────────────────────

interface CompetitorItem {
  id: string;
  competitorName: string;
  websiteUrl?: string;
  positioningAngle?: string;
  reviewSentimentScore?: number;
  agentConfidenceScore?: number;
  strengths?: string[];
  weaknesses?: string[];
  keyFeatures?: string[];
  pricingTiers?: { name: string; price: string }[];
}

function parsePrice(price: string): number {
  if (!price) return 0;
  const lower = price.toLowerCase().trim();
  if (lower === "free" || lower === "$0" || lower === "0") return 0;
  if (lower.includes("custom") || lower.includes("enterprise") || lower.includes("contact")) return -1;
  const match = price.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return match ? Math.round(parseFloat(match[0])) : 0;
}

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

function PricingBarChart({ competitors }: { competitors: CompetitorItem[] }) {
  const filtered = competitors.filter((c) => c.pricingTiers && c.pricingTiers.length > 0);
  if (filtered.length === 0) return null;

  const maxTiers = Math.max(...filtered.map((c) => c.pricingTiers!.length));
  const chartData = filtered.map((c) => {
    const entry: Record<string, string | number> = { name: c.competitorName.split(" ")[0] };
    (c.pricingTiers ?? []).forEach((tier, idx) => {
      const val = parsePrice(tier.price);
      if (val >= 0) entry[`tier${idx}`] = val;
      entry[`tier${idx}Label`] = `${tier.name}: ${tier.price}`;
    });
    return entry;
  });

  const tierNames: string[] = [];
  for (let i = 0; i < maxTiers; i++) {
    const ref = filtered.find((c) => c.pricingTiers![i]);
    tierNames.push(ref?.pricingTiers![i]?.name ?? `Tier ${i + 1}`);
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; dataKey: string; payload: Record<string, string | number> }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry) => {
          const tierLabel = entry.payload[`${entry.dataKey}Label`] as string;
          return (
            <div key={entry.dataKey} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[parseInt(entry.dataKey.replace("tier", ""))] }} />
              <span className="text-gray-300">{tierLabel ?? `$${entry.value}/mo`}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-indigo-400" />
          Competitor Pricing Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={{ stroke: "#374151" }} tickLine={false} />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v}`} width={44} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
            <Legend
              formatter={(value: string) => (
                <span style={{ color: "#9ca3af", fontSize: 11 }}>
                  {tierNames[parseInt(value.replace("tier", ""))] ?? value}
                </span>
              )}
            />
            {Array.from({ length: maxTiers }, (_, i) => (
              <Bar key={`tier${i}`} dataKey={`tier${i}`} name={`tier${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={48} />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-600 mt-2 text-center">Monthly pricing in USD (0 = Free, Custom/Enterprise excluded)</p>
      </CardContent>
    </Card>
  );
}

function CompetitorsTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery(getListProjectCompetitorsQueryOptions(projectId));
  const competitors = (data as { competitors?: CompetitorItem[] })?.competitors ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-40 w-full bg-gray-900" />)}
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
          <BarChart2 className="w-8 h-8 text-gray-700" />
          <p className="text-sm text-gray-500">No competitor data yet. Run AI agents first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <PricingBarChart competitors={competitors} />
      {competitors.map((c) => (
        <CompetitorCard key={c.id} competitor={c} />
      ))}
    </div>
  );
}

function CompetitorCard({ competitor: c }: { competitor: CompetitorItem }) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm text-white">{c.competitorName}</CardTitle>
            {c.websiteUrl && (
              <a href={c.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-0.5">
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{c.websiteUrl.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>
          <div className="flex gap-3 flex-shrink-0">
            {c.reviewSentimentScore !== undefined && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Sentiment</p>
                <p className={`text-sm font-bold ${c.reviewSentimentScore >= 70 ? "text-green-400" : c.reviewSentimentScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {c.reviewSentimentScore}%
                </p>
              </div>
            )}
            {c.agentConfidenceScore !== undefined && (
              <div className="text-center">
                <p className="text-xs text-gray-500">Confidence</p>
                <p className="text-sm font-bold text-indigo-400">{c.agentConfidenceScore}%</p>
              </div>
            )}
          </div>
        </div>
        {c.positioningAngle && (
          <p className="text-xs text-gray-400 italic mt-1">"{c.positioningAngle}"</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {c.strengths && c.strengths.length > 0 && (
            <div>
              <p className="text-xs text-green-400 font-medium mb-1.5">Strengths</p>
              <ul className="space-y-1">
                {(c.strengths as string[]).map((s, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {c.weaknesses && c.weaknesses.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-medium mb-1.5">Weaknesses</p>
              <ul className="space-y-1">
                {(c.weaknesses as string[]).map((w, i) => (
                  <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">−</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {c.pricingTiers && (c.pricingTiers as { name: string; price: string }[]).length > 0 && (
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1.5">Pricing Tiers</p>
            <div className="flex flex-wrap gap-2">
              {(c.pricingTiers as { name: string; price: string }[]).map((tier, i) => (
                <Badge key={i} variant="outline" className="border-gray-700 text-gray-300 text-xs">
                  {tier.name}: {tier.price}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
