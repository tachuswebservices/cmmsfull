import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { prisma } from '../services/prisma'
import fs from 'fs'
import path from 'path'
import { paths } from '../config/env'

export async function listInventory(_req: Request, res: Response) {
  const items = await prisma.sparePart.findMany({ orderBy: { createdAt: 'desc' } })
  return res.status(StatusCodes.OK).json({ items, total: items.length })
}

export async function getInventoryById(req: Request, res: Response) {
  const { id } = req.params
  const item = await prisma.sparePart.findUnique({ where: { id } })
  if (!item) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Inventory item not found' })
  return res.status(StatusCodes.OK).json(item)
}

export async function createInventory(req: Request, res: Response) {
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
  } = req.body || {}

  if (!name) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'name is required' })
  const qty = Number.isFinite(Number(quantity)) ? Number(quantity) : 0
  const rop = Number.isFinite(Number(reorderPoint)) ? Number(reorderPoint) : 0
  const cost = unitCost !== undefined && unitCost !== null && unitCost !== '' ? String(unitCost) : null

  const created = await prisma.sparePart.create({
    data: {
      name,
      partNumber: partNumber || null,
      quantity: qty,
      reorderPoint: rop,
      unitCost: cost as any,
      category: category || null,
      supplier: supplier || null,
      location: location || null,
      image: image || null,
      assetId: assetId || null,
    },
  })
  return res.status(StatusCodes.CREATED).json({ id: created.id })
}

export async function updateInventory(req: Request, res: Response) {
  const { id } = req.params
  const exists = await prisma.sparePart.findUnique({ where: { id } })
  if (!exists) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Inventory item not found' })

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
  } = req.body || {}

  const data: any = {}
  if (name !== undefined) data.name = name
  if (partNumber !== undefined) data.partNumber = partNumber || null
  if (quantity !== undefined) data.quantity = Number.isFinite(Number(quantity)) ? Number(quantity) : 0
  if (reorderPoint !== undefined) data.reorderPoint = Number.isFinite(Number(reorderPoint)) ? Number(reorderPoint) : 0
  if (unitCost !== undefined) data.unitCost = unitCost !== null && unitCost !== '' ? String(unitCost) : null
  if (category !== undefined) data.category = category || null
  if (supplier !== undefined) data.supplier = supplier || null
  if (location !== undefined) data.location = location || null
  if (image !== undefined) data.image = image || null
  if (assetId !== undefined) data.assetId = assetId || null

  const updated = await prisma.sparePart.update({ where: { id }, data })
  return res.status(StatusCodes.OK).json({ id: updated.id })
}

export async function uploadInventoryImage(req: Request, res: Response) {
  const { id } = req.params
  const exists = await prisma.sparePart.findUnique({ where: { id } })
  if (!exists) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Inventory item not found' })

  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'image file is required' })

  const imagePath = `/uploads/${file.filename}`
  await prisma.sparePart.update({ where: { id }, data: { image: imagePath } })
  return res.status(StatusCodes.CREATED).json({ id, image: imagePath })
}

export async function deleteInventory(req: Request, res: Response) {
  const { id } = req.params
  const exists = await prisma.sparePart.findUnique({ where: { id } })
  if (!exists) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Inventory item not found' })
  // Attempt to remove associated image from disk
  const imagePath = (exists as any).image as string | null | undefined
  if (typeof imagePath === 'string' && imagePath.trim()) {
    try {
      // imagePath is stored like "/uploads/<filename>"; strip the uploads prefix to get the filename
      const rel = imagePath.replace(/^\/?uploads\//, '')
      const fileOnDisk = path.join(paths.uploadDir, rel)
      if (fs.existsSync(fileOnDisk)) {
        await fs.promises.unlink(fileOnDisk).catch(() => {})
      }
    } catch {
      // Ignore file deletion errors; proceed with DB delete
    }
  }
  await prisma.sparePart.delete({ where: { id } })
  return res.status(StatusCodes.NO_CONTENT).send()
}
