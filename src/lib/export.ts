import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportEntry {
  rank: number;
  name: string;
  prefectId: string;
  batch: string;
  totalPoints: number;
  dutyCount: number;
  avgPoints: number;
}

export function exportToPDF(entries: ExportEntry[], batchFilter: string) {
  const doc = new jsPDF();
  const title = `ACPG Leaderboard — ${batchFilter === 'all' ? 'All Batches' : batchFilter + ' Prefects'}`;
  const date = new Date().toLocaleDateString();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(128, 0, 0);
  doc.text('ACPG Points System', 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(80, 80, 80);
  doc.text(title, 14, 28);
  doc.setFontSize(9);
  doc.text(`Generated: ${date}`, 14, 34);

  // Table
  autoTable(doc, {
    startY: 40,
    head: [['Rank', 'Name', 'ID', 'Batch', 'Points', 'Duties', 'Avg']],
    body: entries.map(e => [
      e.rank,
      e.name,
      e.prefectId,
      e.batch,
      e.totalPoints,
      e.dutyCount,
      e.avgPoints,
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [128, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 248, 244] },
    didParseCell(data) {
      if (data.section === 'body' && data.row.index < 3) {
        data.cell.styles.fontStyle = 'bold';
        if (data.column.index === 4) {
          data.cell.styles.textColor = [170, 130, 30];
        }
      }
    },
  });

  doc.save(`acpg-leaderboard-${date}.pdf`);
}

export function exportToExcel(entries: ExportEntry[], batchFilter: string) {
  const date = new Date().toLocaleDateString();
  const sheetData = [
    ['ACPG Points System — Leaderboard'],
    [`Filter: ${batchFilter === 'all' ? 'All Batches' : batchFilter + ' Prefects'}`, `Date: ${date}`],
    [],
    ['Rank', 'Name', 'Prefect ID', 'Batch', 'Total Points', 'Duties Completed', 'Avg Points'],
    ...entries.map(e => [e.rank, e.name, e.prefectId, e.batch, e.totalPoints, e.dutyCount, e.avgPoints]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 6 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 10 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard');
  XLSX.writeFile(wb, `acpg-leaderboard-${date}.xlsx`);
}
