
import type { Handler, HandlerEvent } from "@netlify/functions";
import crypto from 'crypto';

// Helper to generate SHA-1 signature as Cloudinary expects
const generateSha1Signature = (paramsToSign: Record<string, string | number>, apiSecret: string): string => {
  const sortedKeys = Object.keys(paramsToSign).sort();
  let stringToSign = sortedKeys
    .map(key => `${key}=${paramsToSign[key]}`)
    .join('&');
  stringToSign += apiSecret;

  return crypto.createHash('sha1').update(stringToSign).digest('hex');
};

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
       headers: { "Content-Type": "application/json" },
    };
  }

  const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("Cloudinary API Key or Secret is not set in Netlify environment variables.");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Cloudinary server configuration error." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const paramsToSign = body.paramsToSign as Record<string, string | number> | undefined;

    if (!paramsToSign || typeof paramsToSign !== 'object' || typeof paramsToSign.timestamp === 'undefined') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid parameters: 'paramsToSign' object with at least 'timestamp' is required." }),
        headers: { "Content-Type": "application/json" },
      };
    }
    
    // Ensure all values in paramsToSign are strings or numbers for consistent signing
    for (const key in paramsToSign) {
        if (typeof paramsToSign[key] !== 'string' && typeof paramsToSign[key] !== 'number') {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: `Invalid type for parameter '${key}'. Must be string or number.` }),
                headers: { "Content-Type": "application/json" },
            };
        }
    }

    const signature = generateSha1Signature(paramsToSign, CLOUDINARY_API_SECRET);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signature: signature,
        timestamp: paramsToSign.timestamp, 
        apiKey: CLOUDINARY_API_KEY, 
      }),
    };
  } catch (error) {
    console.error("Error generating Cloudinary signature:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during signature generation.";
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to generate signature.", error: errorMessage }),
      headers: { "Content-Type": "application/json" },
    };
  }
};

export { handler };
