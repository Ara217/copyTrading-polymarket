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
    <section className="grid gap-4">
      <ChartShell
        title="Drawdown Chart"
        description="Shows how far cumulative PnL is below its prior peak on each date. Lower drawdown is better."
        option={{
          animation: false,
          grid: { left: 70, right: 24, top: 30, bottom: 42 },
          tooltip: { trigger: "axis", valueFormatter: (value: number) => formatAmount(value, "usd") },
          xAxis: { type: "category", data: drawdown.map((point) => point.date), axisLabel: { fontSize: 11 } },
          yAxis: {
            type: "value",
            axisLabel: { fontSize: 11, formatter: (value: number) => formatAmount(value, "usd") }
          },
          series: [{ name: "Drawdown", type: "line", symbol: "none", data: drawdown.map((point) => Number(point.drawdown)), lineStyle: { color: "#b42318", width: 2 } }]
        }}
      />
      <ChartShell
        title="Profit Distribution"
        description="Counts reconstructed market positions by total PnL bucket so you can see whether results come from many small outcomes or large outliers."
        option={{
          animation: false,
          grid: { left: 48, right: 20, top: 30, bottom: 64 },
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: distribution.map((bucket) => bucket.bucket), axisLabel: { fontSize: 10, rotate: 32 } },
          yAxis: { type: "value", axisLabel: { fontSize: 11 } },
          series: [{ name: "Markets", type: "bar", data: distribution.map((bucket) => bucket.count), itemStyle: { color: "#2454d6" } }]
        }}
      />
      <ChartShell
        title="Win/Loss Chart"
        description="Counts profitable and unprofitable closed trade events by date."
        option={{
          animation: false,
          grid: { left: 48, right: 20, top: 30, bottom: 42 },
          tooltip: { trigger: "axis" },
          xAxis: { type: "category", data: winLoss.map((point) => point.date), axisLabel: { fontSize: 11 } },
          yAxis: { type: "value", axisLabel: { fontSize: 11 } },
          series: [
            { name: "Wins", type: "bar", stack: "outcomes", data: winLoss.map((point) => point.wins), itemStyle: { color: "#11845b" } },
            { name: "Losses", type: "bar", stack: "outcomes", data: winLoss.map((point) => point.losses), itemStyle: { color: "#b42318" } }
          ]
        }}
      />
    </section>
  );
}

function ChartShell({ title, description, option }: { title: string; description: string; option: object }) {
  return (
    <div className="rounded-md border border-line bg-white">
      <SectionHeader title={title} description={description} />
      <ReactECharts option={option} style={{ height: "220px", width: "100%" }} />
    </div>
  );
}
