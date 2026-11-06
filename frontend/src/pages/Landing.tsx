import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
} from "@mui/material";
import {
  Boxes,
  ScanLine,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Sparkles,
  Smartphone,
  Users,
  ChevronRight,
} from "lucide-react";
import PublicNavbar from "../components/PublicNavbar";
import PublicFooter from "../components/PublicFooter";

export default function Landing() {
  const navigate = useNavigate();
  const [currentSection, setCurrentSection] = useState<
    "home" | "features" | "pricing" | "about"
  >("home");

  const scrollTo = (
    id: "home" | "features" | "pricing" | "about" | "login",
  ) => {
    if (id === "login") {
      navigate("/login");
      return;
    }
    setCurrentSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#F5F9FC",
      }}
    >
      {/* 1. Static Public Navbar  */}
      <PublicNavbar currentView={currentSection} onNavigate={scrollTo} />
{/* 
      hero section */}
      <Box
        id="home"
        sx={{
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid #E8EFF5",
          pt: { xs: 5, md: 8 },
          pb: { xs: 6, md: 9 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 4, md: 6 }} alignItems="center">
            {/* Left Column: Headlines & Call to Action */}
            <Grid item xs={12} md={6}>
              <Box sx={{ maxWidth: 540 }}>
                {/* Badge */}
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 1,
                    bgcolor: "#EAF7EF",
                    borderRadius: 2,
                    px: 1.6,
                    py: 0.6,
                    mb: 2.5,
                  }}
                >
                  <Sparkles size={16} color="#23A455" />
                  <Typography
                    sx={{ fontSize: 13, fontWeight: 700, color: "#1B7A3E" }}
                  >
                    Voice of the Farmer JM Feeds Â· JMFeeds BMS
                  </Typography>
                </Box>

                {/* Main Heading  */}
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: 34, sm: 42, md: 48 },
                    fontWeight: 800,
                    lineHeight: 1.15,
                    color: "#123A52",
                    letterSpacing: -0.6,
                    mb: 2.5,
                  }}
                >
                  Smart Inventory
                  <br />
                  for Voice of the Farmer JM FEEDS
                </Typography>

                {/* Subtitle (exact text from Image 1) */}
                <Typography
                  sx={{
                    fontSize: { xs: 15, sm: 16.5 },
                    color: "#47607A",
                    lineHeight: 1.6,
                    mb: 4,
                  }}
                >
                  Track dairy meal, poultry feeds, supplements, and farming supplies. Manage sales,
                  debts, and stock â€” all in one system built for Voice of the Farmer JM FEEDS
                  in Murang'a Town.
                </Typography>

                {/* Action Buttons (exact buttons from Image 1) */}
                <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate("/login")}
                    sx={{
                      bgcolor: "#23A455",
                      color: "#fff",
                      borderRadius: 2,
                      px: 3.8,
                      py: 1.35,
                      fontSize: 15,
                      fontWeight: 700,
                      textTransform: "none",
                      boxShadow: "0 4px 14px rgba(35, 164, 85, 0.3)",
                      "&:hover": {
                        bgcolor: "#1E8D49",
                        boxShadow: "0 6px 20px rgba(35, 164, 85, 0.4)",
                      },
                    }}
                  >
                    Get Started
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => scrollTo("features")}
                    sx={{
                      borderRadius: 2,
                      px: 3.5,
                      py: 1.35,
                      borderColor: "#D4DFE8",
                      color: "#123A52",
                      bgcolor: "#FFFFFF",
                      fontSize: 15,
                      fontWeight: 600,
                      textTransform: "none",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      "&:hover": {
                        bgcolor: "#F5F9FC",
                        borderColor: "#23A455",
                        color: "#23A455",
                      },
                    }}
                  >
                    Learn More
                  </Button>
                </Stack>

                {/* Subtle reassurance points */}
                <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircle2 size={16} color="#23A455" />
                    <Typography
                      sx={{ fontSize: 13, color: "#627D98", fontWeight: 500 }}
                    >
                      KSh Currency Ready
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircle2 size={16} color="#23A455" />
                    <Typography
                      sx={{ fontSize: 13, color: "#627D98", fontWeight: 500 }}
                    >
                      Feeds, Cosmetics & Services
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckCircle2 size={16} color="#23A455" />
                    <Typography
                      sx={{ fontSize: 13, color: "#627D98", fontWeight: 500 }}
                    >
                      Owner-Controlled & Secure
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>

            {/* Right Column: Hero Visual Graphic with cows & burlap feed sacks */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: "0 20px 50px rgba(18, 58, 82, 0.12)",
                  border: "1px solid #E1EAF0",
                  bgcolor: "#F8FAFC",
                }}
              >
                <Box
                  component="img"
                  src={
                    new URL(
                      "../assets/landing_hero_animals.png",
                      import.meta.url,
                    ).href
                  }
                  alt="JMFeeds Animal Feed Management System"
                  sx={{
                    width: "100%",
                    height: "auto",
                    minHeight: { xs: 260, sm: 340, md: 380 },
                    maxHeight: 440,
                    objectFit: "cover",
                    display: "block",
                  }}
                />

                {/* Floating pill badge */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 20,
                    right: 20,
                    bgcolor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid #E3EBF3",
                    borderRadius: 2.5,
                    px: 2.2,
                    py: 1.2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      bgcolor: "#23A455",
                    }}
                  />
                  <Box>
                    <Typography
                      sx={{ fontSize: 13, fontWeight: 700, color: "#123A52" }}
                    >
                      Real-time Feed Ledger
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#627D98" }}>
                      Layers Ã¢â‚¬Â¢ Dairy Ã¢â‚¬Â¢ Broilers Ã¢â‚¬Â¢ Supplements
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 3. Four Feature Cards Row */}
      <Box sx={{ py: { xs: 5, md: 7 }, bgcolor: "#F5F9FC" }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {/* Card 1: Easy Stock Tracking */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E3EBF3",
                  borderRadius: 3,
                  p: 3,
                  textAlign: "center",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 30px rgba(18, 58, 82, 0.08)",
                    borderColor: "#23A455",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    bgcolor: "#EAF7EF",
                    color: "#23A455",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <Boxes size={24} />
                </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#123A52",
                    mb: 0.8,
                  }}
                >
                  Easy Stock Tracking
                </Typography>
                <Typography
                  sx={{ fontSize: 13.5, color: "#627D98", lineHeight: 1.5 }}
                >
                  Real-time stock levels and alerts
                </Typography>
              </Paper>
            </Grid>

            {/* Card 2: Sales & POS */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E3EBF3",
                  borderRadius: 3,
                  p: 3,
                  textAlign: "center",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 30px rgba(18, 58, 82, 0.08)",
                    borderColor: "#23A455",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    bgcolor: "#EAF7EF",
                    color: "#23A455",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <ScanLine size={24} />
                </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#123A52",
                    mb: 0.8,
                  }}
                >
                  Sales & POS
                </Typography>
                <Typography
                  sx={{ fontSize: 13.5, color: "#627D98", lineHeight: 1.5 }}
                >
                  Fast and simple checkout
                </Typography>
              </Paper>
            </Grid>

            {/* Card 3: Detailed Reports */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E3EBF3",
                  borderRadius: 3,
                  p: 3,
                  textAlign: "center",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 30px rgba(18, 58, 82, 0.08)",
                    borderColor: "#23A455",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    bgcolor: "#EAF7EF",
                    color: "#23A455",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <BarChart3 size={24} />
                </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#123A52",
                    mb: 0.8,
                  }}
                >
                  Detailed Reports
                </Typography>
                <Typography
                  sx={{ fontSize: 13.5, color: "#627D98", lineHeight: 1.5 }}
                >
                  Profitability and business insights
                </Typography>
              </Paper>
            </Grid>

            {/* Card 4: Secure & Reliable */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={0}
                sx={{
                  bgcolor: "#FFFFFF",
                  border: "1px solid #E3EBF3",
                  borderRadius: 3,
                  p: 3,
                  textAlign: "center",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 30px rgba(18, 58, 82, 0.08)",
                    borderColor: "#23A455",
                  },
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    bgcolor: "#EAF7EF",
                    color: "#23A455",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <ShieldCheck size={24} />
                </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 16,
                    color: "#123A52",
                    mb: 0.8,
                  }}
                >
                  Secure & Reliable
                </Typography>
                <Typography
                  sx={{ fontSize: 13.5, color: "#627D98", lineHeight: 1.5 }}
                >
                  Your data is safe and always available
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 4. Deep Features Section */}
      <Box
        id="features"
        sx={{
          py: { xs: 7, md: 10 },
          bgcolor: "#FFFFFF",
          borderTop: "1px solid #E3EBF3",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 680, mx: "auto", mb: 6 }}>
            <Typography
              sx={{
                color: "#23A455",
                fontWeight: 700,
                fontSize: 13.5,
                textTransform: "uppercase",
                letterSpacing: 1,
                mb: 1,
              }}
            >
              What JMFeeds Does for Voice of the Farmer JM FEEDS
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: 28, md: 15 },
                fontWeight: 900,
                color: "#123A52",
                mb: 2,
              }}
            >
              Everything Needed to Run the Feed & Cosmetics Shop Profitably
            </Typography>
            {/* <Typography sx={{ fontSize: 15, color: '#627D98' }}>
              Unlike generic spreadsheets or rigid retail tools, JMFeeds was architected to handle the real-world complexity of agricultural feeds, multiple units, customer credit, and expiry controls.
            </Typography> */}
          </Box>

          <Grid container spacing={4}>
            {[
              {
                icon: <Boxes size={22} color="#23A455" />,
                title: "Multi-Unit Conversions & Batch Control",
                desc: "Purchase in bulk 50kg or 70kg bags and sell by the bag, kilogram, or repackaged scoop without losing track of your real cost of goods sold.",
              },
              {
                icon: <ScanLine size={22} color="#23A455" />,
                title: "Fast Counter Checkout with Credit Sales",
                desc: "Process retail and wholesale sales in seconds. Record cash, bank transfers, or credit sales with strict customer limits and instant debt recording.",
              },
              {
                icon: <Users size={22} color="#23A455" />,
                title: "Customer Debts & Ageing Analysis",
                desc: "Track who bought on credit, what products they took, when payment is due, and track 30/60/90+ day ageing so uncollected money never hurts cash flow.",
              },
              {
                icon: <TrendingUp size={22} color="#23A455" />,
                title: "Real-Time Gross & Estimated Net Profit",
                desc: "Calculate exact profit per bag or item based on historical purchase costs. Deduct operating expenses cleanly to see true net earnings.",
              },
              {
                icon: <ShieldCheck size={22} color="#23A455" />,
                title: "Immutable Transactions & Owner Approvals",
                desc: "Prevent operator fraud: finalized transactions cannot be deleted. Corrections require operator request and explicit owner authorization with auditable reversals.",
              },
              {
                icon: <Layers size={22} color="#23A455" />,
                title: "Optional Cosmetic Services & Commissions",
                desc: "Easily activate cosmetic beauty services, salon commissions, and product consumption when you expand without cluttering the feed operations.",
              },
            ].map((f, idx) => (
              <Grid key={idx} item xs={12} sm={6} md={4}>
                <Box
                  sx={{
                    p: 3.5,
                    borderRadius: 3,
                    bgcolor: "#FBFDFE",
                    border: "1px solid #E8EFF5",
                    height: "100%",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "#23A455",
                      bgcolor: "#FFFFFF",
                      boxShadow: "0 8px 24px rgba(18,58,82,0.06)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2,
                      bgcolor: "#EAF7EF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 2,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#123A52",
                      mb: 1,
                    }}
                  >
                    {f.title}
                  </Typography>
                  <Typography
                    sx={{ fontSize: 13.5, color: "#627D98", lineHeight: 1.6 }}
                  >
                    {f.desc}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 5. Pricing Section */}
      {/* <Box id="pricing" sx={{ py: { xs: 7, md: 10 }, bgcolor: '#F5F9FC', borderTop: '1px solid #E3EBF3' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: 640, mx: 'auto', mb: 6 }}>
            <Typography sx={{ color: '#23A455', fontWeight: 700, fontSize: 13.5, textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
              Transparent Business Pricing
            </Typography>
            <Typography variant="h2" sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 800, color: '#123A52', mb: 1.5 }}>
              Simple, Predictable Plans in Kenyan Shillings
            </Typography>
            <Typography sx={{ fontSize: 14.5, color: '#627D98' }}>
              No hidden commission percentages or unpredictable gateway fees. Everything you need to scale.
            </Typography>
          </Box>

          <Grid container spacing={4} justifyContent="center">
            {/* Starter Plan */}
      {/* <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3.5,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E3EBF3',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#123A52', mb: 0.5 }}>
                  Starter Single Shop
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#627D98', mb: 3 }}>
                  Ideal for an independent animal feed dealer or agrovet.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 3 }}>
                  <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#123A52' }}>
                    KSh 1,500
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#627D98' }}>/ month</Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={1.5} sx={{ mb: 4, flex: 1 }}>
                  {['Single Store Location', 'Real-Time Inventory Ledger', 'POS Cash & Bank Checkout', 'Customer Debt Tracking', 'Daily Closing Reconciliation'].map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <CheckCircle2 size={16} color="#23A455" />
                      <Typography sx={{ fontSize: 13, color: '#47607A' }}>{item}</Typography>
                    </Box>
                  ))}
                </Stack>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/login')}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: '#23A455',
                    color: '#23A455',
                    '&:hover': { bgcolor: '#EAF7EF' },
                  }}
                >
                  Get Started
                </Button>
              </Paper>
            </Grid> */}

      {/* Pro Growth Plan  */}
      {/* <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3.5,
                  bgcolor: '#FFFFFF',
                  border: '2px solid #23A455',
                  boxShadow: '0 16px 40px rgba(35, 164, 85, 0.12)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                <Box sx={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)' }}>
                  <Chip
                    label="MOST POPULAR FOR AGROVETS"
                    size="small"
                    sx={{ bgcolor: '#23A455', color: '#fff', fontWeight: 800, fontSize: 11, px: 1 }}
                  />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#123A52', mb: 0.5 }}>
                  Growth Retailer
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#627D98', mb: 3 }}>
                  Full multi-role suite with fraud protection and reports.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 3 }}>
                  <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#123A52' }}>
                    KSh 3,500
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#627D98' }}>/ month</Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={1.5} sx={{ mb: 4, flex: 1 }}>
                  {[
                    'Everything in Starter',
                    'Multiple Operator Accounts',
                    'Immutable Audit Trail & Approvals',
                    'Supplier Orders & Payables',
                    'Profit & Loss Intelligence (COGS)',
                    'Cosmetic Services & Commissions Module',
                  ].map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <CheckCircle2 size={16} color="#23A455" />
                      <Typography sx={{ fontSize: 13, color: '#123A52', fontWeight: 600 }}>{item}</Typography>
                    </Box>
                  ))}
                </Stack>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/login')}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    bgcolor: '#23A455',
                    boxShadow: '0 4px 14px rgba(35, 164, 85, 0.35)',
                    '&:hover': { bgcolor: '#1E8D49' },
                  }}
                >
                  Start Business Trial
                </Button>
              </Paper>
            </Grid> */}

      {/* Enterprise / Wholesale Plan */}
      {/* <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  borderRadius: 3.5,
                  bgcolor: '#FFFFFF',
                  border: '1px solid #E3EBF3',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 18, color: '#123A52', mb: 0.5 }}>
                  Wholesale & Multi-Branch
                </Typography>
                <Typography sx={{ fontSize: 13, color: '#627D98', mb: 3 }}>
                  For high-volume distributors and multi-counter branches.
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 3 }}>
                  <Typography sx={{ fontSize: 32, fontWeight: 800, color: '#123A52' }}>
                    KSh 7,500
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: '#627D98' }}>/ month</Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={1.5} sx={{ mb: 4, flex: 1 }}>
                  {[
                    'Everything in Growth Retailer',
                    'Unlimited Operator Accounts',
                    'Dedicated Automated DB Backups',
                    'Wholesale Pricing Tiers & Discounts',
                    'Advanced Custom Excel & PDF Reports',
                    'Priority 24/7 Telephone Support',
                  ].map((item) => (
                    <Box key={item} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                      <CheckCircle2 size={16} color="#23A455" />
                      <Typography sx={{ fontSize: 13, color: '#47607A' }}>{item}</Typography>
                    </Box>
                  ))}
                </Stack>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/login')}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderColor: '#D4DFE8',
                    color: '#123A52',
                    '&:hover': { bgcolor: '#F5F9FC', borderColor: '#23A455', color: '#23A455' },
                  }}
                >
                  Contact Sales
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box> */}

      {/* 6. About Section */}
      <Box
        id="about"
        sx={{
          py: { xs: 7, md: 10 },
          bgcolor: "#FFFFFF",
          borderTop: "1px solid #E3EBF3",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ maxWidth: 520 }}>
                <Typography
                  sx={{
                    color: "#23A455",
                    fontWeight: 700,
                    fontSize: 13.5,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    mb: 1,
                  }}
                >
                  About JMFeeds
                </Typography>
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: 28, md: 36 },
                    fontWeight: 800,
                    color: "#123A52",
                    mb: 2.5,
                  }}
                >
                  Built Specifically for Voice of the Farmer JM FEEDS
                </Typography>
                <Typography
                  sx={{
                    fontSize: 14.5,
                    color: "#47607A",
                    lineHeight: 1.7,
                    mb: 2,
                  }}
                >
                  Voice of the Farmer JM FEEDS in Murang'a Town handles dairy meal, layers mash,
                  broiler finisher, and farming supplies â€” all with credit customers,
                  M-Pesa payments, and daily cash reconciliations. 
                </Typography>
                <Typography
                  sx={{
                    fontSize: 14.5,
                    color: "#47607A",
                    lineHeight: 1.7,
                    mb: 3.5,
                  }}
                >
                  The owner can see every bag that entered or left the store,
                  who owes money, which products generate the best margins, and
                  whether the day's cash matches the sales records â€” all from
                  one dashboard.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate("/login")}
                  endIcon={<ArrowRight size={18} />}
                  sx={{
                    bgcolor: "#23A455",
                    color: "#fff",
                    borderRadius: 2,
                    px: 3.5,
                    py: 1.2,
                    fontWeight: 700,
                    textTransform: "none",
                    "&:hover": { bgcolor: "#1E8D49" },
                  }}
                >
                  Experience the System Today
                </Button>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{
                  bgcolor: "#FBFDFE",
                  border: "1px solid #E1EAF0",
                  borderRadius: 3.5,
                  p: { xs: 3, sm: 4 },
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 19,
                    color: "#123A52",
                    mb: 2,
                  }}
                >
                  System Commitments
                </Typography>
                <Stack spacing={2.5}>
                  {[
                    {
                      title: "Zero Stock Discrepancies",
                      desc: "Every bag entering or leaving the shop requires a verified stock movement record linked to an invoice, receipt, or approved adjustment.",
                    },
                    {
                      title: "Owner-Controlled Fraud Prevention",
                      desc: "Operators cannot silently delete or edit sales. Any reversal requires documented justification and owner approval.",
                    },
                    {
                      title: "Accurate Cost Accounting",
                      desc: "Historical purchase costs remain locked into sales records, giving you mathematically verified gross margins rather than guesswork.",
                    },
                    {
                      title: "Private & Secure",
                      desc: "Your accounts and passwords are encrypted with bcrypt. The owner can update their credentials at any time to guarantee full privacy.",
                    },
                  ].map((item, idx) => (
                    <Box key={idx} sx={{ display: "flex", gap: 2 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          bgcolor: "#EAF7EF",
                          color: "#23A455",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          mt: 0.3,
                        }}
                      >
                        <CheckCircle2 size={16} />
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: 14.5,
                            color: "#123A52",
                            mb: 0.3,
                          }}
                        >
                          {item.title}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 13,
                            color: "#627D98",
                            lineHeight: 1.5,
                          }}
                        >
                          {item.desc}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 7. Comprehensive Professional Footer */}
      <PublicFooter onNavigate={scrollTo} />
    </Box>
  );
}
