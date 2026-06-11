import { AppService } from './app.service';
import { CellbyteService } from './integrations/cellbyte.service';
export declare class AppController {
    private readonly appService;
    private readonly cellbyteService;
    constructor(appService: AppService, cellbyteService: CellbyteService);
    getHello(): string;
    getHealth(): {
        status: string;
    };
    getCellbyteConnectivity(): Promise<import("./integrations/cellbyte.service").CellbyteConnectivityResult>;
}
