import { MAX_SAVED_ADDRESSES } from '../constants/index.js';
import { prisma } from '../database/prisma.js';
import { badRequest, notFound } from '../utils/errors.js';
import type { AddressInput } from '../validators/account.validators.js';

async function ownAddress(userId: string, id: string) {
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw notFound('Address');
  return address;
}

export function listAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] });
}

export async function createAddress(userId: string, input: AddressInput) {
  const count = await prisma.address.count({ where: { userId } });
  if (count >= MAX_SAVED_ADDRESSES) throw badRequest(`You can save up to ${MAX_SAVED_ADDRESSES} addresses`);
  const isDefault = input.isDefault || count === 0; // the first address becomes the default
  return prisma.$transaction(async (tx) => {
    if (isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.create({ data: { ...input, isDefault, userId } });
  });
}

export async function updateAddress(userId: string, id: string, input: AddressInput) {
  const existing = await ownAddress(userId, id);
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return tx.address.update({ where: { id: existing.id }, data: { ...input, isDefault: input.isDefault ?? existing.isDefault } });
  });
}

export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  const existing = await ownAddress(userId, id);
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id: existing.id }, data: { isDefault: true } }),
  ]);
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  const existing = await ownAddress(userId, id);
  await prisma.address.delete({ where: { id: existing.id } });
  if (existing.isDefault) {
    // Promote the most recent remaining address.
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
}
