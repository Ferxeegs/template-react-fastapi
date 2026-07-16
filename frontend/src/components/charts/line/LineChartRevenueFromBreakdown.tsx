import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

type BreakdownItem = {
  period: string;
  label: string;
  count: number;
  revenue: number;
};

export default function LineChartRevenueFromBreakdown(props: {
  breakdown: BreakdownItem[];
  height?: number;
}) {
  const height = props.height ?? 300;
  const categories = props.breakdown?.map((b) => b.label) ?? [];
  const data = props.breakdown?.map((b) => b.revenue) ?? [];

  const formatCurrency = (amount: number): string => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const options: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "line",
      height,
      toolbar: { show: false },
    },
    colors: ["#10b981"],
    legend: { show: false },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.55, opacityTo: 0.1 },
    },
    markers: {
      size: 5,
      strokeColors: "#10b981",
      strokeWidth: 2,
      hover: { size: 7 },
    },
    dataLabels: { enabled: false },
    grid: {
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { fontSize: "12px" } },
    },
    yaxis: {
      title: { text: "Pendapatan (Rp)" },
      labels: {
        formatter: (val: number) => {
          if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}J`;
          if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)}K`;
          return `Rp ${val.toFixed(0)}`;
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
  };

  return (
    <Chart
      options={options}
      series={[
        {
          name: "Pendapatan",
          data,
        },
      ]}
      type="line"
      height={height}
    />
  );
}

