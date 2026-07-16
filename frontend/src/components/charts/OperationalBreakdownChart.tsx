import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export type PeriodType = "daily" | "weekly" | "monthly";

type BreakdownItem = {
  period: string;
  label: string;
  count: number;
  revenue: number;
};

type Variant = "transactions" | "revenue";

export default function OperationalBreakdownChart(props: {
  period: PeriodType;
  breakdown: BreakdownItem[];
  variant: Variant;
  height?: number;
}) {
  const { period, breakdown, variant } = props;
  const height = props.height ?? 300;

  const categories = breakdown?.map((item) => item.label) ?? [];
  const data =
    variant === "transactions"
      ? breakdown?.map((item) => item.count) ?? []
      : breakdown?.map((item) => item.revenue) ?? [];

  const formatCurrency = (amount: number): string => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const options: ApexOptions =
    variant === "transactions"
      ? {
          colors: ["#465fff"],
          chart: {
            fontFamily: "Outfit, sans-serif",
            type: "bar",
            height,
            toolbar: { show: false },
          },
          plotOptions: {
            bar: {
              horizontal: false,
              columnWidth: period === "daily" ? "50%" : "60%",
              borderRadius: 5,
              borderRadiusApplication: "end",
            },
          },
          dataLabels: {
            enabled: true,
            formatter: (val: number) => val.toString(),
            style: {
              fontSize: "12px",
              fontWeight: 600,
            },
          },
          stroke: {
            show: true,
            width: 2,
            colors: ["transparent"],
          },
          xaxis: {
            categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
              style: { fontSize: "12px" },
              // Weekly labels cenderung cukup panjang, supaya tidak tumpang tindih
              rotate: period === "daily" || period === "weekly" ? -45 : 0,
              rotateAlways: period === "daily" || period === "weekly",
            },
          },
          yaxis: {
            title: {
              text: "Jumlah Transaksi",
              style: { fontSize: "12px", fontWeight: 600 },
            },
            labels: {
              formatter: (val: number) => val.toString(),
            },
          },
          grid: {
            yaxis: { lines: { show: true } },
            xaxis: { lines: { show: false } },
          },
          fill: { opacity: 1 },
          tooltip: {
            y: { formatter: (val: number) => `${val} transaksi` },
          },
        }
      : {
          colors: ["#10b981"],
          chart: {
            fontFamily: "Outfit, sans-serif",
            type: "line",
            height,
            toolbar: { show: false },
          },
          stroke: {
            curve: "smooth",
            width: 3,
          },
          fill: {
            type: "gradient",
            gradient: { opacityFrom: 0.6, opacityTo: 0.1 },
          },
          markers: {
            size: 5,
            strokeColors: "#10b981",
            strokeWidth: 2,
            hover: { size: 7 },
          },
          xaxis: {
            categories,
            axisBorder: { show: false },
            axisTicks: { show: false },
            labels: {
              style: { fontSize: "12px" },
              // Weekly labels cenderung cukup panjang, supaya lebih rapih
              rotate: period === "daily" || period === "weekly" ? -45 : 0,
              rotateAlways: period === "daily" || period === "weekly",
            },
          },
          yaxis: {
            title: {
              text: "Pendapatan (Rp)",
              style: { fontSize: "12px", fontWeight: 600 },
            },
            labels: {
              formatter: (val: number) => {
                if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}J`;
                if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}K`;
                return `Rp ${val.toFixed(0)}`;
              },
            },
          },
          grid: {
            yaxis: { lines: { show: true } },
            xaxis: { lines: { show: false } },
          },
          tooltip: {
            y: { formatter: (val: number) => formatCurrency(val) },
          },
        };

  const series = [
    {
      name: variant === "transactions" ? "Jumlah Transaksi" : "Pendapatan",
      data,
    },
  ];

  return (
    <Chart
      options={options}
      series={series}
      type={variant === "transactions" ? "bar" : "line"}
      height={height}
    />
  );
}

