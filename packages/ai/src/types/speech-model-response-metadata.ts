export type SpeechModelResponseMetadata = {
  /**
Timestamp for the start of the generated response.
   */
  timestamp: Date;

  /**
The ID of the response model that was used to generate the response.
   */
  modelId: string;

  /**
Response headers.
   */
  headers?: Record<string, string>;

  /**
Response body.
   */
  body?: unknown;
};
