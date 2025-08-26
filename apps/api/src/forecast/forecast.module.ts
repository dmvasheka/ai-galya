import { Module } from "@nestjs/common";
import { ForecastController } from "./forecast.controller";
import { ForecastService } from "./forecast.service";
import { PdfService } from "../pdf/pdf.service";
import { LlmService } from "../llm/llm.service";
import { DriveService } from "../drive/drive.service";

@Module({
  controllers: [ForecastController],
  providers: [ForecastService, PdfService, LlmService, DriveService]
})
export class ForecastModule {}
