/**
 * lib/exportUtils.js
 * Institutional PDF Report Generator — JP Morgan / Goldman Sachs macro research style.
 * White background, Helvetica, crisp dividers, programmatic layout.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

// ── Formatting helpers ─────────────────────────────────────
const fmt = {
  pct: (v) => `${(v * 100).toFixed(2)}%`,
  dec2: (v) => Number(v).toFixed(2),
  date: () =>
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
};

// ── Thin rule ──────────────────────────────────────────────
function drawRule(doc, y, margin, pageWidth, color = [180, 180, 180]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
}

// ── Page header (repeated on each page) ───────────────────
function drawPageHeader(doc, pageWidth, margin, pageNum) {
  const today = fmt.date();

  // Bold fund name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(10, 10, 10);
  doc.text("MERIDIAN CAPITAL", margin, margin + 8);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text("Quantitative Research — Client Portfolio Strategy & Risk Analytics", margin, margin + 15);

  // Date (right-aligned)
  doc.text(today, pageWidth - margin, margin + 8, { align: "right" });
  doc.text(`Page ${pageNum}`, pageWidth - margin, margin + 15, { align: "right" });

  // Heavy divider under header
  doc.setDrawColor(10, 10, 10);
  doc.setLineWidth(0.8);
  doc.line(margin, margin + 19, pageWidth - margin, margin + 19);

  return margin + 28; // return Y position after header
}

// ── Metric badge grid (3-across) ──────────────────────────
function drawMetricGrid(doc, metrics, startY, margin, pageWidth) {
  const cols = 3;
  const contentWidth = pageWidth - 2 * margin;
  const cellW = contentWidth / cols;
  const cellH = 22;
  const padding = 5;

  const items = [
    { label: "Expected Return", value: fmt.pct(metrics.expectedReturn) },
    { label: "Annual Volatility", value: fmt.pct(metrics.volatility) },
    { label: "Sharpe Ratio", value: fmt.dec2(metrics.sharpeRatio) },
    { label: "Sortino Ratio", value: fmt.dec2(metrics.sortinoRatio) },
    { label: "Max Drawdown", value: fmt.pct(metrics.maxDrawdown) },
    { label: "Portfolio Beta", value: fmt.dec2(metrics.beta) },
  ];

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * cellW;
    const y = startY + row * (cellH + 4);

    // Cell background
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(x, y, cellW - 3, cellH, 2, 2, "F");

    // Thin border
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cellW - 3, cellH, 2, 2, "S");

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text(item.label.toUpperCase(), x + padding, y + 8);

    // Value — large, bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(10, 10, 10);
    doc.text(item.value, x + padding, y + 18);
  });

  const rows = Math.ceil(items.length / cols);
  return startY + rows * (cellH + 4) + 6;
}

// ── Main export function ───────────────────────────────────
export async function generateInstitutionalReport({ assets, weights, metrics }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const today = fmt.date();

  // ════════════════════════════════════════════════════════
  // PAGE 1 — Summary, Metrics, Allocation
  // ════════════════════════════════════════════════════════
  let y = drawPageHeader(doc, pageWidth, margin, 1);

  // ── Section: Portfolio Risk Metrics ─────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text("Portfolio Risk Metrics", margin, y);
  drawRule(doc, y + 3, margin, pageWidth, [200, 200, 200]);
  y += 8;

  y = drawMetricGrid(doc, metrics, y, margin, pageWidth);

  // ── Section: Asset Allocation Table ─────────────────────
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text("Asset Allocation", margin, y);
  drawRule(doc, y + 3, margin, pageWidth, [200, 200, 200]);
  y += 6;

  const allocationRows = assets.map((a) => [
    a.ticker,
    a.name || a.ticker,
    a.type || "EQUITY",
    fmt.pct(weights[a.ticker] / 100),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Ticker", "Asset Name", "Type", "Weight"]],
    body: allocationRows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      textColor: [20, 20, 20],
      lineColor: [230, 230, 230],
      lineWidth: 0.2,
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [235, 235, 235],
      textColor: [30, 30, 30],
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [251, 251, 251] },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 28 },
      3: { cellWidth: 24, halign: "right", fontStyle: "bold" },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Concentration risk footnote on page 1 ───────────────
  let maxW = 0, maxTicker = "";
  for (const [t, w] of Object.entries(weights)) {
    if (w > maxW) { maxW = w; maxTicker = t; }
  }
  const highConcentration = maxW > 40;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const footnote = highConcentration
    ? `⚠ Concentration Risk: ${maxTicker} represents ${fmt.pct(maxW / 100)} of the portfolio. Consider diversification.`
    : `✓ Diversification: The largest single position (${maxTicker}) represents ${fmt.pct(maxW / 100)} of the portfolio.`;
  doc.text(footnote, margin, y, { maxWidth: pageWidth - 2 * margin });
  y += 8;

  // ── Disclaimer ──────────────────────────────────────────
  drawRule(doc, y, margin, pageWidth);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(
    "DISCLAIMER: This report is generated programmatically for informational purposes only and does not constitute investment advice. Past performance is not indicative of future results. Meridian Capital Partners, LLC — Institutional Use Only.",
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin, lineHeightFactor: 1.4 }
  );

  // ════════════════════════════════════════════════════════
  // PAGE 2 — Forward Projection Chart & Commentary
  // ════════════════════════════════════════════════════════
  doc.addPage();
  y = drawPageHeader(doc, pageWidth, margin, 2);

  // ── Capture chart via html2canvas ───────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text("Forward Projection — Compound Growth Analysis", margin, y);
  drawRule(doc, y + 3, margin, pageWidth, [200, 200, 200]);
  y += 8;

  const chartEl = document.getElementById("projection-chart");
  if (chartEl) {
    try {
      // Temporarily set the chart to have a white-ish background for clean capture
      const originalBg = chartEl.style.background;
      const canvas = await html2canvas(chartEl, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0d1628", // keep dark — embed as-is, it looks premium in the PDF
        logging: false,
      });
      chartEl.style.background = originalBg;

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = Math.min((canvas.height * imgWidth) / canvas.width, 110); // cap height

      // Draw a subtle border around the chart image
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(margin - 1, y - 1, imgWidth + 2, imgHeight + 2);

      doc.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
      y += imgHeight + 10;
    } catch (err) {
      console.error("[generateReport] Chart capture failed:", err);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(140, 140, 140);
      doc.text("Chart image unavailable — ensure the chart is visible on screen before exporting.", margin, y);
      y += 14;
    }
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(140, 140, 140);
    doc.text("Projection chart element not found (id='projection-chart').", margin, y);
    y += 14;
  }

  // ── Quantitative Commentary ──────────────────────────────
  drawRule(doc, y, margin, pageWidth, [200, 200, 200]);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 10, 10);
  doc.text("Quantitative Commentary", margin, y);
  y += 7;

  // Beta narrative
  let betaNarrative;
  if (metrics.beta > 1.2) {
    betaNarrative = `The portfolio exhibits an elevated beta of ${fmt.dec2(metrics.beta)}×, indicating amplified sensitivity to broad market movements. In a down market, losses will likely exceed those of the S&P 500 benchmark; conversely, upside participation is enhanced in bull markets.`;
  } else if (metrics.beta < 0.8) {
    betaNarrative = `With a defensive beta of ${fmt.dec2(metrics.beta)}×, this portfolio is positioned to dampen drawdowns relative to the S&P 500. Lower market correlation may reduce tail risk but could result in underperformance during strong equity rallies.`;
  } else {
    betaNarrative = `The portfolio beta of ${fmt.dec2(metrics.beta)}× indicates near-market-neutral sensitivity to the S&P 500 benchmark. Return dispersion relative to the index is primarily driven by individual asset alpha rather than systemic market exposure.`;
  }

  // Risk-adjusted summary
  const sharpeQuality =
    metrics.sharpeRatio >= 1.5 ? "exceptional"
    : metrics.sharpeRatio >= 1.0 ? "strong"
    : metrics.sharpeRatio >= 0.5 ? "moderate"
    : "below-threshold";
  const riskAdjNarrative = `The portfolio's Sharpe Ratio of ${fmt.dec2(metrics.sharpeRatio)} is classified as ${sharpeQuality}, delivering ${fmt.pct(metrics.expectedReturn)} annualised expected return against ${fmt.pct(metrics.volatility)} volatility. The Sortino Ratio of ${fmt.dec2(metrics.sortinoRatio)} confirms that downside volatility is proportionally ${metrics.sortinoRatio > metrics.sharpeRatio ? "lower" : "higher"} than total volatility, suggesting ${metrics.sortinoRatio > metrics.sharpeRatio ? "a positively skewed return distribution." : "material downside risk."}`;

  const commentary = `${betaNarrative}\n\n${riskAdjNarrative}`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(commentary, pageWidth - 2 * margin);
  doc.text(lines, margin, y);
  y += lines.length * 4.5 + 10;

  // Footer rule
  drawRule(doc, y, margin, pageWidth);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(
    `Generated on ${today} by Meridian Capital Quantitative Research Desk. Institutional Use Only — Not For Redistribution.`,
    margin,
    y,
    { maxWidth: pageWidth - 2 * margin }
  );

  // ── Save ────────────────────────────────────────────────
  const safeDateStr = today.replace(/,?\s+/g, "_");
  doc.save(`Meridian_Institutional_Report_${safeDateStr}.pdf`);
}
