import { Map, Inbox, Users, MessageSquareWarning, FilePlus2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      brand="SamaajSetu — NGO"
      nav={[
        { label: "Mission Control", href: "/coordinator/mission-control", icon: <Map className="h-4 w-4" /> },
        { label: "Triage Inbox", href: "/coordinator/triage", icon: <Inbox className="h-4 w-4" /> },
        { label: "Matcher Studio", href: "/coordinator/matcher", icon: <Sparkles className="h-4 w-4" /> },
        { label: "New Need", href: "/coordinator/needs/new", icon: <FilePlus2 className="h-4 w-4" /> },
        { label: "Volunteers", href: "/coordinator/volunteers", icon: <Users className="h-4 w-4" /> },
        { label: "Voice Channel", href: "/coordinator/voice-channel", icon: <MessageSquareWarning className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
