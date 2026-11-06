import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Chip, Grid, CircularProgress } from "@mui/material";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  ShoppingCart,
  Package,
  Boxes,
  Wallet,
  BadgeDollarSign,
  TrendingUp,
  Plus,
  PackagePlus,
  ClipboardList,
  UserRoundPlus,
  Receipt,
  Landmark,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import api from "../api/client";
import { fmt } from "../utils/format";
import { StatCard, PageLoading } from "../components/ui";

const quickActions = [
  { label: "New Sale", icon: <ShoppingCart size={20} />, path: "/pos" },
  {
    label: "Receive Stock",
    icon: <PackagePlus size={20} />,
    path: "/purchases",
  },
  { label: "Add Product", icon: <Plus size={20} />, path: "/inventory" },
  {
    label: "Register Customer",
    icon: <UserRoundPlus size={20} />,
    path: "/customers",
  },
  { label: "Record Repayment", icon: <Wallet size={20} />, path: "/debts" },
  { label: "View Reports", icon: <BarChart3 size={20} />, path: "/reports" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard/stats")).data,
    refetchInterval: 120_000,
  });

  if (isLoading || !data) return <PageLoading />;
  const c = data.cards;

  return (
    <Box>
      {/* Summary cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            icon={<ShoppingCart size={17} />}
            title="Today's Sales"
            value={fmt(c.todaySales.value)}
            changePct={c.todaySales.changePct}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            icon={<Package size={17} />}
            title="Purchases"
            value={fmt(c.purchases.value)}
            changePct={c.purchases.changePct}
            bg="#EAF3FB"
            iconColor="#2D9CDB"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            icon={<Boxes size={17} />}
            title="Stock Value"
            value={fmt(c.stockValue.value)}
            bg="#F4F0FB"
            iconColor="#7C5CBF"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            icon={<Wallet size={17} />}
            title="Customer Debt"
            value={fmt(c.customerDebt.value)}
            bg="#FDECEC"
            iconColor="#E23B3B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            icon={<BadgeDollarSign size={17} />}
            title="Gross Profit"
            value={fmt(c.grossProfit.value)}
            bg="#EAF7EF"
            iconColor="#23A455"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <StatCard
            icon={<TrendingUp size={17} />}
            title="Net Profit"
            value={fmt(c.netProfit.value)}
            bg="#EAF7EF"
            iconColor="#1B7A3E"
          />
        </Grid>
      </Grid>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 2.5,
        }}
      >
        {/* Sales & Profit Trend */}
        <Box flex={1.65}>
          <Box
            sx={{
              bgcolor: "#fff",
              border: "1px solid #E3EBF3",
              borderRadius: 2.5,
              p: 2.5,
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                Sales & Profit Trend
              </Typography>
              <Box sx={{ display: "flex", gap: 2, fontSize: 12 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: "#2D9CDB",
                    }}
                  />{" "}
                  Sales Revenue
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      bgcolor: "#23A455",
                      borderRadius: 0.5,
                    }}
                  />{" "}
                  Gross Profit
                </Box>
              </Box>
            </Box>
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={data.trend} barGap={2}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#EDF2F7"
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "#8AA3B8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8AA3B8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <ChartTooltip formatter={(v: any) => fmt(v)} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="revenue"
                  name="Sales Revenue"
                  fill="#2D9CDB"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="profit"
                  name="Gross Profit"
                  fill="#B7E4C7"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#123A52"
                  strokeWidth={2}
                  dot={false}
                  name="Revenue Line"
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>

          {/* Quick Actions */}
          <Box
            sx={{
              bgcolor: "#fff",
              border: "1px solid #E3EBF3",
              borderRadius: 2.5,
              p: 2.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 2 }}>
              Quick Actions
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(3, 1fr)",
                  md: "repeat(6, 1fr)",
                },
                gap: 1.5,
              }}
            >
              {quickActions.map((a) => (
                <Box
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  sx={{
                    border: "1px solid #E3EBF3",
                    borderRadius: 2,
                    py: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    alignItems: "center",
                    cursor: "pointer",
                    bgcolor: "#F5F9FC",
                    "&:hover": { borderColor: "#23A455", bgcolor: "#EAF7EF" },
                  }}
                >
                  <Box sx={{ color: "#123A52" }}>{a.icon}</Box>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#47607A",
                      textAlign: "center",
                    }}
                  >
                    {a.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Right column */}
        <Box
          flex={1}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          {/* Low stock */}
          <Box
            sx={{
              bgcolor: "#fff",
              border: "1px solid #E3EBF3",
              borderRadius: 2.5,
              p: 2.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>
              Low Stock Alerts
            </Typography>
            {(data.lowStockAlerts ?? []).slice(0, 4).map((p: any) => (
              <Box
                key={p.id ?? p.name}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  py: 0.9,
                  borderBottom: "1px solid #F0F4F8",
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 1.5,
                    bgcolor: "#FDECEC",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Package size={15} color="#E23B3B" />
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                  {p.name}
                </Typography>
                <Chip
                  size="small"
                  label={`${p.stockRemaining} left`}
                  sx={{
                    bgcolor: "#FDECEC",
                    color: "#C02828",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              </Box>
            ))}
          </Box>

          {/* Pending approvals */}
          <Box
            sx={{
              bgcolor: "#fff",
              border: "1px solid #E3EBF3",
              borderRadius: 2.5,
              p: 2.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1.5 }}>
              Pending Approvals
            </Typography>
            {[
              {
                label: "Cancellation Requests",
                count: data.pendingApprovals.cancellationRequests,
                color: "#F2994A",
              },
              {
                label: "Reversal Requests",
                count: data.pendingApprovals.reversalRequests,
                color: "#2D9CDB",
              },
              {
                label: "Expiry Alerts",
                count: data.pendingApprovals.expiryAlerts,
                color: "#E23B3B",
              },
            ].map((r) => (
              <Box
                key={r.label}
                onClick={() => navigate("/approvals")}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1,
                  px: 1,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "#F5F9FC" },
                }}
              >
                <Typography
                  sx={{
                    fontSize: 13,
                    color: "#47607A",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <RefreshCw size={14} color={r.color} /> {r.label}
                </Typography>
                <Chip
                  size="small"
                  label={r.count}
                  sx={{
                    bgcolor: r.color,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 11.5,
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
