import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private aiClient: GoogleGenAI | null = null;

  private get ai(): GoogleGenAI {
    if (!this.aiClient) {
      if (typeof GEMINI_API_KEY === 'undefined' || !GEMINI_API_KEY || GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        throw new Error('GEMINI_API_KEY is missing. To fix: Click the Gear icon (Bottom Left) -> Environment Variables -> Add GEMINI_API_KEY.');
      }
      this.aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
    return this.aiClient;
  }

  async analyzeMeal(description: string) {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this meal description and provide nutritional info: "${description}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["name", "calories", "protein", "carbs", "fats"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  }

  async analyzeMealImage(base64Image: string, mimeType: string = 'image/jpeg') {
    const response = await this.ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        },
        {
          text: "Analyze this meal photo and provide estimated nutritional info. Be as accurate as possible for calories, protein, carbs, and fats."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["name", "calories", "protein", "carbs", "fats"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  }
}
