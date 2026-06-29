import { DataSource } from 'typeorm';
export declare function repoRootFromBackend(): string;
export declare function syncGeoCatalog(dataSource: DataSource): Promise<void>;
