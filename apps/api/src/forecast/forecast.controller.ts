import {Body, Controller, Delete, Param, Post, Query} from "@nestjs/common";
import { ForecastService } from "./forecast.service";
import { DateInput, BatchDateInput } from "@shared/types";

@Controller("forecast")
export class ForecastController {
  constructor(private readonly service: ForecastService) {}

  @Post()
  async create(@Body() body: DateInput) {
    return this.service.createForecast(body);
  }

  @Post("batch")
  async createBatch(@Body() body: BatchDateInput) {
    return this.service.createBatchForecasts(body);
  }

    @Delete("forecast/:id")
    async deleteForecast(@Param("id") id: string, @Query("driveId") driveId?: string) {
        const ok = await this.service.deleteForecast(id, driveId);
        return { success: ok };
    }
}
