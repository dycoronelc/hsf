import { Module } from '@nestjs/common';
import { PreadmissionStorageService } from './preadmission-storage.service';

@Module({
  providers: [PreadmissionStorageService],
  exports: [PreadmissionStorageService],
})
export class PreadmissionStorageModule {}
