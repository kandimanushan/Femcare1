"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

interface ChartData {
  medications: {
    labels: string[]
    data: number[]
  }
  diagnoses: {
    labels: string[]
    data: number[]
  }
  timeline: {
    labels: string[]
    data: number[]
  }
}

interface AnalysisChartsProps {
  data: ChartData
}

export function AnalysisCharts({ data }: AnalysisChartsProps) {
  const medicationsData = data.medications.labels.map((label, index) => ({
    name: label,
    value: data.medications.data[index],
  }))

  const diagnosesData = data.diagnoses.labels.map((label, index) => ({
    name: label,
    value: data.diagnoses.data[index],
  }))

  const timelineData = data.timeline.labels.map((label, index) => ({
    date: label,
    value: data.timeline.data[index],
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={medicationsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={diagnosesData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {diagnosesData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="h-[300px] md:col-span-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#8884d8"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
} 