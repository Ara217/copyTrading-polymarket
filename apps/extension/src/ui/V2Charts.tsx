import ReactECharts from "echarts-for-react";
import type { DrawdownChartPoint, ProfitDistributionBucket, WinLossChartPoint } from "@polyand/types";
import { formatAmount } from "../utils/format";
import { SectionHeader } from "./InfoTooltip";

interface V2ChartsProps {
  drawdown: DrawdownChartPoint[];
  distribution: ProfitDistributionBucket[];
  winLoss: WinLossChartPoint[];
}

export function V2Charts({ drawdown, distribution, winLoss }: V2ChartsProps) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-3">
      <MiniChart
        title="Drawdown"
        description="Distance below prior cumulative PnL peak. Lower is better."
        option={{
          animation: false,
          grid: { left: 42, right: 8, top: 18, bottom: 24 },
          xAxis: { type: "category", data: drawdown.map((point) => point.date), axisLabel: { fontSize: 9 } },
          yAxis: {
            type: "value",
            axisLabel: { fontSize: 9, formatter: (value: number) => formatAmount(value, "usd") }
          },
          series: [{ type: "line", symbol: "none", data: drawdown.map((point) => Number(point.drawdown)), lineStyle: { color: "#b42318" } }]
        }}
      />
      <MiniChart
        title="Profit Buckets"
        description="Market-level PnL distribution buckets."
        option={{
          animation: false,
          grid: { left: 32, right: 8, top: 18, bottom: 42 },
          xAxis: { type: "category", data: distribution.map((bucket) => bucket.bucket), axisLabel: { fontSize: 8, rotate: 35 } },
          yAxis: { type: "value", axisLabel: { fontSize: 9 } },
          series: [{ type: "bar", data: distribution.map((bucket) => bucket.count), itemStyle: { color: "#2454d6" } }]
        }}
      />
      <MiniChart
        title="Wins/Losses"
        description="Closed trade wins and losses by date."
        option={{
          animation: false,
          grid: { left: 32, right: 8, top: 18, bottom: 24 },
          xAxis: { type: "category", data: winLoss.map((point) => point.date), axisLabel: { fontSize: 9 } },
          yAxis: { type: "value", axisLabel: { fontSize: 9 } },
          series: [
            { name: "Wins", type: "bar", stack: "wl", data: winLoss.map((point) => point.wins), itemStyle: { color: "#11845b" } },
            { name: "Losses", type: "bar", stack: "wl", data: winLoss.map((point) => point.losses), itemStyle: { color: "#b42318" } }
          ]
        }}
      />
    </div>
  );
}

function MiniChart({ title, description, option }: { title: string; description: string; option: object }) {
  return (
    <div className="rounded-md border border-line bg-white">
      <SectionHeader title={title} description={description} />
      <ReactECharts option={option} style={{ height: "170px", width: "100%" }} />
    </div>
  );
}
