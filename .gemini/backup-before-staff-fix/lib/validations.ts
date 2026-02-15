import { z } from 'zod'

// Provider validations
export const providerSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  industry: z.string().min(1, 'Industry is required'),
  address: z.string().optional(),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  timezone: z.string().default('Africa/Lagos'),
})

// Service validations
export const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  description: z.string().optional(),
  duration: z.number().int().min(15, 'Duration must be at least 15 minutes'),
  price: z.number().min(0, 'Price must be positive'),
  isActive: z.boolean().default(true),
})

// Booking validations
export const bookingSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(1, 'Phone number is required'),
  customerEmail: z.string().email('Invalid email address').optional(),
  notes: z.string().optional(),
})

// Staff validations
export const staffSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
})
