import { z } from 'zod';

import { normalizeTanzanianMsisdn } from '@/lib/finance/mobile-money';

export const collectionSchema = z.object({
  msisdn: z
    .string()
    .min(1, 'Phone number is required')
    .transform((value) => normalizeTanzanianMsisdn(value))
    .refine((value) => /^255[67]\d{8}$/.test(value), 'Use a Tanzania mobile number like 07XXXXXXXX or 2557XXXXXXX'),
  provider: z.string().min(2, 'Provider is required'),
});

export const messageSchema = z.object({
  content: z.string().min(2, 'Message is too short').max(2000, 'Message is too long'),
});

export const disputeSchema = z.object({
  reason: z.string().trim().min(12, 'Share a short reason so admin knows what needs review').max(500, 'Keep the dispute note within 500 characters'),
});

export const deliverySchema = z.object({
  delivery_note: z.string().trim().min(12, 'Add a short delivery note so the client understands what is ready').max(5000, 'Keep the delivery note within 5000 characters'),
  delivery_link: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || /^https?:\/\//i.test(value), 'Use a valid http or https link'),
});

export type CollectionFormValues = z.infer<typeof collectionSchema>;
export type MessageFormValues = z.infer<typeof messageSchema>;
export type DisputeFormValues = z.infer<typeof disputeSchema>;
export type DeliveryFormValues = z.infer<typeof deliverySchema>;
