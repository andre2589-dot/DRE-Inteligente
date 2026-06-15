/**
 * Helper to parse responses safely and avoid 'Unexpected token T...' or similar errors
 * when the server is starting, sleeping, or returning fallback page HTML.
 */
export async function safeFetchJson<T = any>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return await res.json() as T;
    } catch (e) {
      throw new Error("Erro de formatação: A resposta recebida do servidor não é um JSON válido.");
    }
  }
  const text = await res.text();
  if (text.includes("The page") || text.includes("<html") || text.includes("<!DOCTYPE") || text.includes("Vite")) {
    throw new Error("O servidor está indisponível ou reiniciando no momento. Por favor, aguarde alguns segundos e tente novamente.");
  }
  throw new Error(text || `Erro de servidor (Código HTTP ${res.status}).`);
}
