import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventBusService } from "./event-bus.service";

@Module({
    imports: [ConfigModule],
    providers: [EventBusService],
    exports: [EventBusService],
})
export class EventBusModule {}
