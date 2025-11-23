import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function initPrisma() {
  // Optionally test the connection
  await prisma.$connect();
}

export async function shutdownPrisma() {
  await prisma.$disconnect();
}

