import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  getListProjectsQueryOptions,
  useDeleteProject,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Trash2, Eye, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Projects() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(getListProjectsQueryOptions());
  const projects = data?.projects ?? [];

  const deleteMutation = useDeleteProject({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["projects"] });
        toast({ title: "Project deleted" });
        setDeleteId(null);
      },
      onError: () => {
        toast({ title: "Failed to delete project", variant: "destructive" });
      },
    },
  });

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-gray-900" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">No projects yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Create your first project and let AI agents build your GTM strategy.
              </p>
            </div>
            <Link href="/projects/new">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
                <Plus className="w-4 h-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Card key={project.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/projects/${project.id}`}>
                      <a className="text-sm font-medium text-white hover:text-indigo-400 transition-colors">
                        {project.productName}
                      </a>
                    </Link>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{project.targetAudience}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link href={`/projects/${project.id}`}>
                    <Button size="sm" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800 gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-gray-200 hover:bg-gray-800">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400"
                        onClick={() => setDeleteId(project.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete project?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete the project and all its assets and competitor data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-500 text-white"
              onClick={() => deleteId && deleteMutation.mutate({ projectId: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
