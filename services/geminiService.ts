
import { GoogleGenAI, Type, GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const createWidgetTool: FunctionDeclaration = {
  name: 'createDashboardWidget',
  description: 'Creates a new dynamic widget on the dashboard to visualize any asset data, market trends, or AI financial insights.',
  parameters: {
    type: {
      type: Type.OBJECT,
      properties: {
        type: {
          type: Type.STRING,
          description: 'Type: "metric" (single value), "chart" (line trend), "insight" (analysis text).',
          enum: ['metric', 'chart', 'insight']
        },
        title: {
          type: Type.STRING,
          description: 'Widget title (e.g., "Gold Valuation", "Portfolio Health").'
        },
        subTitle: {
          type: Type.STRING,
          description: 'Context text.'
        },
        dataValue: {
          type: Type.STRING,
          description: 'The primary data: formatted string for metrics, comma-separated numbers for charts, or full text for insights.'
        },
        visualStyle: {
          type: Type.STRING,
          description: 'Color theme.',
          enum: ['default', 'accent', 'success', 'warning', 'danger']
        }
      },
      required: ['type', 'title', 'dataValue']
    }
  }
};

export const generateFinancialResponse = async (
  history: { role: 'user' | 'model', text: string }[],
  lastMessage: string,
  portfolioContext?: string
): Promise<GenerateContentResponse | null> => {
  try {
    const model = 'gemini-3-flash-preview'; 

    let instruction = SYSTEM_INSTRUCTION;
    if (portfolioContext) {
        instruction += `\n\nCURRENT GLOBAL ASSETS:\n${portfolioContext}`;
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: [
            ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
            { role: 'user', parts: [{ text: lastMessage }] }
        ],
        config: {
            systemInstruction: instruction,
            tools: [
              { googleSearch: {} },
              { functionDeclarations: [createWidgetTool] }
            ],
        }
    });

    return response;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const analyzePortfolioRisk = async (assets: string): Promise<string> => {
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Conduct a deep risk analysis of this multi-asset portfolio including correlation risks between hard and liquid assets: ${assets}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        riskScore: { type: Type.NUMBER },
                        volatility: { type: Type.STRING },
                        maxDrawdown: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        recommendations: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['riskScore', 'volatility', 'summary']
                }
            }
        });
        return response.text || "{}";
     } catch (e) {
         console.error(e);
         return "{}";
     }
}
