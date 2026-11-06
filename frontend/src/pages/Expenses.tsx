import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Snackbar,
  Alert,
  Chip,
} from "@mui/material";
import { Plus, UserCheck } from "lucide-react";
import api from "../api/client";
import { fmt, fmtDate } from "../utils/format";
import { exportCSV, exportExcel, exportPDF, EmptyRow } from "../components/ui";
import { useAuthStore } from "../store/useAuthStore";

const CATEGORIES = [
  "Rent",
  "Transport",
  "Electricity",
  "Water",
  "Salaries & Wages",
  "Repairs",
  "Packaging",
  "Communication",
  "Other",
];

export default function Expenses() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isOwner = user?.role === "OWNER" || user?.role === "ADMIN";

  const [tab, setTab] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<string>("ALL");
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);
  const [form, setForm] = useState({
    category: "Rent",
    description: "",
    amount: "",
    paymentMethod: "CASH",
    reference: "",
  });

  // Fetch users for owner filtering
  const { data: users = [] } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => (await api.get("/users")).data,
    enabled: isOwner,
  });

  const queryUserId = isOwner
    ? (selectedOperator !== "ALL" ? selectedOperator : "")
    : (user?.id || "");

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", queryUserId],
    queryFn: async () => {
      const uParam = queryUserId ? `?userId=${queryUserId}` : "";
      return (await api.get(`/expenses${uParam}`)).data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, amount: Number(form.amount) };
      return (await api.post("/expenses", payload)).data;
    },
    onSuccess: () => {
      setDialog(false);
      setSnack({ msg: "Expense recorded", type: "success" });
      queryClient.invalidateQueries();
    },
    onError: (e: any) =>
      setSnack({ msg: e.response?.data?.error ?? "Failed", type: "error" }),
  });

  const rows = (data?.expenses ?? []).map((e: any) => ({
    Date: fmtDate(e.createdAt),
    Category: e.category,
    Description: e.description,
    Amount: Number(e.amount),
    Method: e.paymentMethod,
    RecordedBy: e.user?.fullName ?? "",
  }));

  const exportAll = async (type: "pdf" | "excel" | "csv") => {
    const f = `jmfeeds-expenses-${new Date().toISOString().slice(0, 10)}`;
    if (type === "pdf") await exportPDF(f, "Expenses Report", rows);
    else if (type === "excel") await exportExcel(f, rows, "Expenses");
    else await exportCSV(f, rows);
    setSnack({ msg: "Export downloaded", type: "success" });
  };

  return (
    <Box>
      <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            gap: 1,
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {["All Expenses", "By Category"].map((l, i) => (
              <Button
                key={l}
                variant={tab === i ? "contained" : "text"}
                onClick={() => setTab(i)}
                sx={{ color: tab === i ? "#fff" : "#47607A" }}
              >
                {l}
              </Button>
            ))}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => exportAll("pdf")}
            >
              PDF
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => exportAll("excel")}
            >
              Excel
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => exportAll("csv")}
            >
              CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setDialog(true)}
              sx={{ whiteSpace: "nowrap" }}
            >
              Record Expense
            </Button>
          </Box>
        </Box>

        {tab === 0 && (
          <>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                mb: 2,
              }}
            >
              <Box
                sx={{
                  bgcolor: "#F4F0FB",
                  borderRadius: 2,
                  p: 1.5,
                  display: "inline-block",
                }}
              >
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  Total Expenses {isOwner && selectedOperator === 'ALL' ? '(All Staff)' : ''}
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 19 }}>
                  {fmt(data?.totalAmount ?? 0)}
                </Typography>
              </Box>

              {isOwner ? (
                <TextField
                  select
                  size="small"
                  label="Filter by Staff / Operator"
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  sx={{ minWidth: 230 }}
                >
                  <MenuItem value="ALL">ðŸ¢ All Staff (Combined)</MenuItem>
                  {users.map((u: any) => (
                    <MenuItem key={u.id} value={u.id}>
                      ðŸ‘¤ {u.fullName} ({u.role})
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Chip
                  icon={<UserCheck size={15} />}
                  label={`Showing your expenses (${user?.fullName || user?.username})`}
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ fontWeight: 600, fontSize: 12 }}
                />
              )}
            </Box>
            <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11.5 }}>Date</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>Category</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>Description</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>Amount</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>Method</TableCell>
                    <TableCell sx={{ fontSize: 11.5 }}>Recorded By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(data?.expenses ?? []).map((e: any) => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ fontSize: 12 }}>
                        {fmtDate(e.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={e.category}
                          sx={{
                            bgcolor: "#EAF3FB",
                            fontWeight: 700,
                            fontSize: 10.5,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{e.description}</TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>
                        {fmt(e.amount)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {e.paymentMethod}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {e.user?.fullName}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(data?.expenses ?? []).length === 0 && (
                    <EmptyRow colSpan={6} message="No expenses recorded" />
                  )}
                </TableBody>
              </Table>
            </Box>
          </>
        )}

        {tab === 1 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 2,
              mt: 1,
            }}
          >
            {Object.entries(data?.byCategory ?? {}).map(([cat, amt]: any) => (
              <Box
                key={cat}
                sx={{ border: "1px solid #E3EBF3", borderRadius: 2, p: 2 }}
              >
                <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                  {cat}
                </Typography>
                <Typography
                  sx={{ fontSize: 18, fontWeight: 800, color: "#C02828" }}
                >
                  {fmt(amt)}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  {data.totalAmount
                    ? Math.round((Number(amt) / Number(data.totalAmount)) * 100)
                    : 0}
                  % of total
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Add expense */}
      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Record Expense</DialogTitle>
        <DialogContent
          sx={{
            pt: "12px !important",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <TextField
            select
            size="small"
            label="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            size="small"
            type="number"
            label="Amount (KSh)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <TextField
            select
            size="small"
            label="Payment Method"
            value={form.paymentMethod}
            onChange={(e) =>
              setForm({ ...form, paymentMethod: e.target.value })
            }
          >
            {["CASH", "BANK", "OTHER"].map((m) => (
              <MenuItem key={m} value={m}>
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Reference (receipt no.)"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form.description || !form.amount || save.isPending}
            onClick={() => save.mutate()}
          >
            Save Expense
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
      >
        <Alert severity={snack?.type} onClose={() => setSnack(null)}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
