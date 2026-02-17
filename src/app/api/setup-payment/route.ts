import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PaymentGateway } from '@prisma/client'
import { getSession, isUserSuperAdmin } from '@/lib/auth-helpers-clerk'

export async function GET(request: Request) {
  const session = await getSession()
  const isSuperAdmin = await isUserSuperAdmin()

  if (!session || !isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const gateway = searchParams.get('gateway') as PaymentGateway | null

  if (!gateway || !['OPAY', 'PAYSTACK'].includes(gateway)) {
    return NextResponse.json({
      error: 'Invalid gateway. Use ?gateway=OPAY or ?gateway=PAYSTACK'
    }, { status: 400 })
  }

  const PAYMENT_CONFIG_ID = 'clpaymentconfig0default'

  const config = await prisma.paymentConfig.upsert({
    where: { id: PAYMENT_CONFIG_ID },
    create: {
      id: PAYMENT_CONFIG_ID,
      currentGateway: gateway,
      updatedAt: new Date(),
    },
    update: {
      currentGateway: gateway,
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({
    success: true,
    config,
    message: `Global payment gateway set to ${gateway}`
  })
}
