import { CellbyteService } from './cellbyte.service';
export declare class CellbyteController {
    private readonly cellbyteService;
    constructor(cellbyteService: CellbyteService);
    checkConnectivity(): Promise<import("./cellbyte.service").CellbyteConnectivityResult>;
}
