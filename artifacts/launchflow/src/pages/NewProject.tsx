import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useCreateProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Zap, Loader2 } from "lucide-react";
import { Link } from "wouter";

const schema = z.object({
  productName: z.string().min(2, "Product name is required"),
  productDescription: z.string().min(10, "Please provide a description of at least 10 characters"),
  targetAudience: z.string().min(5, "Target audience is required"),
  websiteUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
  budget: z.string().optional(),
  launchDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewProject() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      productName: "",
      productDescription: "",
      targetAudience: "",
      websiteUrl: "",
      budget: "",
      launchDate: "",
    },
  });

  const createMutation = useCreateProject({
    mutation: {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: ["projects"] });
        toast({ title: "Project created!", description: "Now run AI agents to generate your GTM strategy." });
        navigate(`/projects/${(data as { id: string }).id ?? ""}`);
      },
      onError: () => {
        toast({ title: "Failed to create project", variant: "destructive" });
      },
    },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate({
      data: {
        productName: data.productName,
        productDescription: data.productDescription,
        targetAudience: data.targetAudience,
        websiteUrl: data.websiteUrl || undefined,
        budget: data.budget || undefined,
        launchDate: data.launchDate ? new Date(data.launchDate) : undefined,
      },
    });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <a className="text-gray-400 hover:text-gray-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
        </Link>
        <h1 className="text-xl font-semibold text-white">New GTM Project</h1>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-white text-base">Project Details</CardTitle>
              <CardDescription className="text-gray-400 text-xs mt-0.5">
                Tell our AI agents about your product and we'll build your entire GTM strategy.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Product Name *</Label>
              <Input
                {...register("productName")}
                placeholder="e.g. Acme CRM"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500"
              />
              {errors.productName && (
                <p className="text-xs text-red-400">{errors.productName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Product Description *</Label>
              <Textarea
                {...register("productDescription")}
                placeholder="Describe what your product does, its key features, and how it helps customers..."
                rows={4}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500 resize-none"
              />
              {errors.productDescription && (
                <p className="text-xs text-red-400">{errors.productDescription.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Target Audience *</Label>
              <Textarea
                {...register("targetAudience")}
                placeholder="e.g. B2B SaaS companies with 10-200 employees, sales teams struggling with pipeline management..."
                rows={3}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500 resize-none"
              />
              {errors.targetAudience && (
                <p className="text-xs text-red-400">{errors.targetAudience.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Website URL</Label>
                <Input
                  {...register("websiteUrl")}
                  placeholder="https://yourproduct.com"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500"
                />
                {errors.websiteUrl && (
                  <p className="text-xs text-red-400">{errors.websiteUrl.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-300 text-sm">Budget Range</Label>
                <Input
                  {...register("budget")}
                  placeholder="e.g. $50k/quarter"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-300 text-sm">Launch Date</Label>
              <Input
                {...register("launchDate")}
                type="date"
                className="bg-gray-800 border-gray-700 text-white focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/projects">
                <Button type="button" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
