import { Injectable } from "@nestjs/common";
import { google } from "googleapis";
import * as fs from "fs";

@Injectable()
export class DriveService {
  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  constructor() {
    if (process.env.GOOGLE_TOKENS_JSON) {
      this.oauth2Client.setCredentials(JSON.parse(process.env.GOOGLE_TOKENS_JSON));
    }
  }

  async uploadPdf(path: string, name: string): Promise<string> {
    const drive = google.drive({ version: "v3", auth: this.oauth2Client });

    const res = await drive.files.create({
      requestBody: { name, mimeType: "application/pdf", parents: process.env.GOOGLE_DRIVE_PARENT_ID ? [process.env.GOOGLE_DRIVE_PARENT_ID] : undefined },
      media: { mimeType: "application/pdf", body: fs.createReadStream(path) },
      fields: "id"
    });

    return res.data.id!;
  }
}
