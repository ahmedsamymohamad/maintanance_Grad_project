'use client'

import { FormEvent, useState } from 'react'
import { useEffect } from 'react'
import { getSignupPolicy, signUp } from '../actions'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('user')
  const [allowElevatedRoles, setAllowElevatedRoles] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadPolicy() {
      const policy = await getSignupPolicy()

      if (!mounted) {
        return
      }

      if (policy?.error) {
        setError(policy.error)
      }

      const canUseElevatedRoles = Boolean(policy?.allowElevatedRoles)
      setAllowElevatedRoles(canUseElevatedRoles)

      if (!canUseElevatedRoles) {
        setRole('user')
      }
    }

    loadPolicy()

    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(event.currentTarget)
    formData.set('role', role)
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      setSuccessMessage(result.message || 'Account created successfully.')
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image
                src="/brand/eis-logo.jpg"
                alt="EIS logo"
                width={96}
                height={96}
                className="rounded-xl border"
              />
            </div>
            <CardTitle className="text-2xl">Account Created</CardTitle>
            <CardDescription>
              {successMessage}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/auth/login">
              <Button variant="outline">Continue</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/brand/eis-logo.jpg"
              alt="EIS logo"
              width={96}
              height={96}
              className="rounded-xl border"
            />
          </div>
          <CardTitle className="text-2xl">Create Account - EIS</CardTitle>
          <CardDescription>Sign up to access the maintenance system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="fullName">Full Name</FieldLabel>
                <Input 
                  id="fullName" 
                  name="fullName" 
                  type="text" 
                  placeholder="John Doe" 
                  required 
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  required 
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="Min 6 characters" 
                  minLength={6}
                  required 
                />
              </Field>
              {allowElevatedRoles ? (
                <Field>
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User (Device Owner)</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
            </FieldGroup>

            <p className="mt-3 text-xs text-muted-foreground">
              First signup can be admin. After that, public signup is always user. Admins can create admin or technician accounts.
            </p>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
