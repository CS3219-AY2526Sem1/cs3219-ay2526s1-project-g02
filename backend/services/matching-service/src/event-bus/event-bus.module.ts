import { Module, forwardRef } from "@nestjs/common";
import { EventBusService } from "./event-bus.service";
import { MatchingModule } from "src/matching/matching.module";

@Module({
    imports: [
        forwardRef(() => MatchingModule),
    ],
    providers: [EventBusService],
    exports: [EventBusService],
})
export class EventBusModule {}