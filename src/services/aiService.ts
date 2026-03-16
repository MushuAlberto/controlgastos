export interface ParsedExpense {
  amount: number;
  category: string;
  description: string;
}

const SYSTEM_PROMPT = `Eres un experto en finanzas personales. Tu tarea es procesar gastos y devolver JSON estructurado. 
Categorías disponibles: Comida, Transporte, Vivienda, Entretenimiento, Salud, Otros.`;

export const parseExpenseWithAI = async (text: string): Promise<ParsedExpense | null> => {
  try {
    // Ensure Puter is signed in (silent if already done)
    if (typeof puter !== 'undefined' && !puter.auth.isSignedIn()) {
      await puter.auth.signIn({ attempt_temp_user_creation: true });
    }

    const response = await puter.ai.chat(
      `${SYSTEM_PROMPT}\n\nExtrae los detalles del gasto de este texto: "${text}". 
      Devuelve el monto como número, la categoría más probable y una descripción corta.
      Responde SOLO el objeto JSON con las llaves: amount (number), category (string), description (string).`,
      { model: 'claude-3-5-sonnet' }
    );

    const resultText = response.message.content[0].text;
    const result = JSON.parse(resultText.replace(/```json|```/g, '').trim());
    return result as ParsedExpense;
  } catch (error) {
    console.error("Error parsing with Puter AI:", error);
    return null;
  }
};

export const scanReceiptWithAI = async (base64Image: string): Promise<ParsedExpense | null> => {
  try {
    // Ensure Puter is signed in (silent if already done)
    if (typeof puter !== 'undefined' && !puter.auth.isSignedIn()) {
      await puter.auth.signIn({ attempt_temp_user_creation: true });
    }

    // Puter handles multimodal chat by passing image data
    const response = await puter.ai.chat(
      [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${SYSTEM_PROMPT}\n\nAnaliza este recibo y extrae el monto total, la categoría y descripción. 
              Responde SOLO un objeto JSON con las llaves: amount (number), category (string), description (string).`
            },
            {
              type: 'image',
              image_data: base64Image.split(',')[1] || base64Image
            }
          ]
        }
      ],
      { model: 'claude-3-5-sonnet' }
    );

    const resultText = response.message.content[0].text;
    const result = JSON.parse(resultText.replace(/```json|```/g, '').trim());
    return result as ParsedExpense;
  } catch (error) {
    console.error("Error scanning receipt with Puter AI:", error);
    return null;
  }
};

export const getFinancialInsight = async (expenses: any[], goals: any[]): Promise<string> => {
  if (expenses.length === 0) return "¡Empieza a registrar tus gastos para obtener consejos!";
  
  try {
    // Ensure Puter is signed in (silent if already done)
    if (typeof puter !== 'undefined' && !puter.auth.isSignedIn()) {
      await puter.auth.signIn({ attempt_temp_user_creation: true });
    }

    const summary = expenses.map(e => `${e.category}: ${e.amount} (${e.date})`).join(', ');
    const goalsSummary = goals.map(g => `${g.title}: ${g.currentAmount}/${g.targetAmount}`).join(', ');
    
    const response = await puter.ai.chat(
      `Analiza estos gastos: ${summary}. Metas actuales: ${goalsSummary}. 
      Da un consejo financiero proactivo y personalizado en español (máx 20 palabras). 
      Si hay patrones de gasto alto, advierte. Si hay progreso en metas, felicita.`,
      { model: 'claude-3-5-sonnet' }
    );

    return response.message.content[0].text || "Sigue controlando tus gastos para ahorrar más.";
  } catch (error) {
    console.error("Error getting insights with Puter AI:", error);
    return "Mantén el buen ritmo con tus finanzas.";
  }
};
