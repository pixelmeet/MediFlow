"use client";

import * as React from "react";
import {
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Activity,
  Building2,
  Download,
  BarChart3,
  Percent,
} from "lucide-react";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { StatCard } from "@/components/shared";
import { Button } from "@/components/ui/button";
import type { AnalyticsSummaryDTO } from "@/lib/services/AnalyticsService";

export default function AdminAnalyticsPage() {
  const [range, setRange] = React.useState<"today" | "7days" | "30days">("7days");
  const [data, setData] = React.useState<AnalyticsSummaryDTO | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/v1/admin/analytics?range=${range}`);
        const json = await res.json();
        if (isMounted && res.ok && json.data) {
          setData(json.data);
        }
      } catch {
        console.error("Failed to load hospital analytics");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [range]);

  const handleExportCsv = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Date Range", data.dateRange],
      ["Start Date", data.startDate],
      ["End Date", data.endDate],
      ["Total Appointments", data.kpis.totalAppointments],
      ["Completed Visits", data.kpis.completedCount],
      ["Completion Rate (%)", data.kpis.completionRate],
      ["Cancelled Count", data.kpis.cancelledCount],
      ["Cancellation Rate (%)", data.kpis.cancellationRate],
      ["No-Show Count", data.kpis.noShowCount],
      ["No-Show Rate (%)", data.kpis.noShowRate],
      ["Average Wait Time (min)", data.kpis.avgWaitTimeMinutes],
      ["Average Consultation (min)", data.kpis.avgConsultationMinutes],
      ["Doctor Utilization (%)", data.kpis.doctorUtilizationRate],
      ["Total Revenue (INR)", data.financials.totalRevenue],
      ["Paid Online (INR)", data.financials.paidOnlineRevenue],
      ["Pay at Clinic (INR)", data.financials.payAtClinicRevenue],
      ["Refunded (INR)", data.financials.refundedAmount],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mediflow-analytics-${data.dateRange}-${data.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] pb-16">
      <AdminNavigation />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Header with Date Range Filter and Export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-[hsl(var(--primary))]" />
              Hospital Analytics &amp; Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
              Comprehensive patient wait metrics, doctor schedule utilization, and clinical revenue volume
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Time Filter Buttons */}
            <div className="flex items-center rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1 shadow-[var(--shadow-sm)]">
              <button
                onClick={() => setRange("today")}
                className={`px-3 py-1 text-xs font-bold rounded-[var(--radius-md)] transition-colors ${
                  range === "today"
                    ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setRange("7days")}
                className={`px-3 py-1 text-xs font-bold rounded-[var(--radius-md)] transition-colors ${
                  range === "7days"
                    ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setRange("30days")}
                className={`px-3 py-1 text-xs font-bold rounded-[var(--radius-md)] transition-colors ${
                  range === "30days"
                    ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                Last 30 Days
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isLoading || !data}
              className="text-xs font-bold flex items-center gap-1.5 shadow-[var(--shadow-sm)]"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* ─── 4 Primary KPI Cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatCard
            label="Total Appointments"
            value={data ? data.kpis.totalAppointments.toString() : "0"}
            icon={<Calendar className="h-5 w-5 text-[hsl(var(--primary))]" />}
          />
          <StatCard
            label="Avg. Wait Time"
            value={data ? `${data.kpis.avgWaitTimeMinutes} min` : "0 min"}
            icon={<Clock className="h-5 w-5 text-[hsl(var(--warning))]" />}
          />
          <StatCard
            label="Doctor Utilization"
            value={data ? `${data.kpis.doctorUtilizationRate}%` : "0%"}
            icon={<Percent className="h-5 w-5 text-[hsl(var(--success))]" />}
          />
          <StatCard
            label="Gross Revenue"
            value={data ? `₹${data.financials.totalRevenue.toLocaleString()}` : "₹0"}
            icon={<IndianRupee className="h-5 w-5 text-[hsl(var(--info))]" />}
          />
        </div>

        {/* ─── Secondary Efficiency & Flow Metrics ────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Completed Rate</p>
              <h4 className="text-lg font-extrabold text-[hsl(var(--success))] mt-0.5">
                {data ? `${data.kpis.completionRate}%` : "0%"}
              </h4>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {data ? `${data.kpis.completedCount} visits finalized` : ""}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[hsl(var(--success-light))] flex items-center justify-center text-[hsl(var(--success))]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">No-Show Rate</p>
              <h4 className="text-lg font-extrabold text-[hsl(var(--danger))] mt-0.5">
                {data ? `${data.kpis.noShowRate}%` : "0%"}
              </h4>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {data ? `${data.kpis.noShowCount} missed check-ins` : ""}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[hsl(var(--danger-light))] flex items-center justify-center text-[hsl(var(--danger))]">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Avg. Consult Time</p>
              <h4 className="text-lg font-extrabold text-[hsl(var(--foreground))] mt-0.5">
                {data ? `${data.kpis.avgConsultationMinutes} min` : "0 min"}
              </h4>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">Per patient consultation</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[hsl(var(--primary-light))] flex items-center justify-center text-[hsl(var(--primary))]">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-4 shadow-[var(--shadow-sm)] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[hsl(var(--muted-foreground))]">Online Payment Share</p>
              <h4 className="text-lg font-extrabold text-[hsl(var(--info))] mt-0.5">
                {data && data.financials.totalRevenue > 0
                  ? `${Math.round((data.financials.paidOnlineRevenue / data.financials.totalRevenue) * 100)}%`
                  : "0%"}
              </h4>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                {data ? `₹${data.financials.paidOnlineRevenue.toLocaleString()} online` : ""}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[hsl(var(--info-light))] flex items-center justify-center text-[hsl(var(--info))]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* ─── Two Column Breakdown Section ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Department Volume & Revenue Breakdown */}
          <div className="lg:col-span-1 rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[hsl(var(--primary))]" />
                Department Load
              </h2>
              <span className="text-xs font-bold text-[hsl(var(--muted-foreground))]">
                {data?.departmentBreakdown.length || 0} Depts
              </span>
            </div>

            {data?.departmentBreakdown && data.departmentBreakdown.length > 0 ? (
              <div className="space-y-4">
                {data.departmentBreakdown.map((dept) => {
                  const percent =
                    data.kpis.totalAppointments > 0
                      ? Math.round((dept.appointmentCount / data.kpis.totalAppointments) * 100)
                      : 0;

                  return (
                    <div key={dept.departmentId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[hsl(var(--foreground))]">{dept.departmentName}</span>
                        <div className="text-right">
                          <span className="font-bold text-[hsl(var(--foreground))]">{dept.appointmentCount} visits</span>
                          <span className="text-[10px] text-[hsl(var(--muted-foreground))] ml-1.5">(₹{dept.revenue.toLocaleString()})</span>
                        </div>
                      </div>

                      <div className="h-2 w-full rounded-full bg-[hsl(var(--muted)/0.5)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--primary))] transition-all duration-300"
                          style={{ width: `${Math.max(8, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                No department records found for this period.
              </div>
            )}
          </div>

          {/* Peak Hourly Traffic Heatmap / Distribution */}
          <div className="lg:col-span-2 rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
              <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[hsl(var(--warning))]" />
                Peak Booking &amp; Traffic Hours
              </h2>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Hospital Daily Operating Schedule</span>
            </div>

            {data?.hourlyDistribution && data.hourlyDistribution.length > 0 ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
                  {data.hourlyDistribution.map((slot) => {
                    const maxCount = Math.max(...data.hourlyDistribution.map((h) => h.count), 1);
                    const intensity = slot.count / maxCount;

                    return (
                      <div
                        key={slot.hour}
                        className={`p-3 rounded-[var(--radius-lg)] border text-center transition-all ${
                          slot.count > 0
                            ? "border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary-light))]"
                            : "border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]"
                        }`}
                      >
                        <span className="text-xs font-mono font-bold text-[hsl(var(--foreground))] block">
                          {slot.hour}
                        </span>
                        <span className="text-sm font-extrabold text-[hsl(var(--primary))] mt-1 block">
                          {slot.count} <span className="text-[10px] font-normal text-[hsl(var(--muted-foreground))]">pts</span>
                        </span>
                        <div className="mt-1.5 h-1 w-full bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[hsl(var(--primary))] rounded-full"
                            style={{ width: `${Math.round(intensity * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[hsl(var(--muted-foreground))]">
                No hourly distribution available.
              </div>
            )}
          </div>
        </div>

        {/* ─── Financial Reconciliation Overview ───────────────── */}
        <div className="rounded-[var(--radius-2xl)] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-[var(--shadow-sm)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[hsl(var(--border))]">
            <h2 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-[hsl(var(--success))]" />
              Revenue Reconciliation &amp; Refunds
            </h2>
            <span className="text-xs font-mono font-bold text-[hsl(var(--foreground))]">
              Net: ₹{data ? (data.financials.totalRevenue - data.financials.refundedAmount).toLocaleString() : "0"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-[var(--radius-xl)] bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
              <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] block">Collected Online</span>
              <p className="text-base font-extrabold text-[hsl(var(--foreground))] mt-1">
                ₹{data ? data.financials.paidOnlineRevenue.toLocaleString() : "0"}
              </p>
            </div>
            <div className="p-4 rounded-[var(--radius-xl)] bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
              <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] block">Pay at Clinic</span>
              <p className="text-base font-extrabold text-[hsl(var(--foreground))] mt-1">
                ₹{data ? data.financials.payAtClinicRevenue.toLocaleString() : "0"}
              </p>
            </div>
            <div className="p-4 rounded-[var(--radius-xl)] bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
              <span className="text-[11px] font-bold text-[hsl(var(--danger))] block">Refunds Processed</span>
              <p className="text-base font-extrabold text-[hsl(var(--danger))] mt-1">
                ₹{data ? data.financials.refundedAmount.toLocaleString() : "0"}
              </p>
            </div>
            <div className="p-4 rounded-[var(--radius-xl)] bg-[hsl(var(--muted)/0.3)] border border-[hsl(var(--border))]">
              <span className="text-[11px] font-bold text-[hsl(var(--muted-foreground))] block">Avg. Ticket Value</span>
              <p className="text-base font-extrabold text-[hsl(var(--foreground))] mt-1">
                ₹{data ? data.financials.avgTicketValue.toLocaleString() : "0"}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
