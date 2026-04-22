import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, Brain, ClipboardList, Package, Shield, Users } from 'lucide-react'
import { ThemeToggle } from '@/components/dashboard/theme-toggle'

export default async function HomePage() {
  await createClient()
  const user = await getCurrentUser()

  if (user) {
    redirect('/dashboard')
  }

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Predictions',
      description: 'Advanced AI analyzes device health data to predict failures before they happen'
    },
    {
      icon: ClipboardList,
      title: 'Request Management',
      description: 'Submit and track maintenance requests with real-time status updates'
    },
    {
      icon: Users,
      title: 'Task Assignment',
      description: 'Efficiently assign technicians to tasks and monitor progress'
    },
    {
      icon: Package,
      title: 'Inventory Tracking',
      description: 'Manage parts and supplies with automatic low-stock alerts'
    },
    {
      icon: Shield,
      title: 'Role-Based Access',
      description: 'Secure dashboards for admins, technicians, and device owners'
    },
    {
      icon: Wrench,
      title: 'Service Reports',
      description: 'Detailed technician reports with diagnosis and recommendations'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/eis-logo.jpg"
              alt="EIS logo"
              width={64}
              height={64}
              className="rounded-lg border"
            />
            <div className="leading-tight">
              <span className="block text-xl font-bold tracking-wide">Maintenance EIS</span>
              <span className="text-sm text-muted-foreground font-medium">System</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-balance">
          Predictive Maintenance for
          <span className="text-primary"> Scanners & Printers</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
          Stop equipment failures before they happen. Our AI-powered system predicts maintenance needs, 
          streamlines repairs, and keeps your office running smoothly.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign In to Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container pb-24">
        <h2 className="text-3xl font-bold text-center mb-12">
          Everything You Need for Equipment Maintenance
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="border-muted">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/30">
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to reduce downtime?</h2>
          <p className="text-muted-foreground mb-8">
            Join organizations that trust Maintenance EIS System for their equipment management
          </p>
          <Link href="/auth/signup">
            <Button size="lg">Get Started Today</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/eis-logo.jpg"
              alt="EIS logo"
              width={48}
              height={48}
              className="rounded-md border"
            />
            <span className="text-lg font-semibold tracking-wide">Maintenance EIS System</span>
          </div>
          <p className="text-sm text-muted-foreground">
            AI-Powered Predictive Maintenance System
          </p>
        </div>
      </footer>
    </div>
  )
}
