"use client";
import { FileText, CheckCircle, AlertTriangle, Info } from "lucide-react";

const ICON_MAP = {
  positive: CheckCircle,
  warning: AlertTriangle,
  neutral: Info,
};

const BULLET_CLASS = {
  positive: "bullet-positive",
  warning: "bullet-warning",
  neutral: "bullet-neutral",
};

export default function ResearchReport({ research }) {
  if (!research) return null;

  return (
    <section className="glass-card p-6 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-accent" />
        <h2 className="text-base font-bold text-foreground">
          Institutional Research Summary
        </h2>
      </div>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-5 font-mono">
        Meridian Capital — Quantitative Research Desk
      </p>

      <div className={`rounded-xl p-4 mb-5 border ${
        research.riskLevel === "high"
          ? "bg-accent-red/5 border-accent-red/20"
          : research.riskLevel === "elevated"
          ? "bg-accent-amber/5 border-accent-amber/20"
          : "bg-accent-green/5 border-accent-green/20"
      }`}>
        <h3 className={`text-sm font-bold mb-2 ${
          research.riskLevel === "high"
            ? "text-accent-red"
            : research.riskLevel === "elevated"
            ? "text-accent-amber"
            : "text-accent-green"
        }`}>
          {research.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {research.summary}
        </p>
      </div>

      <div className="space-y-3">
        {research.bullets.map((bullet, i) => {
          const Icon = ICON_MAP[bullet.type] || Info;
          return (
            <div
              key={i}
              className={`${BULLET_CLASS[bullet.type]} rounded-lg p-4 flex gap-3`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                bullet.type === "positive" ? "text-accent-green" :
                bullet.type === "warning" ? "text-accent-red" : "text-accent-amber"
              }`} />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {bullet.text}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
        <p className="text-[10px] font-mono text-muted/60">
          DISCLAIMER: This analysis is for informational purposes only and does not constitute investment advice.
        </p>
        <p className="text-[10px] font-mono text-muted/60">
          Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
    </section>
  );
}
