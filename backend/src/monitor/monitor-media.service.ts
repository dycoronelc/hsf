import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { MonitorMedia } from './entities/monitor-media.entity';
import { CreateMonitorMediaDto, UpdateMonitorMediaDto } from '../admin/dto/monitor-media.dto';

const IMAGE_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/ogg']);
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;
const MEDIA_FILE_PREFIX = '/api/monitor/media-file/';

type UploadedMemoryFile = {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
  size: number;
};

@Injectable()
export class MonitorMediaService {
  private readonly logger = new Logger(MonitorMediaService.name);
  private readonly uploadRoot: string;

  constructor(
    @InjectRepository(MonitorMedia)
    private readonly mediaRepository: Repository<MonitorMedia>,
  ) {
    this.uploadRoot = resolveMonitorMediaUploadRoot();
    mkdirSync(this.uploadRoot, { recursive: true });
    this.logger.log(`Archivos del monitor: ${this.uploadRoot}`);
  }

  listActive() {
    return this.mediaRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
  }

  listAll() {
    return this.mediaRepository.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async create(dto: CreateMonitorMediaDto) {
    const row = this.mediaRepository.create({
      kind: dto.kind,
      title: dto.title.trim(),
      body: dto.body?.trim() || null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.mediaRepository.save(row);
  }

  async createWithUpload(
    dto: {
      kind: 'image' | 'video';
      title: string;
      isActive?: boolean;
      sortOrder?: number;
    },
    file: UploadedMemoryFile,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debe seleccionar un archivo de imagen o video');
    }
    const publicUrl = this.saveUploadedFile(dto.kind, file);
    return this.create({
      kind: dto.kind,
      title: dto.title,
      body: publicUrl,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    });
  }

  async update(id: number, dto: UpdateMonitorMediaDto) {
    const row = await this.mediaRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Contenido no encontrado');
    if (dto.kind !== undefined) row.kind = dto.kind;
    if (dto.title !== undefined) row.title = dto.title.trim();
    if (dto.body !== undefined) row.body = dto.body?.trim() || null;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) row.sortOrder = dto.sortOrder;
    return this.mediaRepository.save(row);
  }

  async remove(id: number) {
    const row = await this.mediaRepository.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Contenido no encontrado');
    this.deleteStoredFileIfOwned(row.body);
    await this.mediaRepository.delete({ id });
    return { ok: true };
  }

  getFileStream(filename: string): StreamableFile {
    const safe = this.assertSafeFilename(filename);
    const absolute = path.join(this.uploadRoot, safe);
    if (!existsSync(absolute)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return new StreamableFile(createReadStream(absolute), {
      type: this.mimeFromFilename(safe),
      disposition: `inline; filename="${safe}"`,
    });
  }

  private saveUploadedFile(kind: 'image' | 'video', file: UploadedMemoryFile): string {
    const mime = (file.mimetype || '').toLowerCase().trim();
    if (kind === 'image') {
      if (!IMAGE_MIME.has(mime)) {
        throw new BadRequestException('Imagen no permitida. Use JPG, PNG, WEBP o GIF');
      }
      if (file.size > MAX_IMAGE_BYTES) {
        throw new BadRequestException('La imagen supera el tamaño máximo de 15 MB');
      }
    } else {
      if (!VIDEO_MIME.has(mime)) {
        throw new BadRequestException('Video no permitido. Use MP4, WEBM o OGG');
      }
      if (file.size > MAX_VIDEO_BYTES) {
        throw new BadRequestException('El video supera el tamaño máximo de 80 MB');
      }
    }

    const ext = this.extensionForMime(mime, file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const absolute = path.join(this.uploadRoot, filename);
    writeFileSync(absolute, file.buffer);
    return `${MEDIA_FILE_PREFIX}${filename}`;
  }

  private deleteStoredFileIfOwned(body: string | null) {
    if (!body?.startsWith(MEDIA_FILE_PREFIX)) return;
    const filename = body.slice(MEDIA_FILE_PREFIX.length);
    try {
      const safe = this.assertSafeFilename(filename);
      const absolute = path.join(this.uploadRoot, safe);
      if (existsSync(absolute)) unlinkSync(absolute);
    } catch {
      /* ignore cleanup errors */
    }
  }

  private assertSafeFilename(filename: string): string {
    const base = path.basename(filename);
    if (!base || base !== filename || filename.includes('..') || !/^[a-zA-Z0-9._-]+$/.test(base)) {
      throw new BadRequestException('Nombre de archivo inválido');
    }
    return base;
  }

  private extensionForMime(mime: string, originalname?: string): string {
    const fromMime: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/ogg': '.ogg',
    };
    if (fromMime[mime]) return fromMime[mime];
    const ext = path.extname(originalname || '').toLowerCase();
    if (ext && /^\.[a-z0-9]+$/.test(ext)) return ext;
    return kindFallbackExt(mime);
  }

  private mimeFromFilename(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      case '.mp4':
        return 'video/mp4';
      case '.webm':
        return 'video/webm';
      case '.ogg':
        return 'video/ogg';
      default:
        return 'application/octet-stream';
    }
  }
}

function kindFallbackExt(mime: string): string {
  if (mime.startsWith('image/')) return '.jpg';
  if (mime.startsWith('video/')) return '.mp4';
  return '.bin';
}

function resolveMonitorMediaUploadRoot(): string {
  const configured =
    process.env.MONITOR_MEDIA_UPLOAD_DIR?.trim() ||
    process.env.PREADMISSION_UPLOAD_DIR?.trim() ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (configured) {
    return path.resolve(configured, 'monitor-media');
  }
  return path.resolve(process.cwd(), 'uploads', 'monitor-media');
}
