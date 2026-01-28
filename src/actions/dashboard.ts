'use server'

import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth-helpers-clerk'
import { validateProviderAccess } from '@/lib/provider-context-guards'

export async function getDashboardStats(providerId: string, staffUserId?: string) {
  try {
    // SECURITY: Validate user has access to this provider
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized',
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

    const hasAccess = await validateProviderAccess(session.user.id, providerId)
    if (!hasAccess) {
      return {
        success: false,
        error: 'Access denied to this provider',
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
    // Build booking where clause
    const bookingWhere: any = { providerId }
    
    // If staffUserId is provided, filter bookings to only those assigned to this staff member
    if (staffUserId) {
      const staffMember = await prisma.staffMember.findFirst({
        where: {
          providerId,
          userId: staffUserId,
        },
      })
      
      if (staffMember) {
        bookingWhere.staffId = staffMember.id
      } else {
        // If staff member not found, return empty stats
        return {
          success: true,
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

    // Get total bookings count
    const totalBookings = await prisma.booking.count({
      where: bookingWhere,
    })

    // Get total revenue (only if not staff - staff don't see revenue)
    let totalRevenue = 0
    let activeServices = 0
    let activeStaff = 0

    if (!staffUserId) {
      // Get total revenue (sum of netAmount from completed bookings' transactions)
      const revenueResult = await prisma.transaction.aggregate({
        where: {
          booking: {
            ...bookingWhere,
            status: 'COMPLETED',
          },
          status: 'PAID',
        },
        _sum: {
          netAmount: true,
        },
      })

      totalRevenue = revenueResult._sum.netAmount ? Number(revenueResult._sum.netAmount) : 0

      // Get active services count
      activeServices = await prisma.service.count({
        where: {
          providerId,
          isActive: true,
        },
      })

      // Get active staff count
      activeStaff = await prisma.staffMember.count({
        where: {
          providerId,
          isActive: true,
        },
      })
    }

    // Get recent bookings (last 10)
    const recentBookings = await prisma.booking.findMany({
      where: bookingWhere,
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
        ...bookingWhere,
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
