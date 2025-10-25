import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class EventBusService {
    private readonly logger = new Logger(EventBusService.name);

    public publishMatchFound(payload: any): void {
        this.logger.log(`Event Bus Stub: ${JSON.stringify(payload)}`);
        // TODO: Replace with actual Kafka logic
    }
}