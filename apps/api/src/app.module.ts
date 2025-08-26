import { Module } from "@nestjs/common";
import { ForecastModule } from "./forecast/forecast.module";

@Module({ imports: [ForecastModule] })
export class AppModule {}
