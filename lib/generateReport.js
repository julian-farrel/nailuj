import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

export async function generateInstitutionalReport({ assets, weights, metrics }) {
  // Create a new jsPDF instance (A4 size, portrait)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // ── Helper functions ──
  const formatPct = (val) => (val * 100).toFixed(2) + "%";
  const formatDec = (val) => val.toFixed(2);

  // Set font to professional serif/sans-serif
  doc.setFont("helvetica");

  // ──────────────────────────────────────────
  // PAGE 1: Executive Summary
  // ──────────────────────────────────────────
  
  // Header
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("MERIDIAN CAPITAL", margin, margin + 10);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Client Portfolio Strategy & Risk Analytics", margin, margin + 18);
  
  const today = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Date: ${today}`, pageWidth - margin, margin + 18, { align: "right" });

  // Divider line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, margin + 22, pageWidth - margin, margin + 22);

  // Title: Top Line Metrics
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Quantitative Summary", margin, margin + 35);

  // Metrics Grid
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const metricsData = [
    ["Expected Return", formatPct(metrics.expectedReturn)],
    ["Annual Volatility", formatPct(metrics.volatility)],
    ["Sharpe Ratio", formatDec(metrics.sharpeRatio)],
    ["Sortino Ratio", formatDec(metrics.sortinoRatio)],
    ["Max Drawdown", formatPct(metrics.maxDrawdown)],
    ["Portfolio Beta", formatDec(metrics.beta)],
  ];

  autoTable(doc, {
    startY: margin + 40,
    margin: { left: margin, right: margin },
    head: [["Metric", "Value"]],
    body: metricsData,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4, textColor: [0,0,0] },
    headStyles: { fontStyle: "bold", fillColor: [240, 240, 240] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 70, halign: 'right' }
    }
  });

  // Allocation Table
  const tableY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Asset Allocation", margin, tableY);

  const allocationData = assets.map(a => [
    a.ticker,
    a.name,
    formatPct(weights[a.ticker] / 100)
  ]);

  autoTable(doc, {
    startY: tableY + 5,
    margin: { left: margin, right: margin },
    head: [["Ticker", "Asset Name", "Weight"]],
    body: allocationData,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 4, textColor: [0,0,0] },
    headStyles: { fontStyle: "bold", fillColor: [240, 240, 240] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold" },
      1: { cellWidth: 90 },
      2: { cellWidth: 40, halign: 'right' }
    }
  });

  // ──────────────────────────────────────────
  // PAGE 2: Projections & Charting
  // ──────────────────────────────────────────
  doc.addPage();

  // Header for page 2
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Projections & Charting", margin, margin + 10);
  doc.setLineWidth(0.5);
  doc.line(margin, margin + 14, pageWidth - margin, margin + 14);

  // Capture the chart using html2canvas
  const chartElement = document.getElementById("projection-chart");
  let chartY = margin + 25;
  
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2, // Higher resolution
        backgroundColor: "#0b1120", // Preserve the dark background
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      
      // Calculate aspect ratio
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      doc.addImage(imgData, "JPEG", margin, chartY, imgWidth, imgHeight);
      chartY += imgHeight + 15;
    } catch (err) {
      console.error("Failed to capture chart", err);
      doc.setFontSize(10);
      doc.setFont("helvetica", "italic");
      doc.text("Chart rendering failed.", margin, chartY);
      chartY += 15;
    }
  } else {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Chart element not found.", margin, chartY);
    chartY += 15;
  }

  // Quantitative Commentary
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Quantitative Commentary", margin, chartY);

  let betaText = "";
  if (metrics.beta > 1.2) {
    betaText = `The portfolio exhibits a high beta of ${formatDec(metrics.beta)}, indicating significant sensitivity and amplified volatility relative to the S&P 500.`;
  } else if (metrics.beta < 0.8) {
    betaText = `With a beta of ${formatDec(metrics.beta)}, the portfolio is positioned defensively, likely experiencing lower drawdowns than the broader market.`;
  } else {
    betaText = `The portfolio beta of ${formatDec(metrics.beta)} suggests market-neutral volatility, tracking closely with the S&P 500.`;
  }

  // Find max concentration
  let maxWeight = 0;
  let maxTicker = "";
  for (const [ticker, weight] of Object.entries(weights)) {
    if (weight > maxWeight) {
      maxWeight = weight;
      maxTicker = ticker;
    }
  }

  let concentrationText = "";
  if (maxWeight > 40) {
    concentrationText = `High concentration risk identified: ${maxTicker} accounts for ${formatPct(maxWeight/100)} of the total allocation. Consider diversification to mitigate idiosyncratic risk.`;
  } else {
    concentrationText = `The portfolio is reasonably diversified, with the largest single allocation being ${maxTicker} at ${formatPct(maxWeight/100)}.`;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const textOptions = { maxWidth: pageWidth - 2 * margin, lineHeightFactor: 1.5 };
  doc.text(`${betaText} ${concentrationText}`, margin, chartY + 10, textOptions);

  // Save PDF
  doc.save(`Nailuj_Terminal_Report_${today.replace(/, | /g, "_")}.pdf`);
}
