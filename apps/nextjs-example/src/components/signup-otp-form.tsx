'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'

interface SignupOTPFormProps {
  email: string
  otpId: string
  signature: string
  error: string
  verifyOTP: (formData: FormData) => Promise<void>
}

export function SignupOTPForm({
  email,
  otpId,
  signature,
  error,
  verifyOTP,
}: SignupOTPFormProps) {
  const [otpValue, setOtpValue] = useState('')

  return (
    <form action={verifyOTP} className='space-y-4'>
      <input type='hidden' name='email' value={email} />
      <input type='hidden' name='otpId' value={otpId} />
      <input type='hidden' name='code' value={otpValue} />

      {signature && (
        <div className='rounded-lg border bg-muted p-4 text-center'>
          <p className='text-sm text-muted-foreground mb-1'>Signature</p>
          <p className='font-semibold text-lg'>{signature}</p>
          <p className='text-xs text-muted-foreground mt-1'>
            Verify this matches the signature in your email
          </p>
        </div>
      )}

      <div className='space-y-2'>
        <Label htmlFor='code'>Verification Code</Label>
        <div className='flex justify-center'>
          <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>

      {error && <div className='text-sm text-destructive'>{error}</div>}

      <div className='flex gap-2'>
        <Button asChild variant='outline' className='flex-1'>
          <Link href='/signup'>Back</Link>
        </Button>
        <Button type='submit' className='flex-1'>
          Verify & Sign Up
        </Button>
      </div>
    </form>
  )
}
