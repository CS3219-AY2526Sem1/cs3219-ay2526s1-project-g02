import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class EventBusService {
    private readonly logger = new Logger(EventBusService.name);

    public publishMatchFound(payload: any): void {
        this.logger.log(`Event Bus Stub: ${JSON.stringify(payload)}`);
        // TODO: Replace with actual Kafka logic
    }

    // TODO: Add method to subscribe to events 
    // At minimum, subscribe to Collab Service informing match ended
    public subscribeToMatchEndedEvents(): void {
        this.logger.log(`Event Bus Stub: Subscribing to match ended events`);
        // TODO: Replace with actual Kafka logic
    }
}