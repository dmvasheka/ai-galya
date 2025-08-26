import { Injectable } from "@nestjs/common";

const USE_LLM = process.env.USE_LLM !== "false";

@Injectable()
export class LlmService {
  async generate(prompt: string): Promise<string> {
    if (!USE_LLM) {
      return `# Numerology Forecast

## Overview
A focused interpretation based on your date parameters.

## Energy Map
- Core number insights...

## Practical Advice
- Habits, finance, relationships...

## Opportunities
- Windows of action by month...
`;
    }
    const { OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const resp = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You write detailed, structured numerology forecasts." },
        { role: "user", content: prompt }
      ],
      temperature: 0.8
    });
    const text = resp.choices[0]?.message?.content || "";
    return text.trim();
  }
}
