import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generatePDFReport = (title, columns, data, filename) => {
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- HEADER SECTION ---
  // Top Color Bar
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(0, 0, pageWidth, 80, "F");

  // Logo / System Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255); // White
  doc.text("AMS", 40, 45);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Athlete Monitoring System", 40, 60);

  // Document Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), pageWidth - 40, 45, { align: "right" });

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dateStr = new Date().toLocaleString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  doc.text(dateStr, pageWidth - 40, 60, { align: "right" });

  doc.setDrawColor(229, 231, 235); // Gray-200
  doc.setLineWidth(1);
  doc.line(40, 90, pageWidth - 40, 90);

  // --- WATERMARK ---
  doc.setTextColor(243, 244, 246); // Gray-100
  doc.setFontSize(150);
  doc.setFont("helvetica", "bold");
  // Save graphics state
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({opacity: 0.3}));
  doc.text("AMS", pageWidth / 2, pageHeight / 2, {
    align: "center",
    valign: "middle",
  });
  doc.restoreGraphicsState();

  // --- TABLE SECTION ---
  autoTable(doc, {
    startY: 130,
    head: [columns],
    body: data,
    theme: "grid",
    headStyles: {
      fillColor: [30, 58, 138], // Blue-900
      textColor: 255,
      fontSize: 10,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [55, 65, 81], // Gray-700
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray-50
    },
    styles: {
      cellPadding: 6,
      lineColor: [229, 231, 235], // Gray-200
      lineWidth: 0.5,
    },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(156, 163, 175); // Gray-400
      
      const str = `Halaman ${doc.internal.getNumberOfPages()}`;
      doc.text(str, data.settings.margin.left, pageHeight - 30);
      
      const footerText = "Generated securely by Athlete Monitoring System";
      doc.text(footerText, pageWidth - data.settings.margin.right, pageHeight - 30, { align: "right" });

      // Footer line
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(1);
      doc.line(data.settings.margin.left, pageHeight - 40, pageWidth - data.settings.margin.right, pageHeight - 40);
    },
  });

  doc.save(filename);
};
