import {Body, Controller, Delete, Param, Post, Query, Sse, MessageEvent} from "@nestjs/common";
import { ForecastService } from "./forecast.service";
import { DateInput, BatchDateInput } from "@shared/types";
import { Observable, Subject } from "rxjs";
import { randomUUID } from "crypto";

@Controller("forecast")
export class ForecastController {
  private progressStreams = new Map<string, Subject<MessageEvent>>();

  constructor(private readonly service: ForecastService) {}

  @Post()
  async create(@Body() body: DateInput) {
    return this.service.createForecast(body);
  }

  @Post("batch")
  async createBatch(@Body() body: BatchDateInput & { sessionId?: string }) {
    const sessionId = body.sessionId || randomUUID();

    // Create progress stream if not exists
    if (!this.progressStreams.has(sessionId)) {
      this.progressStreams.set(sessionId, new Subject<MessageEvent>());
    }

    const progressCallback = (progress: any) => {
      const stream = this.progressStreams.get(sessionId);
      if (stream) {
        stream.next({ data: progress } as MessageEvent);
      }
    };

    // Start batch generation in background
    const result = await this.service.createBatchForecasts(body, sessionId, progressCallback);

    return { ...result, sessionId };
  }

  @Sse('batch/progress/:sessionId')
  getProgress(@Param('sessionId') sessionId: string): Observable<MessageEvent> {
    if (!this.progressStreams.has(sessionId)) {
      this.progressStreams.set(sessionId, new Subject<MessageEvent>());
    }

    return this.progressStreams.get(sessionId)!.asObservable();
  }

    @Delete("forecast/:id")
    async deleteForecast(@Param("id") id: string, @Query("driveId") driveId?: string) {
        const ok = await this.service.deleteForecast(id, driveId);
        return { success: ok };
    }
}
