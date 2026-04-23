import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Database,
  Cpu,
  ClipboardList,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";

interface PremiumUserDashboardProps {
  userId: string;
}

const statusBadgeColor: Record<string, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  processing:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

export async function PremiumUserDashboard({
  userId,
}: PremiumUserDashboardProps) {
  const supabase = createServiceRoleClient();

  const [
    { count: deviceCount },
    { count: pendingRequests },
    { data: datasets, count: datasetCount },
  ] = await Promise.all([
    supabase
      .from("devices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("maintenance_requests")
      .select("*", { count: "exact", head: true })
      .eq("requested_by", userId)
      .eq("status", "pending"),
    supabase
      .from("premium_datasets")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const completedCount = (datasets || []).filter(
    (d: any) => d.status === "completed",
  ).length;

  const stats = [
    {
      label: "My Datasets",
      value: datasetCount || 0,
      icon: Database,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Completed Analyses",
      value: completedCount,
      icon: Sparkles,
      color: "from-purple-500 to-fuchsia-500",
    },
    {
      label: "My Devices",
      value: deviceCount || 0,
      icon: Cpu,
      color: "from-blue-600 to-blue-500",
    },
    {
      label: "Pending Requests",
      value: pendingRequests || 0,
      icon: ClipboardList,
      color: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            <Crown className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Premium User
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Premium Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Upload your own datasets and let our admins run the predictive model
            on your data.
          </p>
        </div>
        <Link href="/dashboard/my-datasets">
          <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Upload Dataset
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className={`h-1.5 bg-gradient-to-r ${stat.color}`}></div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold">
                    {stat.label}
                  </CardTitle>
                  <div
                    className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} text-white`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-500" />
              Recent Datasets
            </CardTitle>
            <CardDescription>
              Your latest uploads and their status
            </CardDescription>
          </div>
          <Link href="/dashboard/my-datasets">
            <Button variant="outline" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {datasets && datasets.length > 0 ? (
            <div className="space-y-3">
              {datasets.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border border-slate-200/60 dark:border-slate-700/60"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{d.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {d.file_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Uploaded {new Date(d.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={statusBadgeColor[d.status] || ""}>
                      {d.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-60" />
              <p className="font-medium">No datasets yet</p>
              <p className="text-sm">
                Upload your first dataset to get predictions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
