"use client";
import { Activity, Shield, TrendingUp } from "lucide-react";

export default function Header() {
  return (
    <header className="border-b border-border/50 bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-green flex items-center justify-center">
            <Activity className="w-5 h-5 text-background" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              MERIDIAN CAPITAL
            </h1>
            <p className="text-[11px] font-mono text-muted-foreground tracking-widest uppercase">
              Portfolio Analytics Terminal
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            LIVE SESSION
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs font-mono text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            INSTITUTIONAL
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs font-mono text-accent">
            <TrendingUp className="w-3.5 h-3.5" />
            Rf: 4.50%
          </div>
        </div>
      </div>
    </header>
  );
}
