import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private aiClient: GoogleGenAI | null = null;

  private get ai(): GoogleGenAI {
    if (!this.aiClient) {
      if (typeof GEMINI_API_KEY === 'undefined' || !GEMINI_API_KEY || GEMINI_API_KEY === 'your_key_here') {
        throw new Error('GEMINI_API_KEY is missing. To fix:\n1. Click the ⚙️ Gear icon (Bottom Left Sidebar).\n2. Look for "Secrets" or "Environment Variables" tab.\n3. Add variable name GEMINI_API_KEY and paste your key.');
      }
      this.aiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    }
    return this.aiClient;
  }

  async analyzeMeal(description: string) {
    console.log('Gemini: Starting meal analysis...', description);
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [`Analyze this meal description and provide nutritional info: "${description}"`],
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

      console.log('Gemini: Analysis response received', response);
      return typeof response.text === 'string' ? JSON.parse(response.text) : (response as any).text;
    } catch (error: any) {
      console.error('Gemini Analysis Error Detail:', {
        message: error.message,
        status: error.status,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  async analyzeMealImage(base64Image: string, mimeType: string = 'image/jpeg') {
    console.log('Gemini: Starting image analysis...');
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
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

      console.log('Gemini: Image analysis response received', response);
      return typeof response.text === 'string' ? JSON.parse(response.text) : (response as any).text;
    } catch (error: any) {
      console.error('Gemini Image Analysis Error Detail:', {
        message: error.message,
        status: error.status,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }
}
