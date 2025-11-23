import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';

export async function listSpareParts(_req: Request, res: Response) {
  const items = await prisma.sparePart.findMany({ orderBy: { createdAt: 'desc' } });
  return res.status(StatusCodes.OK).json({ items, total: items.length });
}

export async function getSparePartById(req: Request, res: Response) {
  const { id } = req.params;
  const item = await prisma.sparePart.findUnique({ where: { id } });
  if (!item) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Spare part not found' });
  return res.status(StatusCodes.OK).json(item);
}

export async function createSparePart(req: Request, res: Response) {
  const {
    name,
    partNumber,
    quantity,
    reorderPoint,
    unitCost,
    category,
    supplier,
    location,
    image,
    assetId,
  } = req.body || {};

  if (!name) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'name is required' });
  const qty = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;
  const rop = Number.isFinite(Number(reorderPoint)) ? Number(reorderPoint) : 0;
  const cost = unitCost !== undefined && unitCost !== null && unitCost !== '' ? String(unitCost) : null;

  const created = await prisma.sparePart.create({
    data: {
      name,
      partNumber: partNumber || null,
      quantity: qty,
      reorderPoint: rop,
      unitCost: cost as any, // Prisma Decimal accepts string
      category: category || null,
      supplier: supplier || null,
      location: location || null,
      image: image || null,
      assetId: assetId || null,
    },
  });
  return res.status(StatusCodes.CREATED).json({ id: created.id });
}

export async function updateSparePart(req: Request, res: Response) {
  const { id } = req.params;
  const exists = await prisma.sparePart.findUnique({ where: { id } });
  if (!exists) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Spare part not found' });

  const {
    name,
    partNumber,
    quantity,
    reorderPoint,
    unitCost,
    category,
    supplier,
    location,
    image,
    assetId,
  } = req.body || {};

  const data: any = {};
  if (name !== undefined) data.name = name;
  if (partNumber !== undefined) data.partNumber = partNumber || null;
  if (quantity !== undefined) data.quantity = Number.isFinite(Number(quantity)) ? Number(quantity) : 0;
  if (reorderPoint !== undefined) data.reorderPoint = Number.isFinite(Number(reorderPoint)) ? Number(reorderPoint) : 0;
  if (unitCost !== undefined) data.unitCost = unitCost !== null && unitCost !== '' ? String(unitCost) : null;
  if (category !== undefined) data.category = category || null;
  if (supplier !== undefined) data.supplier = supplier || null;
  if (location !== undefined) data.location = location || null;
  if (image !== undefined) data.image = image || null;
  if (assetId !== undefined) data.assetId = assetId || null;

  const updated = await prisma.sparePart.update({ where: { id }, data });
  return res.status(StatusCodes.OK).json({ id: updated.id });
}

export async function uploadSparePartImage(req: Request, res: Response) {
  const { id } = req.params
  const exists = await prisma.sparePart.findUnique({ where: { id } })
  if (!exists) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Spare part not found' })

  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'image file is required' })

  const imagePath = `/uploads/${file.filename}`
  await prisma.sparePart.update({ where: { id }, data: { image: imagePath } })
  return res.status(StatusCodes.CREATED).json({ id, image: imagePath })
}
