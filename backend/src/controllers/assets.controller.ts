import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';
import fs from 'fs'
import path from 'path'
import { paths } from '../config/env'

function toAssetStatus(s?: string) {
  switch ((s || '').toLowerCase()) {
    case 'under-maintenance': return 'UNDER_MAINTENANCE'
    case 'decommissioned': return 'DECOMMISSIONED'
    case 'inactive': return 'INACTIVE'
    case 'active': return 'ACTIVE'
    default: return 'OPERATIONAL'
  }
}

function fromAssetStatus(s?: string) {
  switch ((s || '').toUpperCase()) {
    case 'UNDER_MAINTENANCE': return 'under-maintenance'
    case 'DECOMMISSIONED': return 'decommissioned'
    case 'INACTIVE': return 'inactive'
    case 'ACTIVE': return 'active'
    default: return 'operational'
  }
}

export async function listAssets(req: Request, res: Response) {
  const items = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' } })
  const mapped = items.map((it) => ({
    ...it,
    status: fromAssetStatus(it.status as any),
  }))
  return res.status(StatusCodes.OK).json({ items: mapped, total: mapped.length })
}

export async function getAssetById(req: Request, res: Response) {
  const { id } = req.params;
  const it = await prisma.asset.findUnique({ where: { id } })
  if (!it) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Asset not found' })
  return res.status(StatusCodes.OK).json({ ...it, status: fromAssetStatus(it.status as any) });
}

export async function createAsset(req: Request, res: Response) {
  const { id, name, description, location, purchaseDate, cost, warrantyExpiry, status, lastMaintenance, installationDate, category, manufacturer, model, serialNumber, manualUrl, latitude, longitude } = req.body || {}
  if (!name) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'name is required' })
  // allow client-provided id (asset tag) or auto cuid
  const data: any = {
    name,
    description: description || null,
    location: location || null,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
    cost: cost != null ? String(cost) : null,
    warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
    status: toAssetStatus(status),
    lastMaintenance: lastMaintenance ? new Date(lastMaintenance) : null,
    installationDate: installationDate ? new Date(installationDate) : null,
    category: category || null,
    manufacturer: manufacturer || null,
    model: model || null,
    serialNumber: serialNumber || null,
    manualUrl: manualUrl || null,
    latitude: latitude != null && latitude !== '' ? Number(latitude) : null,
    longitude: longitude != null && longitude !== '' ? Number(longitude) : null,
  }
  if (id) data.id = id
  const created = await prisma.asset.create({ data })
  return res.status(StatusCodes.CREATED).json({ id: created.id })
}

export async function updateAsset(req: Request, res: Response) {
  const { id } = req.params
  const { name, description, location, purchaseDate, cost, warrantyExpiry, status, lastMaintenance, installationDate, category, manufacturer, model, serialNumber, manualUrl, latitude, longitude } = req.body || {}
  const data: any = {}
  if (name !== undefined) data.name = name
  if (description !== undefined) data.description = description
  if (location !== undefined) data.location = location
  if (purchaseDate !== undefined) data.purchaseDate = purchaseDate ? new Date(purchaseDate) : null
  if (cost !== undefined) data.cost = cost != null ? String(cost) : null
  if (warrantyExpiry !== undefined) data.warrantyExpiry = warrantyExpiry ? new Date(warrantyExpiry) : null
  if (status !== undefined) data.status = toAssetStatus(status)
  if (lastMaintenance !== undefined) data.lastMaintenance = lastMaintenance ? new Date(lastMaintenance) : null
  if (installationDate !== undefined) data.installationDate = installationDate ? new Date(installationDate) : null
  if (category !== undefined) data.category = category
  if (manufacturer !== undefined) data.manufacturer = manufacturer
  if (model !== undefined) data.model = model
  if (serialNumber !== undefined) data.serialNumber = serialNumber
  if (manualUrl !== undefined) data.manualUrl = manualUrl
  if (latitude !== undefined) data.latitude = latitude != null && latitude !== '' ? Number(latitude) : null
  if (longitude !== undefined) data.longitude = longitude != null && longitude !== '' ? Number(longitude) : null
  const updated = await prisma.asset.update({ where: { id }, data })
  return res.status(StatusCodes.OK).json({ id: updated.id })
}

export async function updateAssetStatus(req: Request, res: Response) {
  const { id } = req.params
  const { status } = req.body || {}
  const updated = await prisma.asset.update({ where: { id }, data: { status: toAssetStatus(status) } })
  return res.status(StatusCodes.OK).json({ id: updated.id, status: fromAssetStatus(updated.status as any) })
}

export async function getAssetHistory(req: Request, res: Response) {
  const { id } = req.params;
  const history = [
    { id: 'log_1', type: 'CORRECTIVE', description: 'Replaced bearing', performedAt: new Date().toISOString() },
    { id: 'log_2', type: 'PREVENTIVE', description: 'Routine check', performedAt: new Date().toISOString() }
  ];
  return res.status(StatusCodes.OK).json({ assetId: id, history });
}

export async function getMaintenanceLogs(req: Request, res: Response) {
  const { id } = req.params;
  const logs = [
    { id: 'ml_1', type: 'PREVENTIVE', description: 'Monthly inspection', performedAt: new Date().toISOString() }
  ];
  return res.status(StatusCodes.OK).json({ assetId: id, logs });
}

export async function getSpareParts(req: Request, res: Response) {
  const { id } = req.params;
  const parts = [
    { id: 'sp_1', name: 'Bearing 6202', partNumber: '6202ZZ', quantity: 5 }
  ];
  return res.status(StatusCodes.OK).json({ assetId: id, parts });
}

export async function getAssetManual(req: Request, res: Response) {
  const { id } = req.params;
  // Could return a URL or serve a file; here we return a URL placeholder.
  return res.status(StatusCodes.OK).json({ assetId: id, url: 'https://example.com/manuals/asset.pdf' });
}

function ensureDir(dir: string) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) }
function attachmentsJsonPath(assetId: string) {
  const dir = path.join(paths.uploadDir, 'assets')
  ensureDir(dir)
  return path.join(dir, `${assetId}.json`)
}

export async function listAssetAttachments(req: Request, res: Response) {
  const { id } = req.params
  const p = attachmentsJsonPath(id)
  if (!fs.existsSync(p)) return res.status(StatusCodes.OK).json({ assetId: id, files: { photos: [], documents: [] } })
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    const data = JSON.parse(raw)
    return res.status(StatusCodes.OK).json({ assetId: id, files: data.files || { photos: [], documents: [] } })
  } catch {
    return res.status(StatusCodes.OK).json({ assetId: id, files: { photos: [], documents: [] } })
  }
}

export async function createAssetAttachments(req: Request, res: Response) {
  const { id } = req.params
  const files = req.files as Record<string, Express.Multer.File[]> | undefined
  const photos = files?.photos?.map(f => ({ filename: f.filename, path: `/uploads/${f.filename}`, mimeType: f.mimetype })) || []
  const documents = files?.documents?.map(f => ({ filename: f.filename, path: `/uploads/${f.filename}`, mimeType: f.mimetype })) || []

  const p = attachmentsJsonPath(id)
  let existing = { files: { photos: [] as any[], documents: [] as any[] } }
  if (fs.existsSync(p)) {
    try { existing = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
  }
  const merged = {
    files: {
      photos: [...(existing.files?.photos || []), ...photos],
      documents: [...(existing.files?.documents || []), ...documents],
    }
  }
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8')
  return res.status(StatusCodes.CREATED).json({ assetId: id, files: { photos, documents } })
}

export async function deleteAssetAttachment(req: Request, res: Response) {
  const { id, filename } = { id: req.params.id, filename: req.params.filename }
  if (!filename) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'filename is required' })
  const p = attachmentsJsonPath(id)
  let existing = { files: { photos: [] as any[], documents: [] as any[] } }
  if (fs.existsSync(p)) {
    try { existing = JSON.parse(fs.readFileSync(p, 'utf-8')) } catch {}
  }
  const beforePhotos = existing.files?.photos?.length || 0
  const beforeDocs = existing.files?.documents?.length || 0
  const photos = (existing.files?.photos || []).filter((f: any) => f.filename !== filename)
  const documents = (existing.files?.documents || []).filter((f: any) => f.filename !== filename)
  const changed = photos.length !== beforePhotos || documents.length !== beforeDocs
  if (!changed) {
    return res.status(StatusCodes.NOT_FOUND).json({ message: 'attachment not found' })
  }
  const merged = { files: { photos, documents } }
  fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf-8')
  // Try to delete the file from disk if present
  try {
    const diskPath = path.join(paths.uploadDir, filename)
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath)
  } catch {}
  return res.status(StatusCodes.OK).json({ assetId: id, filename })
}

