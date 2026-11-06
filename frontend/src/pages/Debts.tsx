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
import api from "../api/client";
import { fmt, fmtDate, fmtNum } from "../utils/format";
import { StatusChip, EmptyRow } from "../components/ui";

export default function Debts() {
  const queryClient = useQueryClient();
  const [repayDialog, setRepayDialog] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [snack, setSnack] = useState<{ msg: string; type: any } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: async () => (await api.get("/debts")).data,
  });

  const repay = useMutation({
    mutationFn: async () => {
      const payload = {
        customerId: repayDialog.id,
        amount: Number(amount),
        paymentMethod: method,
        reference: reference || null,
      };
      return (await api.post("/debts/repay", payload)).data;
    },
    onSuccess: (res) => {
      setRepayDialog(null);
      setAmount("");
      setReference("");
      setSnack({
        msg: `Repayment recorded. New balance: ${fmt(res.updatedCustomer.outstandingDebt)}`,
        type: "success",
      });
      queryClient.invalidateQueries();
    },
    onError: (e: any) =>
      setSnack({ msg: e.response?.data?.error ?? "Failed", type: "error" }),
  });

  const overdue = (data?.debtors ?? []).filter(
    (d: any) => d.status === "Overdue",
  ).length;

  return (
    <Box>
      {/* Summary */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Paper sx={{ borderRadius: 2.5, p: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Total Outstanding Debt
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#C02828" }}>
            {fmt(data?.totalOutstanding ?? 0)}
          </Typography>
        </Paper>
        <Paper sx={{ borderRadius: 2.5, p: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Customers With Debt
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800 }}>
            {data?.debtors?.length ?? 0}
          </Typography>
        </Paper>
        <Paper sx={{ borderRadius: 2.5, p: 2 }}>
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
            Overdue Accounts
          </Typography>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#B26A00" }}>
            {overdue}
          </Typography>
        </Paper>
      </Box>

      <Paper sx={{ borderRadius: 2.5, p: { xs: 1.5, sm: 2.5 } }}>
        <Typography sx={{ fontWeight: 700, mb: 2 }}>Debt Management</Typography>
        <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: 11.5 }}>Customer</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Total Credit</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Paid</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Balance</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Due Date</TableCell>
                <TableCell sx={{ fontSize: 11.5 }}>Status</TableCell>
                <TableCell sx={{ fontSize: 11.5 }} align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.debtors ?? []).map((d: any) => (
                <TableRow key={d.id} hover>
                  <TableCell>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                      {d.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                      {d.phone}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {fmt(d.totalCredit)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: "#1B7A3E" }}>
                    {fmt(d.paid)}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: 12, fontWeight: 800, color: "#C02828" }}
                  >
                    {fmt(d.balance)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{d.dueDate}</TableCell>
                  <TableCell>
                    <StatusChip status={d.status} />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => {
                        setRepayDialog(d);
                        setAmount(String(d.balance));
                      }}
                    >
                      Record Repayment
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(data?.debtors ?? []).length === 0 && (
                <EmptyRow
                  colSpan={7}
                  message="No outstanding debts — all customers are settled"
                />
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Repayment dialog */}
      <Dialog
        open={!!repayDialog}
        onClose={() => setRepayDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Record Repayment — {repayDialog?.name}</DialogTitle>
        <DialogContent
          sx={{
            pt: "12px !important",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: "#FDECEC",
              p: 1.5,
              borderRadius: 2,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              Outstanding balance
            </Typography>
            <Typography
              sx={{ fontWeight: 800, fontSize: 18, color: "#C02828" }}
            >
              {fmt(repayDialog?.balance)}
            </Typography>
          </Box>
          <TextField
            size="small"
            type="number"
            label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <TextField
            select
            size="small"
            label="Payment Method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {["CASH", "BANK", "OTHER"].map((m) => (
              <MenuItem key={m} value={m}>
                {m.charAt(0) + m.slice(1).toLowerCase()}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Reference (optional)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Alert severity="info" sx={{ fontSize: 12 }}>
            Repayments reduce customer debt they are not recorded as sales
            revenue.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepayDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => repay.mutate()}
            disabled={!amount || Number(amount) <= 0 || repay.isPending}
          >
            {repay.isPending ? "Saving…" : "Save Repayment"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
      >
        <Alert severity={snack?.type} onClose={() => setSnack(null)}>
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
