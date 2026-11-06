import React from 'react';
import { Box, Paper, Typography, Chip, Card, CardContent } from '@mui/material';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fmt } from '../utils/format';

export function StatCard({
  icon, title, value, changePct, bg = '#EAF7EF', iconColor = '#23A455',
}: { icon: React.ReactNode; title: string; value: string; changePct?: number; bg?: string; iconColor?: string }) {
  const up = (changePct ?? 0) >= 0;
  return (
    <Card sx={{ borderRadius: 2.5 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
            {icon}
          </Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>{title}</Typography>
        </Box>
        <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#172B3A' }}>{value}</Typography>
        {changePct !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.5 }}>
            {up ? <TrendingUp size={13} color="#23A455" /> : <TrendingDown size={13} color="#E23B3B" />}
            <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: up ? '#23A455' : '#E23B3B' }}>
              {Math.abs(changePct)}% {changePct === 0 ? '' : up ? 'â†‘' : 'â†“'} vs yesterday
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { icon?: string; bg: string; fg: string }> = {
    'In Stock': { icon: 'âœ“', bg: '#EAF7EF', fg: '#1B7A3E' },
    'Low Stock': { bg: '#FFF6E9', fg: '#B26A00' },
    'Out of Stock': { bg: '#FDECEC', fg: '#C02828' },
    'Expiring Soon': { bg: '#FFF6E9', fg: '#B26A00' },
    Expired: { bg: '#FDECEC', fg: '#C02828' },
    PENDING: { bg: '#FFF6E9', fg: '#B26A00' },
    OVERDUE: { bg: '#FDECEC', fg: '#C02828' },
    Overdue: { bg: '#FDECEC', fg: '#C02828' },
    Paid: { bg: '#EAF7EF', fg: '#1B7A3E' },
    PAID: { bg: '#EAF7EF', fg: '#1B7A3E' },
    Pending: { bg: '#FFF6E9', fg: '#B26A00' },
    RECEIVED: { bg: '#EAF7EF', fg: '#1B7A3E' },
    Received: { bg: '#EAF7EF', fg: '#1B7A3E' },
    PARTIALLY_RECEIVED: { bg: '#E9F3FC', fg: '#1D6EA5' },
    APPROVED: { bg: '#EAF7EF', fg: '#1B7A3E' },
    REJECTED: { bg: '#FDECEC', fg: '#C02828' },
    COMPLETED: { bg: '#EAF7EF', fg: '#1B7A3E' },
    REVERSED: { bg: '#FDECEC', fg: '#C02828' },
    VIP: { bg: '#FDF0E7', fg: '#C05A1B' },
    REGULAR: { bg: '#E9F3FC', fg: '#1D6EA5' },
    WHOLESALE: { bg: '#F1ECFC', fg: '#6A3AB2' },
  };
  const s = map[status] ?? { bg: '#EEF2F6', fg: '#47607A' };
  const pretty = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Chip
      size="small"
      label={s.icon ? `${s.icon} ${pretty}` : pretty}
      sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 700, fontSize: 11, height: 24, borderRadius: 1.2 }}
    />
  );
}

export function PageLoading() {
  return (
    <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>
      Loadingâ€¦
    </Box>
  );
}

export function EmptyRow({ colSpan, message = 'No data available' }: { colSpan: number; message?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ textAlign: 'center', padding: 28, color: '#8AA3B8', fontSize: 13 }}>
        {message}
      </td>
    </tr>
  );
}

export function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Paper sx={{ borderRadius: 2.5, mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2, pb: 1 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{title}</Typography>
        {action}
      </Box>
      <Box sx={{ px: 2.5, pb: 2 }}>{children}</Box>
    </Paper>
  );
}

// â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€” Exports (CSV / Excel / PDF working utilities) â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
export async function exportCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}.csv`);
}

export async function exportExcel(filename: string, rows: Record<string, any>[], sheetName = 'Sheet1') {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true };
  rows.forEach((r) => ws.addRow(headers.map((h) => r[h])));
  ws.columns!.forEach((c) => {
    const headerKey = Array.isArray(c.header) ? c.header[0] : c.header;
    c.width = Math.max(12, ...rows.map((r) => String(r[headerKey] ?? '').length + 4));
  });
  const buf = await wb.xlsx.writeBuffer();
  downloadFile(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${filename}.xlsx`);
}

export async function exportPDF(filename: string, title: string, rows: Record<string, any>[], businessName = 'JMFeeds') {
  const jsPDF = (await import('jspdf')).default;
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF();
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  doc.setFontSize(16);
  doc.text(businessName, 14, 15);
  doc.setFontSize(11);
  doc.text(title, 14, 22);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  autoTable(doc, {
    startY: 32,
    head: [headers],
    body: rows.map((r) => headers.map((h) => String(r[h] ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: '#23A455' },
  });
  doc.save(`${filename}.pdf`);
}

function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
