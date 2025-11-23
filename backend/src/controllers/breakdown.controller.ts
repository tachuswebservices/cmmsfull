import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../services/prisma';
import { MediaType } from '@prisma/client';

export async function submitBreakdownReport(req: Request, res: Response) {
  // Allow longer operation (up to 60s for large uploads)
  res.setTimeout(60_000);

  const { title, description, assetId } = req.body || {};
  const user = (req as any).user as { id?: string } | undefined;
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;

  try {
    const report = await prisma.breakdownReport.create({
      data: {
        title: title || null,
        description: description || null,
        assetId: assetId || null,
        reportedById: user?.id || null,
        mediaFiles: {
          create: [
            ...(files?.photos || []).map((f) => ({ type: MediaType.PHOTO, path: `/uploads/${f.filename}`, mimeType: f.mimetype })),
            ...(files?.audio || []).map((f) => ({ type: MediaType.AUDIO, path: `/uploads/${f.filename}`, mimeType: f.mimetype })),
            ...(files?.videos || []).map((f) => ({ type: MediaType.VIDEO, path: `/uploads/${f.filename}`, mimeType: f.mimetype })),
          ],
        },
      },
      include: { mediaFiles: true },
    });

    return res.status(StatusCodes.CREATED).json(report);
  } catch (err) {
    console.error('Failed to save breakdown report', err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Failed to save breakdown report' });
  }
}

export async function transcribeAudio(req: Request, res: Response) {
  // Simulate transcription timeout config (30s)
  res.setTimeout(30_000);

  // Accept either uploaded file (req.file) or audioUri in body.
  const file = (req as any).file as Express.Multer.File | undefined;
  const { audioUri, sourceLanguage, translate } = req.body || {};

  // Stubbed response
  return res.status(StatusCodes.OK).json({
    transcript: 'Transcription is not implemented in this scaffold.',
    meta: {
      file: file ? { filename: file.filename, path: `/uploads/${file.filename}`, mimeType: file.mimetype } : undefined,
      audioUri,
      sourceLanguage,
      translate: translate === 'true' || translate === true
    }
  });
}

