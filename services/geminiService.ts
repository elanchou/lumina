
import { GoogleGenAI, Type, GenerateContentResponse, FunctionDeclaration } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

const apiKey = process.env.API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Define the Tool for Gemini
const createWidgetTool: FunctionDeclaration = {
  name: 'createDashboardWidget',
  description: 'Creates a new widget on the user dashboard to visualize financial data, track a stock price, or show a key metric.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: 'The type of widget: "metric" (single number), "chart" (line chart), or "insight" (text card).',
        enum: ['metric', 'chart', 'insight']
      },
      title: {
        type: Type.STRING,
        description: 'The title of the widget (e.g., "AAPL Price", "Portfolio Risk").'
      },
      subTitle: {
        type: Type.STRING,
        description: 'Subtitle or context (e.g., "Real-time value", "AI Assessment").'
      },
      dataValue: {
        type: Type.STRING,
        description: 'For metrics: the main value (e.g., "$150.00"). For charts: comma separated values.'
      },
      visualStyle: {
        type: Type.STRING,
        description: 'Color theme',
        enum: ['default', 'accent', 'success', 'warning', 'danger']
      }
    },
    required: ['type', 'title', 'dataValue']
  }
};

export const generateFinancialResponse = async (
  history: { role: 'user' | 'model', text: string }[],
  lastMessage: string,
  portfolioContext?: string
): Promise<GenerateContentResponse | null> => {
  if (!ai) {
    console.error("API Key is missing.");
    return null;
  }

  try {
    const model = 'gemini-2.5-flash'; 

    let instruction = SYSTEM_INSTRUCTION;
    instruction += `\n\nYou have the ability to modify the user's dashboard by calling the 'createDashboardWidget' function. 
    If the user asks to "monitor", "track", "show me a chart of", or "add a card for" something, use the tool.
    
    For 'metric' widgets, 'dataValue' should be the formatted number (e.g. "+5.2%").
    For 'chart' widgets, 'dataValue' should be a comma-separated string of 10 numbers simulating trend history.
    For 'insight' widgets, 'dataValue' is the body text.`;

    if (portfolioContext) {
        instruction += `\n\nCURRENT USER PORTFOLIO CONTEXT:\n${portfolioContext}`;
    }

    const chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: instruction,
            // Combine Google Search with our custom function
            tools: [
              { googleSearch: {} },
              { functionDeclarations: [createWidgetTool] }
            ],
        }
    });

    const response: GenerateContentResponse = await chat.sendMessage({
        message: lastMessage
    });

    return response;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const analyzePortfolioRisk = async (assets: string): Promise<string> => {
     if (!ai) return "API Key Missing";

     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following portfolio for risk, volatility, and diversification. JSON format: ${assets}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        riskScore: { type: Type.NUMBER, description: "0-100 score, 100 being highest risk" },
                        volatility: { type: Type.STRING, description: "Low, Medium, or High" },
                        maxDrawdown: { type: Type.STRING, description: "Estimated max drawdown percentage" },
                        summary: { type: Type.STRING, description: "A brief analysis paragraph" },
                        recommendations: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING },
                            description: "3 actionable bullet points"
                        }
                    }
                }
            }
        });
        return response.text || "{}";
     } catch (e) {
         console.error(e);
         return "{}";
     }
}
