import { getApiConfig } from "../../config/appConfig";

// Re-export the configuration in the expected format for backward compatibility
export const env = getApiConfig();
