import { env } from '../../config/env.js';
import { prisma } from '../../database/prisma.js';
import { badRequest } from '../../utils/errors.js';
import type { ShippingZoneInput, TaxRuleInput } from '../../validators/adminContent.validators.js';
import { emailConfigured } from '../email.service.js';
import { gateway } from '../payment/gateway.js';
import { getSettings } from '../settings.service.js';

export async function getAllSettings() {
  const [settings, shippingZones, taxRules] = await Promise.all([
    getSettings(),
    prisma.shippingZone.findMany({ orderBy: { name: 'asc' } }),
    prisma.taxRule.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }], include: { category: { select: { id: true, name: true } } } }),
  ]);
  return {
    settings,
    shippingZones,
    taxRules,
    // Read-only integration status. Secrets live in environment variables and are never returned.
    integrations: {
      paymentGateway: gateway.name,
      paymentTestMode: gateway.name === 'MOCK',
      emailConfigured,
      storageProvider: env.STORAGE_PROVIDER,
    },
  };
}

export const createShippingZone = (input: ShippingZoneInput) => prisma.shippingZone.create({ data: input });
export const updateShippingZone = (id: string, input: ShippingZoneInput) => prisma.shippingZone.update({ where: { id }, data: input });
export const deleteShippingZone = (id: string) => prisma.shippingZone.delete({ where: { id } });

// Creates or updates a tax rule. There is at most one default rule, and it cannot be tied to a category.
export async function saveTaxRule(id: string | null, input: TaxRuleInput) {
  if (input.isDefault && input.categoryId) throw badRequest('The default rule applies to every category — clear the category or untick default');
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) await tx.taxRule.updateMany({ where: { isDefault: true, ...(id ? { id: { not: id } } : {}) }, data: { isDefault: false } });
    return id ? tx.taxRule.update({ where: { id }, data: input }) : tx.taxRule.create({ data: input });
  });
}

export const deleteTaxRule = (id: string) => prisma.taxRule.delete({ where: { id } });

export async function listAuditLogs(page: number, limit: number) {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { admin: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);
  return { items, total };
}
