import Link from "next/link";
import {
  Award,
  ChevronRight,
  FileText,
  Gift,
  MessageSquareHeart,
  Receipt,
  ShieldCheck,
  Sparkles,
  Users,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui";

export const metadata = { title: "More" };

const LINKS = [
  {
    href: "/app/portfolio",
    label: "Portfolio",
    hint: "Investments, payouts and charts",
    icon: FileText,
  },
  {
    href: "/app/bills",
    label: "Electricity bills",
    hint: "Add a bill and earn energy-saving points",
    icon: Receipt,
  },
  {
    href: "/app/rewards",
    label: "Rewards",
    hint: "Spend points at your mall",
    icon: Gift,
  },
  {
    href: "/app/agent",
    label: "Ask Sprout",
    hint: "Your helper for everything in the app",
    icon: Sparkles,
  },
  {
    href: "/community",
    label: "Community",
    hint: "Talk to neighbours, shops and the township team",
    icon: Users,
  },
  {
    href: "/app/badges",
    label: "My badges",
    hint: "Your level and the next one to reach",
    icon: Award,
  },
  {
    href: "/app/risk",
    label: "How we handle risk",
    hint: "Where your money goes, and who carries the risk",
    icon: ShieldCheck,
  },
  {
    href: "/app/feedback",
    label: "Give feedback",
    hint: "Tell the township team what to improve",
    icon: MessageSquareHeart,
  },
  {
    href: "/app/profile",
    label: "Profile",
    hint: "Your name and township",
    icon: UserRound,
  },
];

export default function MorePage() {
  return (
    <main>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">More</h1>

      <div className="mt-5 space-y-3">
        {LINKS.map(({ href, label, hint, icon: Icon }) => (
          <Link key={href} href={href} className="block">
            <Card className="flex items-center gap-3">
              <span className="text-brand-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">
                  {label}
                </span>
                <span className="block text-xs text-slate-500">{hint}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Card>
          </Link>
        ))}
      </div>

    </main>
  );
}
