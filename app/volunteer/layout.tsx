import { Home, ClipboardList, MessageCircle, User } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

export default function VolunteerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      brand="SamaajSetu"
      nav={[
        { label: "Home", href: "/volunteer/feed", icon: <Home className="h-4 w-4" /> },
        { label: "My Tasks", href: "/volunteer/tasks", icon: <ClipboardList className="h-4 w-4" /> },
        { label: "Voice", href: "/volunteer/voice", icon: <MessageCircle className="h-4 w-4" /> },
        { label: "Profile", href: "/volunteer/profile", icon: <User className="h-4 w-4" /> },
      ]}
    >
      {children}
    </AppShell>
  );
}
