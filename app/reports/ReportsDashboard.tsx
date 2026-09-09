'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

type SummaryLike = {
  period?: { label?: string }
  management?: {
    period_label?: string
    by_service?: Array<{
      service_id: number
      service_name: string
      tickets_issued: number
      tickets_attended: number
      no_show_percent: number
      sla_met_percent: number
      avg_wait_minutes?: number
      avg_attention_minutes?: number
    }>
    totals?: {
      tickets_issued: number
      tickets_attended: number
      no_show_percent: number
      sla_met_percent: number
      avg_wait_label: string
      avg_attention_label: string
    }
    daily_attention?: {
      rows: Array<{
        date: string
        day_average_minutes: number | null
        day_average_label: string
      }>
      overall_average_label: string
    }
  }
}

type EfficiencyLike = {
  kpis?: {
    tickets_generated: number
    tickets_attended: number
    no_shows: number
    transferred: number
    avg_wait_label: string
    max_wait_label: string
    avg_attention_label: string
    sla_met_percent: number
    sla_wait_met_percent: number
  }
  byHour?: Record<string, number>
}

const COLORS = {
  issued: '#2c5282',
  attended: '#00816D',
  noShow: '#dc2626',
  transferred: '#d97706',
  sla: '#7c3aed',
  wait: '#0369a1',
  attention: '#0f766e',
}

const PIE_COLORS = ['#00816D', '#dc2626', '#d97706', '#94a3b8']

function slaHeatClass(pct: number): string {
  if (pct < 50) return 'bg-red-500 text-white'
  if (pct < 60) return 'bg-orange-400 text-white'
  if (pct < 70) return 'bg-yellow-300 text-slate-900'
  return 'bg-green-500 text-white'
}

function shortName(name: string, max = 18): string {
  if (name.length <= max) return name
  return `${name.slice(0, max - 1)}…`
}

export function ReportsDashboard({
  summary,
  efficiency,
  loading,
}: {
  summary: SummaryLike | null
  efficiency: EfficiencyLike | null
  loading: boolean
}) {
  if (loading && !summary && !efficiency) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hospital-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando dashboard...</p>
      </div>
    )
  }

  const kpis = efficiency?.kpis
  const totals = summary?.management?.totals
  const byService = summary?.management?.by_service || []
  const dailyRows = summary?.management?.daily_attention?.rows || []
  const periodLabel =
    summary?.management?.period_label || summary?.period?.label || 'Período seleccionado'

  const volumeByService = byService.map((s) => ({
    name: shortName(s.service_name),
    fullName: s.service_name,
    emitidos: s.tickets_issued,
    atendidos: s.tickets_attended,
  }))

  const slaByService = byService.map((s) => ({
    name: shortName(s.service_name),
    fullName: s.service_name,
    sla: Number(s.sla_met_percent) || 0,
  }))

  const dailyTrend = dailyRows.map((r) => ({
    date: r.date,
    minutos: r.day_average_minutes ?? 0,
    label: r.day_average_label,
  }))

  const hourEntries = Object.entries(efficiency?.byHour || {})
    .map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      hourNum: Number(hour),
      tickets: Number(count) || 0,
    }))
    .sort((a, b) => a.hourNum - b.hourNum)

  const statusPie = [
    { name: 'Atendidos', value: kpis?.tickets_attended ?? totals?.tickets_attended ?? 0 },
    { name: 'No presentados', value: kpis?.no_shows ?? 0 },
    { name: 'Transferidos', value: kpis?.transferred ?? 0 },
  ].filter((d) => d.value > 0)

  const generated = kpis?.tickets_generated ?? totals?.tickets_issued ?? 0
  const attended = kpis?.tickets_attended ?? totals?.tickets_attended ?? 0
  const noShows = kpis?.no_shows ?? 0
  const transferred = kpis?.transferred ?? 0
  const slaPct = kpis?.sla_met_percent ?? totals?.sla_met_percent ?? 0

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-[#1e3a5f] px-4 py-3">
          <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
            Dashboard de reportes y analítica
          </h3>
        </div>
        <p className="px-4 py-2 text-sm italic text-gray-500 border-b border-gray-100">
          Vista consolidada del período: {periodLabel}. Usa los filtros superiores y Aplicar para
          actualizar.
        </p>

        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-lg border border-gray-100 bg-slate-50 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Generados</p>
            <p className="text-3xl font-bold text-slate-900">{generated}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-emerald-50 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Atendidos</p>
            <p className="text-3xl font-bold text-emerald-800">{attended}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-red-50 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">No presentados</p>
            <p className="text-3xl font-bold text-red-700">{noShows}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-amber-50 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Transferidos</p>
            <p className="text-3xl font-bold text-amber-800">{transferred}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-violet-50 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">SLA atención</p>
            <p
              className={`text-2xl font-bold inline-block px-2 py-0.5 rounded ${slaHeatClass(slaPct)}`}
            >
              {Number(slaPct).toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 grid sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Espera promedio</p>
            <p className="text-xl font-semibold text-[#0369a1]">
              {kpis?.avg_wait_label || totals?.avg_wait_label || '0:00'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Espera máxima</p>
            <p className="text-xl font-semibold text-[#0369a1]">
              {kpis?.max_wait_label || '0:00'}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500">Atención promedio</p>
            <p className="text-xl font-semibold text-[#0f766e]">
              {kpis?.avg_attention_label || totals?.avg_attention_label || '0:00'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-1">Volumen por área / servicio</h4>
          <p className="text-xs text-gray-500 mb-3">Tickets emitidos vs atendidos</p>
          {volumeByService.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Sin datos en el período.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeByService} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [value as number, 'Cantidad']}
                    labelFormatter={(label) => String(label)}
                  />
                  <Legend />
                  <Bar dataKey="emitidos" name="Emitidos" fill={COLORS.issued} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="atendidos" name="Atendidos" fill={COLORS.attended} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-1">Cumplimiento SLA por servicio</h4>
          <p className="text-xs text-gray-500 mb-3">% de tickets dentro del SLA de espera</p>
          {slaByService.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Sin datos en el período.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={slaByService} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toFixed(1)}%`, 'SLA cumplido']}
                  />
                  <Bar dataKey="sla" name="% SLA" fill={COLORS.sla} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-1">Tendencia diaria de atención</h4>
          <p className="text-xs text-gray-500 mb-3">
            Promedio de minutos de atención por día
            {summary?.management?.daily_attention?.overall_average_label
              ? ` · general ${summary.management.daily_attention.overall_average_label}`
              : ''}
          </p>
          {dailyTrend.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Sin datos en el período.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, _name, item) => {
                      const payload = item?.payload as { label?: string } | undefined
                      return [payload?.label || `${Number(value).toFixed(1)} min`, 'Promedio']
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="minutos"
                    name="Minutos"
                    stroke={COLORS.attention}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-1">Distribución de resultados</h4>
          <p className="text-xs text-gray-500 mb-3">Atendidos, no presentados y transferidos</p>
          {statusPie.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Sin datos en el período.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                  >
                    {statusPie.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Tickets']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-1">Volumen por hora del día</h4>
        <p className="text-xs text-gray-500 mb-3">Tickets generados por hora (zona Panamá)</p>
        {hourEntries.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Sin datos en el período.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourEntries} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [value, 'Tickets']} />
                <Bar dataKey="tickets" name="Tickets" fill={COLORS.wait} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
