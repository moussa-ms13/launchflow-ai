import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { getGetDashboardStatsQueryOptions, getListProjectsQueryOptions } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  FileText,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Zap,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import StatusBadge from "@/components/StatusBadge";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useQuery(getGetDashboardStatsQueryOptions());
  const { data: projectsData, isLoading: projectsLoading } = useQuery(getListProjectsQueryOptions());

  const stats = statsData as
    | {
        totalProjects: number;
        totalAssets: number;
        approvedAssets: number;
        strategiesApproved: number;
        projectsByStatus: Record<string, number>;
      }
    | undefined;

  const projects = projectsData?.projects ?? [];
  const recentProjects = projects.slice(0, 5);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-white">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Your GTM command center.</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-sm min-h-[44px]">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Projects"
          value={stats?.totalProjects ?? 0}
          icon={FolderKanban}
          loading={statsLoading}
          accent="violet"
        />
        <StatCard
          label="Strategies Approved"
          value={stats?.strategiesApproved ?? 0}
          icon={ShieldCheck}
          loading={statsLoading}
          accent="green"
        />
        <StatCard
          label="Assets Generated"
          value={stats?.totalAssets ?? 0}
          icon={FileText}
          loading={statsLoading}
          accent="violet"
        />
        <StatCardStatic
          label="Avg. Time Saved"
          value="~18 hrs"
          icon={Clock}
          accent="amber"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent projects */}
        <Card className="lg:col-span-2 bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-gray-300">Recent Projects</CardTitle>
            <Link href="/projects">
              <a className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </a>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {projectsLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg bg-gray-800" />
                ))}
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="px-4 pb-6 pt-2 text-center">
                <Zap className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No projects yet.</p>
                <Link href="/projects/new">
                  <a className="text-xs text-indigo-400 hover:text-indigo-300 mt-1 inline-block">
                    Create your first project →
                  </a>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {recentProjects.map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <a className="flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors min-h-[56px]">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-200 truncate">{p.productName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status breakdown */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Project Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statsLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded bg-gray-800" />
                ))}
              </div>
            ) : (
              [
                { key: "pending", label: "Pending", color: "bg-gray-600" },
                { key: "processing", label: "Processing", color: "bg-blue-500" },
                { key: "awaiting_approval", label: "Awaiting Review", color: "bg-amber-500" },
                { key: "approved", label: "Approved", color: "bg-green-500" },
              ].map(({ key, label, color }) => {
                const count = stats?.projectsByStatus?.[key] ?? 0;
                const total = stats?.totalProjects ?? 1;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-gray-300 font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
  accent = "violet",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  loading: boolean;
  accent?: "violet" | "green" | "amber";
}) {
  const colors = {
    violet: { text: "text-violet-400", bg: "bg-violet-600/20", num: "text-violet-300" },
    green: { text: "text-green-400", bg: "bg-green-600/20", num: "text-green-300" },
    amber: { text: "text-amber-400", bg: "bg-amber-600/20", num: "text-amber-300" },
  };
  const c = colors[accent];

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-14 mt-1.5 bg-gray-800" />
            ) : (
              <p className={`text-3xl font-bold mt-1 ${c.num}`}>{value}</p>
            )}
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
            <Icon className={`w-4 h-4 ${c.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardStatic({
  label,
  value,
  icon: Icon,
  accent = "amber",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: "violet" | "green" | "amber";
}) {
  const colors = {
    violet: { text: "text-violet-400", bg: "bg-violet-600/20", num: "text-violet-300" },
    green: { text: "text-green-400", bg: "bg-green-600/20", num: "text-green-300" },
    amber: { text: "text-amber-400", bg: "bg-amber-600/20", num: "text-amber-300" },
  };
  const c = colors[accent];

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.num}`}>{value}</p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
            <Icon className={`w-4 h-4 ${c.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
