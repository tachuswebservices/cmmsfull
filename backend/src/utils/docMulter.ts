import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { paths } from '../config/env'

function ensureDirExists(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export function assignDocId() {
  return (req: any, _res: any, next: any) => {
    if (!req.docId) req.docId = Date.now().toString(36) + '-' + Math.round(Math.random() * 1e9).toString(36)
    next()
  }
}

const storage = multer.diskStorage({
  destination: function (req: any, _file, cb) {
    const docId = req.docId as string
    const dir = path.join(paths.uploadDir, 'docs', docId)
    ensureDirExists(dir)
    cb(null, dir)
  },
  filename: function (_req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '_')
    cb(null, `${base}-${unique}${ext}`)
  }
})

export const docUpload = multer({ storage })
