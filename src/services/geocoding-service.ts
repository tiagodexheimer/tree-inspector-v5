interface AddressInput {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
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
   * Usa uma estratégia de fallback progressivo:
   * 1. Tenta o endereço completo (logradouro + numero + bairro + cidade + uf + cep)
   * 2. Se o resultado for parcial (partial_match) e impreciso (APPROXIMATE),
   *    tenta novamente usando apenas bairro + cidade + uf + cep para obter
   *    ao menos coordenadas no nível do bairro correto.
   * Retorna [lat, lng] ou null se não encontrar.
   */
  async getCoordinates(input: AddressInput): Promise<[number, number] | null> {
    // 1. Validação de entrada
    if (!input.logradouro || !input.numero || !input.cidade || !input.uf) {
      throw new Error("Endereço incompleto para geocodificação.");
    }

    // 2. Tentativa 1: Endereço completo
    const fullAddressParts = [
      input.numero,
      input.logradouro,
      input.bairro,
      input.cidade,
      input.uf,
      input.cep,
      "Brasil"
    ].filter(Boolean);
    
    const fullAddressString = fullAddressParts.join(", ");
    const result1 = await this.geocodeAddress(fullAddressString, input.cidade!, input.uf!);

    if (result1) {
      // Se encontrou com precisão a nível de rua (ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER),
      // retorna diretamente
      if (!result1.partialMatch || result1.locationType !== "APPROXIMATE") {
        return result1.coordinates;
      }

      // 3. Tentativa 2: Se o resultado foi parcial e aproximado,
      // tenta com bairro + cidade + cep para ao menos acertar o bairro
      if (input.bairro) {
        const bairroAddressParts = [
          input.bairro,
          input.cidade,
          input.uf,
          input.cep,
          "Brasil"
        ].filter(Boolean);
        
        const bairroAddressString = bairroAddressParts.join(", ");
        const result2 = await this.geocodeAddress(bairroAddressString, input.cidade!, input.uf!);

        if (result2) {
          // Retorna o resultado do bairro (geralmente mais perto da rua real)
          return result2.coordinates;
        }
      }

      // Se não tinha bairro ou bairro também falhou, retorna o resultado parcial da tentativa 1
      return result1.coordinates;
    }

    return null;
  }

  /**
   * Executa uma chamada real ao Google Maps Geocoding API.
   */
  private async geocodeAddress(
    addressString: string,
    cidade: string,
    uf: string
  ): Promise<{ coordinates: [number, number]; partialMatch: boolean; locationType: string } | null> {
    const queryParams = new URLSearchParams({
      address: addressString,
      key: this.apiKey,
      language: "pt-BR",
    });

    // Restrição por município e estado
    queryParams.append("components", `administrative_area:${cidade}|administrative_area:${uf}|country:BR`);

    const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?${queryParams.toString()}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const firstResult = data.results[0];
        const location = firstResult.geometry.location;
        return {
          coordinates: [location.lat, location.lng],
          partialMatch: !!firstResult.partial_match,
          locationType: firstResult.geometry.location_type || "UNKNOWN"
        };
      } 
      
      if (data.status === "ZERO_RESULTS") {
        return null;
      }

      throw new Error(`Erro na API do Google Maps: ${data.status} - ${data.error_message || ''}`);

    } catch (error) {
      console.error("[GeocodingService] Falha na requisição:", error);
      throw error;
    }
  }
}

// Singleton para uso na aplicação
export const geocodingService = new GeocodingService();