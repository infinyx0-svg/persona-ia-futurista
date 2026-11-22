export interface CharacterConfig {
  nombre: string;
  edad: number;
  genero: 'chica' | 'chico';
}

export interface MemoryItem {
  kind: 'dato_personal' | 'evento' | 'preferencia';
  content: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface LLMRequest {
  character: CharacterConfig;
  isNew: boolean;
  history: ChatMessage[];
  memories: MemoryItem[];
  userMessage: string;
}

export interface LLMResponse {
  reply: string;
  new_memories?: MemoryItem[];
}
