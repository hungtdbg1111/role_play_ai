
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";

const IMAGE_MODEL_NAME = 'gemini-2.0-flash-preview-image-generation';
let ai: GoogleGenAI | null = null;

function getAiInstance(): GoogleGenAI {
  if (!ai) {
    if (!process.env.API_KEY) {
      console.error("API_KEY is not configured in process.env.API_KEY");
      throw new Error("API Key chưa được cấu hình. Vui lòng kiểm tra biến môi trường API_KEY.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
}

export async function generateImageWithGemini2Flash(prompt: string): Promise<string> {
  const geminiAi = getAiInstance();
  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    
    // Configuration required by gemini-2.0-flash-preview-image-generation
    // to specify it can return both TEXT and IMAGE.
    const config = {
      responseModalities: ['TEXT', 'IMAGE'],
      responseMimeType: 'text/plain', // As per original user script, ensures text parts are handled
    };

    const responseStream = await geminiAi.models.generateContentStream({
      model: IMAGE_MODEL_NAME,
      contents: contents,
      config: config, 
    });

    for await (const chunk of responseStream) {
      // console.log("Received chunk:", JSON.stringify(chunk, null, 2)); // Optional: for debugging stream content
      if (chunk.candidates && chunk.candidates.length > 0) {
        const candidate = chunk.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data && part.inlineData.mimeType) {
              const base64ImageBytes = part.inlineData.data;
              // const mimeType = part.inlineData.mimeType; // MimeType not needed if returning raw base64
              return base64ImageBytes; // Return raw base64
            }
            // Optional: Log text parts if any are received and not handled
            // else if (part.text) {
            //   console.log("Received text part:", part.text);
            // }
          }
        }
      }
    }
    // If loop completes without returning, no image data was found
    console.error("No image data found in API response stream. Last chunk content:", responseStream);
    throw new Error("Không tìm thấy dữ liệu ảnh trong phản hồi từ API. Vui lòng thử lại hoặc kiểm tra mô tả của bạn.");

  } catch (error) {
    console.error("Lỗi khi tạo ảnh bằng Gemini API:", error);
    if (error instanceof Error) {
      // More detailed error checking based on potential API responses
      const errorMessage = (error as any).message || ''; // Ensure message exists
      const errorDetails = (error as any).details || (error as any).error?.message || ''; // Look for nested error messages

      if (errorMessage.includes("API key not valid") || 
          errorMessage.includes("PERMISSION_DENIED") ||
          errorMessage.includes("API_KEY_INVALID") ||
          errorDetails.includes("API_KEY_INVALID")) {
        throw new Error(`Lỗi API: API key không hợp lệ hoặc không có quyền truy cập. Vui lòng kiểm tra lại API_KEY.`);
      }
      if (errorMessage.includes("Model not found") || 
          errorMessage.includes("does not exist") || 
          errorMessage.includes("model is not supported") ||
          errorDetails.includes("Model not found")) {
        throw new Error(`Lỗi API: Model '${IMAGE_MODEL_NAME}' không được tìm thấy hoặc không được hỗ trợ. Vui lòng kiểm tra lại.`);
      }
      if (errorMessage.toLowerCase().includes("quota") || (error as any).status === 429 || errorDetails.toLowerCase().includes("quota")) {
        throw new Error("Lỗi API: Đã vượt quá hạn ngạch sử dụng. Vui lòng thử lại sau.");
      }
      // Specific check for the modalities error to provide a clearer message if it persists
      if (errorMessage.includes("response modalities") || errorDetails.includes("response modalities")) {
         throw new Error(`Lỗi cấu hình API: Model '${IMAGE_MODEL_NAME}' không hỗ trợ cấu hình modalities hiện tại. Lỗi chi tiết: ${errorMessage || errorDetails}`);
      }
      
      throw new Error(`Lỗi API: ${errorMessage || errorDetails || "Một lỗi không xác định đã xảy ra với API."}`);
    }
    throw new Error("Đã xảy ra lỗi không xác định khi tạo ảnh.");
  }
}