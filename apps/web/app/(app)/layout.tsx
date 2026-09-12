import type { ReactNode } from "react";
import { AppNav } from "@/components/AppNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <AppNav />
      {children}
    </div>
  );
}
