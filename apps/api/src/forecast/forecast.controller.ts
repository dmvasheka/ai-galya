import { Body, Controller, Post } from "@nestjs/common";
import { ForecastService } from "./forecast.service";
import { DateInput } from "@shared/types";

@Controller("forecast")
export class ForecastController {
  constructor(private readonly service: ForecastService) {}

  @Post()
  async create(@Body() body: DateInput) {
    return this.service.createForecast(body);
  }
}
