'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { CalendarCheck, Clock, Cpu } from 'lucide-react'

interface MaintenanceBooking {
  id: string
  title: string
  scheduled_date: string
  scheduled_time?: string | null
  status: string
  priority: string
  devices?: { brand: string; model: string; device_type: string }
  profiles?: { full_name: string; email: string }
  assignee?: { full_name: string; email: string } | null
}

interface MaintenanceCalendarViewProps {
  bookings: MaintenanceBooking[]
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  assigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  in_progress: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
  cancelled: 'bg-slate-100 text-slate-600',
}

function toLocalDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatBookingTime(time?: string | null) {
  if (!time) return 'No time set'
  const [hours, minutes] = time.split(':')
  const hourNum = Number(hours)
  const suffix = hourNum >= 12 ? 'PM' : 'AM'
  const normalizedHour = ((hourNum + 11) % 12) + 1
  return `${normalizedHour}:${minutes} ${suffix}`
}

export function MaintenanceCalendarView({ bookings }: MaintenanceCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [month, setMonth] = useState(new Date())

  const bookedDateSet = useMemo(() => new Set(bookings.map((b) => b.scheduled_date)), [bookings])
  const bookingsOnSelected = selectedDate ? bookings.filter((b) => b.scheduled_date === toLocalDateStr(selectedDate)) : []
  const bookingsThisMonth = bookings.filter((b) => {
    const d = new Date(`${b.scheduled_date}T00:00:00`)
    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
  })
  const today = toLocalDateStr(new Date())

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="self-start">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              Maintenance Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={month}
              onMonthChange={setMonth}
              modifiers={{ booked: (date) => bookedDateSet.has(toLocalDateStr(date)) }}
              modifiersClassNames={{
                booked: '!bg-blue-100 !text-blue-800 !font-bold dark:!bg-blue-900/40 dark:!text-blue-200 ring-2 ring-blue-400 ring-offset-1',
              }}
            />
            <div className="flex items-center gap-2 mt-3 px-1 text-xs text-slate-500">
              <span className="inline-block w-3 h-3 rounded-sm bg-blue-100 ring-2 ring-blue-400 ring-offset-1" />
              Has bookings
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selectedDate ? (
            <>
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
                <p className="text-sm text-slate-500">
                  {bookingsOnSelected.length === 0
                    ? 'No maintenance bookings on this day'
                    : `${bookingsOnSelected.length} booking${bookingsOnSelected.length !== 1 ? 's' : ''} scheduled`}
                </p>
              </div>
              {bookingsOnSelected.length > 0 ? (
                <div className="space-y-3">
                  {bookingsOnSelected.map((b) => (
                        <BookingCard key={b.id} booking={b} />
                      ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-10 flex flex-col items-center text-slate-400 text-center">
                    <CalendarCheck className="h-10 w-10 mb-2 opacity-40" />
                    <p className="font-medium">No maintenance scheduled</p>
                    <p className="text-sm mt-1">Submit a request from My Requests to book a date and time.</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-semibold">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                <p className="text-sm text-slate-500">
                  {bookingsThisMonth.length === 0
                    ? 'No bookings this month'
                    : `${bookingsThisMonth.length} booking${bookingsThisMonth.length !== 1 ? 's' : ''} this month — click a highlighted day to view`}
                </p>
              </div>
              {bookingsThisMonth.length > 0 ? (
                <div className="space-y-3">
                  {bookingsThisMonth
                    .sort((a, b) => `${a.scheduled_date} ${a.scheduled_time || ''}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time || ''}`))
                    .map((b) => (
                      <BookingCard key={b.id} booking={b} showDate />
                    ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-10 flex flex-col items-center text-slate-400 text-center">
                    <CalendarCheck className="h-10 w-10 mb-2 opacity-40" />
                    <p className="font-medium">No bookings this month</p>
                    <p className="text-sm mt-1">Select a date on the calendar or navigate to another month.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {bookings.filter((b) => b.scheduled_date && b.scheduled_date >= today).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              All Upcoming Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {bookings
                .filter((b) => b.scheduled_date && b.scheduled_date >= today)
                .sort((a, b) => `${a.scheduled_date} ${a.scheduled_time || ''}`.localeCompare(`${b.scheduled_date} ${b.scheduled_time || ''}`))
                .map((b) => (
                    <div key={b.id} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50/60 dark:bg-slate-900/30">
                    <div className="shrink-0 mt-0.5">
                      <Cpu className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{b.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {b.devices?.brand} {b.devices?.model}
                        {b.profiles?.full_name ? ` · ${b.profiles.full_name}` : ''}
                        {b.assignee?.full_name ? ` · Assigned: ${b.assignee.full_name}` : ''}
                      </p>
                      <p className="text-xs font-semibold text-blue-600 mt-1">
                        {new Date(`${b.scheduled_date}T00:00:00`).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {b.scheduled_time ? ` · ${formatBookingTime(b.scheduled_time)}` : ''}
                      </p>
                    </div>
                    <Badge className={`shrink-0 ml-auto text-xs ${statusColors[b.status] || ''}`}>{b.status}</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BookingCard({ booking, showDate = false }: { booking: MaintenanceBooking; showDate?: boolean }) {
  return (
    <Card className="border-l-4 border-l-blue-400 dark:border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">{booking.title}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {booking.devices?.brand} {booking.devices?.model}
              {booking.devices?.device_type ? ` (${booking.devices.device_type})` : ''}
              {booking.profiles?.full_name ? ` · ${booking.profiles.full_name}` : ''}
              {booking.assignee?.full_name ? ` · Tech: ${booking.assignee.full_name}` : ''}
            </p>
            {showDate && (
              <p className="text-xs font-semibold text-blue-600 mt-1">
                {new Date(`${booking.scheduled_date}T00:00:00`).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                · {formatBookingTime(booking.scheduled_time)}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge className={`text-xs ${priorityColors[booking.priority] || ''}`}>{booking.priority}</Badge>
            <Badge className={`text-xs ${statusColors[booking.status] || ''}`}>{booking.status}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
