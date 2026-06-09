import ReactECharts from "echarts-for-react";
import type { PnlChartPoint } from "@polyand/types";
import { formatAmount } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface PnlChartProps {
  points: PnlChartPoint[];
}

export function PnlChart({ points }: PnlChartProps) {
  const option = {
    animation: false,
    grid: { left: 46, right: 16, top: 24, bottom: 28 },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value: number) => formatAmount(value, "usd")
    },
    xAxis: {
      type: "category",
      data: points.map((point) => point.date),
      axisLabel: { fontSize: 10 }
    },
    yAxis: {
      type: "value",
      axisLabel: {
        fontSize: 10,
        formatter: (value: number) => formatAmount(value, "usd")
      }
    },
    series: [
      {
        name: "Daily PnL",
        type: "bar",
        data: points.map((point) => Number(point.dailyPnl)),
        itemStyle: { color: "#2454d6" }
      },
      {
        name: "Cumulative PnL",
        type: "line",
        data: points.map((point) => Number(point.cumulativePnl)),
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#11845b", width: 2 }
      }
    ]
  };

  return (
    <div className="mt-3 rounded-md border border-line bg-white">
      <SectionHeader
        title="PnL Chart"
        description="Daily bars show PnL changes; the line shows cumulative reconstructed PnL."
      />
      <div className="h-[220px]">
        <ReactECharts option={option} style={{ height: "220px", width: "100%" }} />
      </div>
    </div>
  );
}
