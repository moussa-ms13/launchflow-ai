import { Button } from "@/components/ui/button";
import { Zap, BarChart3, FileText, Users, ArrowRight, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Competitor Intelligence",
    description: "AI agents automatically research competitors, analyze pricing, and surface positioning gaps.",
  },
  {
    icon: FileText,
    title: "Marketing Asset Generation",
    description: "Generate cold email sequences, ad copy, blog posts, and landing pages in minutes.",
  },
  {
    icon: BarChart3,
    title: "Human-in-the-Loop Approval",
    description: "Every AI-generated strategy requires your approval before going live. You stay in control.",
  },
];

const benefits = [
  "Full GTM strategy in under 5 minutes",
  "AI-powered competitive analysis",
  "5 types of ready-to-use marketing assets",
  "Human approval at every critical step",
];

export default function Landing({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">LaunchFlow AI</span>
          </div>
          <Button onClick={onLogin} variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white">
            Sign in
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-medium">
            <Zap className="w-3 h-3" />
            Autonomous GTM Orchestration
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Your AI-Powered
            <br />
            <span className="text-indigo-400">Go-To-Market Co-Pilot</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            LaunchFlow AI orchestrates autonomous agents to research competitors, craft positioning, and generate a complete GTM strategy — with human approval at every step.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={onLogin}
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>

          <ul className="flex flex-col sm:flex-row flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-gray-400">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="max-w-5xl mx-auto mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-3"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-800 px-6 py-6 text-center">
        <p className="text-gray-600 text-sm">© 2026 LaunchFlow AI. Built for B2B SaaS teams.</p>
      </footer>
    </div>
  );
}
