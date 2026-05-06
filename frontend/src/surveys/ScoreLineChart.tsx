import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyPoint } from "./monthlyAvg.js";

type Props = {
  data: MonthlyPoint[];
  /** Верхняя граница шкалы (макс. возможная сумма баллов по опросу) — ось Y становится читаемее. */
  yMax?: number;
};

export function ScoreLineChart({ data, yMax }: Props) {
  if (data.length === 0) {
    return <p style={{ color: "#64748b" }}>Пока нет данных — пройдите опрос хотя бы раз.</p>;
  }
  const yDomain: [number, number | string] = yMax !== undefined ? [0, yMax] : [0, "auto"];
  return (
    <div style={{ width: "100%", height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals domain={yDomain} />
          <Tooltip formatter={(v: number) => [`${v}`, "Средний балл за месяц"]} labelFormatter={(l) => `Месяц ${l}`} />
          <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
