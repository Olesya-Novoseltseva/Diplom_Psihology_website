import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WellbeingPointDto } from "../api/WellbeingApiService.js";

export function WellbeingChart({ data }: { data: WellbeingPointDto[] }) {
  if (data.length === 0) return <p className="muted">После дневниковых записей и опросников здесь появится динамика.</p>;
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
          <Tooltip formatter={(value: number) => [`${Math.round(value)} / 100`, ""]} />
          <Legend />
          <Line type="monotone" dataKey="anxietyLevel" name="Уровень тревожности" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="depressionLevel" name="Уровень депрессивности" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="activityLevel" name="Активность" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="satisfactionLevel" name="Удовлетворенность" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
