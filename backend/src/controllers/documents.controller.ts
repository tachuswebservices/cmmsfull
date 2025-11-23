import { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { StatusCodes } from 'http-status-codes'
import { paths } from '../config/env'

const DOCS_ROOT = path.join(paths.uploadDir, 'docs')

type Attachment = { id: string; name: string; size: number; url: string }
type DocMeta = { id: string; name: string; description?: string; createdAt: string; attachments: Attachment[] }

function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }) }
function isPdf(name: string) { return name.toLowerCase().endsWith('.pdf') }
function metaPath(docId: string) { return path.join(DOCS_ROOT, docId, 'metadata.json') }
function readMeta(docId: string): DocMeta | null {
  try {
    const raw = fs.readFileSync(metaPath(docId), 'utf8')
    return JSON.parse(raw)
  } catch { return null }
}

export async function listDocuments(_req: Request, res: Response) {
  ensureDir(DOCS_ROOT)
  const dirs = (await fs.promises.readdir(DOCS_ROOT).catch(() => [])).filter(d => fs.existsSync(path.join(DOCS_ROOT, d)) && fs.statSync(path.join(DOCS_ROOT, d)).isDirectory())
  const items: DocMeta[] = []
  for (const id of dirs) {
    const meta = readMeta(id)
    if (meta) items.push(meta)
  }
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return res.status(StatusCodes.OK).json({ items })
}

export async function getDocument(req: Request, res: Response) {
  const { id } = req.params
  if (!id) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'id is required' })
  const meta = readMeta(id)
  if (!meta) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Document not found' })
  return res.status(StatusCodes.OK).json(meta)
}

export async function createDocument(req: Request, res: Response) {
  const docId = (req as any).docId as string
  if (!docId) return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'docId missing' })
  const files = (req as any).files as Express.Multer.File[] | undefined
  const description = (req.body?.description as string | undefined) || ''
  const name = (req.body?.name as string | undefined) || `Document ${new Date().toLocaleString()}`

  const dir = path.join(DOCS_ROOT, docId)
  ensureDir(dir)
  const attachments: Attachment[] = []
  for (const f of files || []) {
    if (!isPdf(f.originalname)) continue
    attachments.push({ id: f.filename, name: f.originalname, size: f.size, url: `/uploads/docs/${encodeURIComponent(docId)}/${encodeURIComponent(f.filename)}` })
  }
  if (attachments.length === 0) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'At least one PDF file is required' })
  const meta: DocMeta = { id: docId, name, description, createdAt: new Date().toISOString(), attachments }
  await fs.promises.writeFile(metaPath(docId), JSON.stringify(meta, null, 2), 'utf8')
  return res.status(StatusCodes.CREATED).json(meta)
}

export async function updateDocument(req: Request, res: Response) {
  const { id } = req.params
  if (!id) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'id is required' })
  const meta = readMeta(id)
  if (!meta) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Document not found' })
  const description = (req.body?.description as string | undefined)
  if (typeof description === 'string') meta.description = description
  await fs.promises.writeFile(metaPath(id), JSON.stringify(meta, null, 2), 'utf8')
  return res.status(StatusCodes.OK).json(meta)
}

export async function deleteDocument(req: Request, res: Response) {
  const { id } = req.params
  if (!id) return res.status(StatusCodes.BAD_REQUEST).json({ message: 'id is required' })
  const dir = path.join(DOCS_ROOT, id)
  if (!fs.existsSync(dir)) return res.status(StatusCodes.NOT_FOUND).json({ message: 'Document not found' })
  // Recursively delete directory
  await fs.promises.rm(dir, { recursive: true, force: true })
  return res.status(StatusCodes.NO_CONTENT).send()
}
