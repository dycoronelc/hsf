import { Controller, Get, Header, Param, StreamableFile } from '@nestjs/common';
import { MonitorService } from './monitor.service';
import { MonitorMediaService } from './monitor-media.service';

@Controller('monitor')
export class MonitorController {
  constructor(
    private readonly monitorService: MonitorService,
    private readonly monitorMediaService: MonitorMediaService,
  ) {}

  @Get('queue/:serviceId')
  async getQueue(@Param('serviceId') serviceId: number) {
    return this.monitorService.getQueue(+serviceId);
  }

  @Get('all-queues')
  async getAllQueues() {
    return this.monitorService.getAllQueues();
  }

  @Get('media')
  async getActiveMedia() {
    return this.monitorMediaService.listActive();
  }

  @Get('media-file/:filename')
  @Header('Cache-Control', 'public, max-age=86400')
  getMediaFile(@Param('filename') filename: string): StreamableFile {
    return this.monitorMediaService.getFileStream(filename);
  }

  @Get('preadmissions')
  async getPreadmissions() {
    return this.monitorService.getPreadmissionsForMonitor();
  }
}
