import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  Typography,
} from "@mui/material";
import api from "../api/client";
import { fmt, fmtDate, todayISO } from "../utils/format";
import { exportCSV, exportExcel, exportPDF, EmptyRow } from "../components/ui";
import { Download } from "lucide-react";

const TABS = [
  "Sales",
  "Inventory",
  "Purchases",
  "Customers & Debt",
  "Financial",
  "Audit",
] as const;

export default function Reports() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const params = new URLSearchParams();
  if (from) params.set("startDate", from);
  if (to) params.set("endDate", to);
  const qs = params.toString();

  const { data: sales = [] } = useQuery({
    queryKey: ["report-sales", qs],
    queryFn: async () =>
      (await api.get(`/reports/sales${qs ? `?${qs}` : ""}`)).data,
    enabled: tab === "Sales",
  });
  const { data: inventory = [] } = useQuery({
    queryKey: ["report-inventory"],
    queryFn: async () => (await api.get("/reports/inventory")).data,
    enabled: tab === "Inventory",
  });
  const { data: purchases = [] } = useQuery({
    queryKey: ["report-purchases"],
    queryFn: async () => (await api.get("/reports/purchases")).data,
    enabled: tab === "Purchases",
  });
  const { data: debts } = useQuery({
    queryKey: ["report-debts"],
    queryFn: async () => (await api.get("/debts")).data,
    enabled: tab === "Customers & Debt",
  });
  const { data: financial } = useQuery({
    queryKey: ["report-financial"],
    queryFn: async () => (await api.get("/reports/financial")).data,
    enabled: tab === "Financial",
  });
  const { data: audit } = useQuery({
    queryKey: ["report-audit"],
    queryFn: async () => (await api.get("/reports/audit")).data,
    enabled: tab === "Audit",
  });

  const rows = useMemo(() => {
    switch (tab) {
      case "Sales":
        return sales.map((s: any) => ({
          Invoice: s.invoiceNumber,
          Date: fmtDate(s.createdAt),
          Customer: s.customer?.name ?? "Walk-in",
          Operator: s.user?.fullName ?? "",
          Items: s.items?.length ?? 0,
          Total: Number(s.totalAmount),
          Paid: Number(s.amountPaid),
          Balance: Number(s.balanceDue),
          Payment: s.payments?.[0]?.paymentMethod ?? "—",
          Status: s.status,
        }));
      case "Inventory":
        return inventory.map((p: any) => ({
          SKU: p.sku,
          Product: p.name,
          Category: p.category,
          Stock: p.stock,
          Unit: p.unit,
          UnitCost: p.unitCost,
          UnitPrice: p.unitPrice,
          Valuation: p.valuation,
          Status: p.status,
          Expiry: p.expiryDate ? fmtDate(p.expiryDate) : "—",
        }));
      case "Purchases":
        return purchases.map((o: any) => ({
          PO: o.poNumber,
          Date: fmtDate(o.createdAt),
          Supplier: o.supplier?.name ?? "",
          Items: o.items.length,
          Total: Number(o.totalAmount),
          Status: o.status,
        }));
      case "Customers & Debt":
        return (debts?.debtors ?? []).map((d: any) => ({
          Customer: d.name,
          Type: d.customerType,
          TotalCredit: d.totalCredit,
          Paid: d.paid,
          Balance: d.balance,
          DueDate: d.dueDate,
          Status: d.status,
        }));
      case "Financial":
        return [
          { Metric: "Total Revenue (Sales)", Amount: financial?.revenue ?? 0 },
          { Metric: "Cost of Goods Sold", Amount: financial?.cogs ?? 0 },
          { Metric: "Gross Profit", Amount: financial?.grossProfit ?? 0 },
          { Metric: "Operating Expenses", Amount: financial?.expenses ?? 0 },
          { Metric: "Net Profit", Amount: financial?.netProfit ?? 0 },
          {
            Metric: "Customer Receivables",
            Amount: financial?.receivables ?? 0,
          },
          {
            Metric: "Inventory Valuation",
            Amount: financial?.inventoryValuation ?? 0,
          },
        ];
      case "Audit":
        return (audit?.events ?? []).map((e: any) => ({
          Date: fmtDate(e.createdAt),
          Time: new Date(e.createdAt).toLocaleTimeString(),
          User: e.user?.username ?? "system",
          Action: e.action,
          Entity: e.entity,
          EntityId: e.entityId ?? "—",
        }));
      default:
        return [];
    }
  }, [tab, sales, inventory, purchases, debts, financial, audit]);

  const doExport = async (type: "pdf" | "excel" | "csv") => {
    if (!rows.length) {
      setSnack("Nothing to export for this tab");
      return;
    }
    setExporting(true);
    try {
      const name = `jmfeeds-${tab.toLowerCase().replace(/[^a-z]+/g, "-")}-${from || todayISO()}-${to || todayISO()}`;
      if (type === "pdf") await exportPDF(name, `${tab} Report`, rows);
      else if (type === "excel") await exportExcel(name, rows, tab);
      else await exportCSV(name, rows);
      setSnack("Export downloaded — figures reflect your selected filters");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box>
      {/* Filter bar */}
      <Paper
        sx={{
          borderRadius: 2.5,
          p: 2,
          mb: 2,
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <Button
              key={t}
              variant={tab === t ? "contained" : "text"}
              onClick={() => setTab(t)}
              sx={{
                fontSize: 12.5,
                px: 1.5,
                color: tab === t ? "#fff" : "#47607A",
              }}
            >
              {t}
            </Button>
          ))}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          size="small"
          type="date"
          label="From"
          InputLabelProps={{ shrink: true }}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          sx={{ width: 150 }}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          InputLabelProps={{ shrink: true }}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          sx={{ width: 150 }}
        />
        <Button
          variant="outlined"
          startIcon={<Download size={15} />}
          onClick={() => doExport("pdf")}
          disabled={exporting}
        >
          PDF
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download size={15} />}
          onClick={() => doExport("excel")}
          disabled={exporting}
        >
          Excel
        </Button>
        <Button
          variant="outlined"
          startIcon={<Download size={15} />}
          onClick={() => doExport("csv")}
          disabled={exporting}
        >
          CSV
        </Button>
      </Paper>

      <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
          {tab} Report{" "}
          {rows.length > 0 && (
            <span style={{ color: "#8AA3B8", fontWeight: 500 }}>
              ({rows.length} rows)
            </span>
          )}
        </Typography>
        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table size="small" sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                {rows.length > 0 &&
                  Object.keys(rows[0]).map((h) => (
                    <TableCell key={h} sx={{ fontSize: 11.5 }}>
                      {h}
                    </TableCell>
                  ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(0, 100).map((r: any, i: number) => (
                <TableRow key={i} hover>
                  {Object.values(r).map((v: any, j: number) => (
                    <TableCell
                      key={j}
                      sx={{
                        fontSize: 12,
                        fontWeight: typeof v === "number" ? 700 : 400,
                      }}
                    >
                      {typeof v === "number" ? fmt(v) : String(v)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <EmptyRow
                  colSpan={9}
                  message="No data for the selected filters"
                />
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(null)}
      >
        <Alert severity="success" onClose={() => setSnack(null)}>
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
