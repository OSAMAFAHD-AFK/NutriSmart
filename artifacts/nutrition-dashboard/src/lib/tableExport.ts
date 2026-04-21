import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ExportValue = string | number | boolean | null | undefined;
type ExportRow = Record<string, ExportValue>;

function normalizeValue(value: ExportValue): string | number | boolean {
  if (value === null || value === undefined) return "";
  return value;
}

export function exportRowsToExcel(fileName: string, rows: ExportRow[]) {
  if (!rows.length) return;
  const worksheet = XLSX.utils.json_to_sheet(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, normalizeValue(value)]),
      ),
    ),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportRowsToPdf(
  fileName: string,
  title: string,
  rows: ExportRow[],
) {
  if (!rows.length) return;

  const columns = Object.keys(rows[0]);
  const body = rows.map((row) =>
    columns.map((column) => String(normalizeValue(row[column]))),
  );

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  doc.setFontSize(13);
  doc.text(title, 40, 36);

  autoTable(doc, {
    startY: 48,
    head: [columns],
    body,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fontSize: 8 },
    margin: { left: 24, right: 24 },
  });

  doc.save(`${fileName}.pdf`);
}
