'use server'

import { prisma } from '@/lib/db'
import { PaymentGateway } from '@prisma/client'

const PAYMENT_CONFIG_ID = 'clpaymentconfig0default'

/**
 * Get the payment gateway to use for a given provider.
 * Checks per-provider override first, then falls back to global default.
 */
export async function getCurrentGatewayForProvider(
  providerId: string | undefined
): Promise<PaymentGateway> {
  if (providerId) {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { paymentGateway: true },
    })
    if (provider?.paymentGateway) {
      return provider.paymentGateway
    }
  }

  let config = await prisma.paymentConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { currentGateway: true },
  })

  if (!config) {
    await prisma.paymentConfig.upsert({
      where: { id: PAYMENT_CONFIG_ID },
      create: {
        id: PAYMENT_CONFIG_ID,
        currentGateway: 'OPAY',
        updatedAt: new Date(),
      },
      update: {},
      select: { currentGateway: true },
    })
    config = await prisma.paymentConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { currentGateway: true },
    })
  }

  return config?.currentGateway ?? 'OPAY'
}

/**
 * Set the global default payment gateway (for admin/config UI).
 */
export async function setGlobalPaymentGateway(gateway: PaymentGateway): Promise<void> {
  await prisma.paymentConfig.upsert({
    where: { id: PAYMENT_CONFIG_ID },
    create: { id: PAYMENT_CONFIG_ID, currentGateway: gateway, updatedAt: new Date() },
    update: { currentGateway: gateway, updatedAt: new Date() },
  })
}

/**
 * Set per-provider payment gateway override (null = use global default).
 */
export async function setProviderPaymentGateway(
  providerId: string,
  gateway: PaymentGateway | null
): Promise<void> {
  await prisma.provider.update({
    where: { id: providerId },
    data: { paymentGateway: gateway },
  })
}

/**
 * Get global default gateway (for admin/settings UI).
 */
export async function getGlobalPaymentGateway(): Promise<PaymentGateway> {
  const config = await prisma.paymentConfig.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { currentGateway: true },
  })
  return config?.currentGateway ?? 'OPAY'
}

/**
 * Get provider's gateway override (null = use global default).
 */
export async function getProviderPaymentGatewayOverride(
  providerId: string
): Promise<PaymentGateway | null> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { paymentGateway: true },
  })
  return provider?.paymentGateway ?? null
}
