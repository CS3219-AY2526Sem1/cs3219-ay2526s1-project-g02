import { Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";
import { CheckService } from "./check.service";

@Module({
    imports: [DatabaseModule],
    providers: [CheckService],
    exports: [CheckService],
})
export class CheckModule {}