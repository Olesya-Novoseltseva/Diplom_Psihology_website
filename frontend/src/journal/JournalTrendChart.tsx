import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { JournalTrendPoint } from "./buildJournalTrendPoints.js";

export function JournalTrendChart({ data }: { data: JournalTrendPoint[] }) {
  if (data.length === 0) {
    return <p className="muted">После первых записей здесь появится график динамики.</p>;
  }

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis yAxisId="sentiment" domain={[-1, 1]} tick={{ fontSize: 11 }} width={36} />
          <YAxis yAxisId="burden" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "Тональность") return [value.toFixed(2), name];
              return [`${value}%`, name];
            }}
            labelFormatter={(label) => `Запись: ${String(label)}`}
          />
          <Legend />
          <ReferenceLine yAxisId="sentiment" y={0} stroke="#94a3b8" strokeDasharray="4 4" />
          <Line
            yAxisId="sentiment"
            type="monotone"
            dataKey="sentiment"
            name="Тональность"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="burden"
            type="monotone"
            dataKey="burdenPct"
            name="Проблемность"
            stroke="#0d9488"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
