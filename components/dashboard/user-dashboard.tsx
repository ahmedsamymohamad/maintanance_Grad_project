import { createServiceRoleClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cpu, ClipboardList, AlertTriangle, CheckCircle, TrendingUp, Printer, Scan, Eye, Zap, Clock, Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface UserDashboardProps {
  userId: string
}

export async function UserDashboard({ userId }: UserDashboardProps) {
  const supabase = createServiceRoleClient()

  const [
    { count: deviceCount },
    { count: pendingRequests },
    { data: myDevices },
    { data: myPredictions }
  ] = await Promise.all([
    supabase.from('devices').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('maintenance_requests').select('*', { count: 'exact', head: true }).eq('requested_by', userId).eq('status', 'pending'),
    supabase.from('devices').select('*').eq('user_id', userId).limit(5),
    supabase.from('ai_predictions')
      .select('*, devices!inner(user_id, brand, model)')
      .eq('devices.user_id', userId)
      .eq('is_acknowledged', false)
      .order('confidence_score', { ascending: false })
      .limit(5)
  ])

  const stats = [
    { label: 'My Devices', value: deviceCount || 0, icon: Cpu, color: 'from-blue-600 to-blue-500', trend: '+2.5%', trendUp: true },
    { label: 'Pending Requests', value: pendingRequests || 0, icon: ClipboardList, color: 'from-amber-600 to-amber-500', trend: '-1.2%', trendUp: false },
  ]

  const statusColors: Record<string, { bg: string; text: string; dot: string; light: string }> = {
    active: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', light: 'bg-green-100' },
    maintenance: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', light: 'bg-amber-100' },
    decommissioned: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', light: 'bg-red-100' },
  }

  const getDeviceIcon = (type: string) => {
    return type?.toLowerCase().includes('printer') ? <Printer className="h-5 w-5" /> : <Scan className="h-5 w-5" />
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">My Dashboard</h1>
        <p className="text-base text-slate-500 leading-relaxed">Welcome back. Monitor your devices and maintenance status in real-time</p>
      </div>

      {/* Stats Cards - Enhanced with Trends */}
      <div className="grid gap-6 md:grid-cols-2">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="border border-slate-200/50 bg-white shadow-sm hover:shadow-lg hover:border-blue-200/50 transition-all duration-300 overflow-hidden group">
              <div className={`h-1.5 bg-gradient-to-r ${stat.color}`}></div>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold text-slate-600 mb-2">
                      {stat.label}
                    </CardTitle>
                    <div className="flex items-baseline gap-2">
                      <div className="text-5xl font-bold text-slate-900 tracking-tight">{stat.value}</div>
                      <div className={`flex items-center gap-0.5 text-sm font-medium ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                        {stat.trendUp ? '↑' : '↓'} {stat.trend}
                      </div>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-10 group-hover:bg-opacity-20 transition-all duration-300`}>
                    <Icon className={`h-6 w-6 text-transparent bg-clip-text bg-gradient-to-br ${stat.color}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${stat.color} transition-all duration-500`} style={{width: `${Math.min(100, (stat.value / 10) * 100)}%`}}></div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* My Devices Section */}
        <Card className="lg:col-span-2 border border-slate-200/50 bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50/80 to-blue-50/50 px-6 py-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 mb-1">My Devices</CardTitle>
                <CardDescription className="text-slate-600 text-sm">Your registered scanners and printers ({myDevices?.length || 0} total)</CardDescription>
              </div>
              <Link href="/dashboard/my-devices">
                <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 rounded-lg hover:scale-105 active:scale-95">
                  Manage Devices
                </Button>
              </Link>
            </div>
          </div>
          <CardContent className="pt-6">
            {myDevices && myDevices.length > 0 ? (
              <div className="space-y-3">
                {myDevices.map((device: any) => {
                  const colors = statusColors[device.status] || statusColors.active
                  return (
                    <div key={device.id} className={`group relative p-4 rounded-xl border border-slate-200/50 ${colors.bg} hover:border-slate-300 transition-all duration-200 bg-opacity-70 hover:bg-opacity-100`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`p-3 ${colors.light} rounded-lg border border-slate-200 shadow-sm group-hover:shadow-md transition-all duration-200`}>
                            <div className={`${colors.text}`}>
                              {getDeviceIcon(device.device_type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{device.brand} {device.model}</p>
                            <p className="text-sm text-slate-600 capitalize mt-0.5">{device.device_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200/50">
                            <div className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`}></div>
                            <span className={`text-xs font-semibold ${colors.text} capitalize`}>{device.status}</span>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 hover:bg-white rounded-lg">
                            <Eye className="h-4 w-4 text-slate-500 hover:text-blue-600 transition-colors" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full mb-4">
                  <Cpu className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-slate-900 font-semibold mb-1">No devices registered</p>
                <p className="text-sm text-slate-500 mb-5">Start by adding your first device to get started</p>
                <Link href="/dashboard/my-devices">
                  <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300">
                    Add Your First Device
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Predictions Section */}
        <Card className="border border-slate-200/50 bg-white shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden lg:col-span-1">
          <div className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50/80 to-green-50/50 px-6 py-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg font-bold text-slate-900">System Status</CardTitle>
            </div>
            <CardDescription className="text-slate-600 text-sm">AI-powered predictions and health</CardDescription>
          </div>
          <CardContent className="pt-6">
            {myPredictions && myPredictions.length > 0 ? (
              <div className="space-y-3">
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs font-medium text-blue-600">⚠️ {myPredictions.length} potential issue(s) detected</p>
                </div>
                {myPredictions.slice(0, 3).map((prediction: any) => {
                  const riskScore = Math.round((prediction.confidence_score || 0) * 100)
                  const riskLevel = riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low'
                  const riskConfig = {
                    high: { bg: 'bg-red-50', border: 'border-red-100', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
                    medium: { bg: 'bg-amber-50', border: 'border-amber-100', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
                    low: { bg: 'bg-yellow-50', border: 'border-yellow-100', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' }
                  }
                  const config = riskConfig[riskLevel as keyof typeof riskConfig]
                  return (
                    <div key={prediction.id} className={`p-3 rounded-lg border ${config.border} ${config.bg} hover:shadow-sm transition-all group cursor-pointer`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p className="font-medium text-slate-900 text-sm line-clamp-1">{prediction.predicted_issue}</p>
                        <Badge className={`${config.badge} border-0 whitespace-nowrap text-xs`}>
                          {riskScore}%
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {prediction.devices?.brand} {prediction.devices?.model}
                      </p>
                      <div className="mt-2 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${config.dot === 'bg-red-500' ? 'from-red-500' : config.dot === 'bg-amber-500' ? 'from-amber-500' : 'from-yellow-500'} to-orange-500 transition-all`} style={{width: `${riskScore}%`}}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-full mb-4 animate-pulse">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-slate-900 font-semibold mb-1">All Systems Healthy</p>
                <p className="text-sm text-slate-500 mb-3">No issues predicted</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-700">98% Confidence</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
