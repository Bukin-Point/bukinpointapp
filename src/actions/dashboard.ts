'use server'

import { prisma } from '@/lib/db'

export async function getDashboardStats(providerId: string) {
  try {
    // Get total bookings count
    const totalBookings = await prisma.booking.count({
      where: { providerId },
    })

    // Get total revenue (sum of netAmount from completed bookings' transactions)
    const revenueResult = await prisma.transaction.aggregate({
      where: {
        booking: {
          providerId,
          status: 'COMPLETED',
        },
        status: 'PAID',
      },
      _sum: {
        netAmount: true,
      },
    })

    const totalRevenue = revenueResult._sum.netAmount || 0

    // Get active services count
    const activeServices = await prisma.service.count({
      where: {
        providerId,
        isActive: true,
      },
    })

    // Get active staff count
    const activeStaff = await prisma.staffMember.count({
      where: {
        providerId,
        isActive: true,
      },
    })

    // Get recent bookings (last 10)
    const recentBookings = await prisma.booking.findMany({
      where: { providerId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Get upcoming appointments (today and future, status PENDING or CONFIRMED)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingAppointments = await prisma.booking.findMany({
      where: {
        providerId,
        bookingDate: {
          gte: today,
        },
        status: {
          in: ['PENDING', 'CONFIRMED'],
        },
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        staff: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { bookingDate: 'asc' },
        { startTime: 'asc' },
      ],
      take: 5,
    })

    return {
      success: true,
      stats: {
        totalBookings,
        totalRevenue: Number(totalRevenue),
        activeServices,
        activeStaff,
      },
      recentBookings,
      upcomingAppointments,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      success: false,
      error: 'Failed to fetch dashboard stats',
      stats: {
        totalBookings: 0,
        totalRevenue: 0,
        activeServices: 0,
        activeStaff: 0,
      },
      recentBookings: [],
      upcomingAppointments: [],
    }
  }
}
