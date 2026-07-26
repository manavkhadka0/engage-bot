/**
 * Minimal OpenAPI paths stub.
 * Replace by running: `pnpm api:gen` against the backend `/api-json`.
 */
export interface paths {
  "/health": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              status: string;
              service: string;
              timestamp: string;
            };
          };
        };
      };
    };
  };
}
