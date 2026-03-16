import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.GEMINI_API_KEY || '' });

export interface ParsedExpense {
  amount: number;
  category: string;
  description: string;
}

export const parseExpenseWithAI = async (text: string): Promise<ParsedExpense | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract expense details from this text: "${text}". 
      Categories available: Comida, Transporte, Vivienda, Entretenimiento, Salud, Otros.
      Return the amount as a number, the most likely category, and a short description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { 
              type: Type.STRING,
              enum: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Otros']
            },
            description: { type: Type.STRING }
          },
          required: ["amount", "category", "description"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as ParsedExpense;
  } catch (error) {
    console.error("Error parsing with AI:", error);
    return null;
  }
};

export const scanReceiptWithAI = async (base64Image: string): Promise<ParsedExpense | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(',')[1] || base64Image
          }
        },
        {
          text: "Extract expense details from this receipt image. Categories: Comida, Transporte, Vivienda, Entretenimiento, Salud, Otros. Return JSON with amount, category, and description."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            category: { 
              type: Type.STRING,
              enum: ['Comida', 'Transporte', 'Vivienda', 'Entretenimiento', 'Salud', 'Otros']
            },
            description: { type: Type.STRING }
          },
          required: ["amount", "category", "description"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as ParsedExpense;
  } catch (error) {
    console.error("Error scanning receipt:", error);
    return null;
  }
};

export const getFinancialInsight = async (expenses: any[], goals: any[]): Promise<string> => {
  if (expenses.length === 0) return "¡Empieza a registrar tus gastos para obtener consejos!";
  
  try {
    const summary = expenses.map(e => `${e.category}: ${e.amount} (${e.date})`).join(', ');
    const goalsSummary = goals.map(g => `${g.title}: ${g.currentAmount}/${g.targetAmount}`).join(', ');
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza estos gastos: ${summary}. Metas actuales: ${goalsSummary}. 
      Da un consejo financiero proactivo y personalizado en español (máx 20 palabras). 
      Si hay patrones de gasto alto, advierte. Si hay progreso en metas, felicita.`,
    });
    return response.text || "Sigue controlando tus gastos para ahorrar más.";
  } catch (error) {
    return "Mantén el buen ritmo con tus finanzas.";
  }
};
