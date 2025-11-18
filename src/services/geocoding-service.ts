interface AddressInput {
  logradouro?: string | null;
  numero?: string | null;
  cidade?: string | null;
  uf?: string | null;
}

export class GeocodingService {
  private apiKey: string;

  constructor() {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new Error("Configuração ausente: GOOGLE_MAPS_API_KEY não encontrada.");
    }
    this.apiKey = key;
  }

  /**
   * Busca coordenadas para um endereço estruturado.
   * Retorna [lat, lng] ou null se não encontrar.
   */
  async getCoordinates(input: AddressInput): Promise<[number, number] | null> {
    // 1. Validação de entrada
    if (!input.logradouro || !input.numero || !input.cidade || !input.uf) {
      throw new Error("Endereço incompleto para geocodificação.");
    }

    // 2. Montagem do endereço
    const addressParts = [
      input.numero,
      input.logradouro,
      input.cidade,
      input.uf,
      "Brasil"
    ].filter(Boolean);
    
    const addressString = addressParts.join(", ");
    
    // 3. Chamada à API Externa (Google Maps)
    const queryParams = new URLSearchParams({
      address: addressString,
      key: this.apiKey,
      language: "pt-BR"
    });

    const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?${queryParams.toString()}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      // 4. Tratamento de Resposta
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return [location.lat, location.lng];
      } 
      
      if (data.status === "ZERO_RESULTS") {
        return null; // Endereço não encontrado, mas não é erro técnico
      }

      // Erros da API do Google (Quota, Request Denied, etc)
      throw new Error(`Erro na API do Google Maps: ${data.status} - ${data.error_message || ''}`);

    } catch (error) {
      console.error("[GeocodingService] Falha na requisição:", error);
      throw error; // Repassa o erro para o controller tratar
    }
  }
}

// Singleton para uso na aplicação
export const geocodingService = new GeocodingService();