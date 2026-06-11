import { OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
export declare class PreadmissionSchemaBootstrap implements OnModuleInit {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    onModuleInit(): Promise<void>;
}
