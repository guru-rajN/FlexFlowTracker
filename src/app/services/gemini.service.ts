import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai = new GoogleGenAI({ apiKey: (globalThis as any).GEMINI_API_KEY || '' });

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
