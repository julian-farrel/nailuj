"use client";
import { useState } from "react";
import { FileText, CheckCircle, AlertTriangle, Info, Download, Loader2 } from "lucide-react";
import { generateInstitutionalReport } from "@/lib/exportUtils";

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

export default function ResearchReport({ research, assets, weights, metrics }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  if (!research) return null;

  const canExport = metrics && assets && assets.length > 0 && weights;

  const handleExport = async () => {
    if (!canExport || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      await generateInstitutionalReport({ assets, weights, metrics });
    } catch (err) {
      console.error("[ResearchReport] PDF export failed:", err);
      setError("PDF generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="glass-card p-6 animate-fade-in-up">
      {/* ── Header row with Export button ── */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-accent" />
          <h2 className="text-base font-bold text-foreground">
            Institutional Research Summary
          </h2>
        </div>

        {/* Export PDF button */}
        <button
          onClick={handleExport}
          disabled={!canExport || isGenerating}
          className={`
            shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg
            border text-xs font-mono font-semibold tracking-wide
            transition-all duration-200
            ${canExport && !isGenerating
              ? "bg-surface-elevated border-border text-muted-foreground hover:border-accent hover:text-accent hover:shadow-[0_0_16px_rgba(0,229,255,0.12)]"
              : "bg-surface-elevated border-border/50 text-muted/30 cursor-not-allowed"
            }
          `}
          title={canExport ? "Export institutional PDF report" : "Build a portfolio first"}
        >
          {isGenerating
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5" />
          }
          {isGenerating ? "GENERATING PDF…" : "EXPORT INSTITUTIONAL REPORT"}
        </button>
      </div>

      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-5 font-mono">
        Nailuj Terminal — Quantitative Research Desk
      </p>

      {/* Error toast */}
      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-accent-red/5 border border-accent-red/20 flex items-center gap-2 text-xs text-accent-red font-mono">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Risk level banner */}
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

      {/* Bullet points */}
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

      {/* Footer */}
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
