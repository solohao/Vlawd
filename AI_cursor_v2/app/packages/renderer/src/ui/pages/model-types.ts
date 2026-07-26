/**
 * 模型类型定义
 * 用于ConfigViewNew和LibraryViewNew之间共享的类型
 */

export interface LLMModel {
  id: string;
  name: string;
  size: string;
  description?: string;
  backend: 'ollama' | 'lmstudio' | 'custom' | 'remote';
}

export interface STTModel {
  id: string;
  name: string;
  size: string;
  description?: string;
  language?: string;
}

export interface TTSModel {
  id: string;
  name: string;
  size: string;
  description?: string;
  voice?: string;
  language?: string;
}

export interface CustomEndpoint {
  id: string;
  name: string;
  url: string;
  model: string;
  apiKey?: string;
  protocol?: 'openai' | 'anthropic';
  type: 'openai-compatible' | 'custom';
  enabled: boolean;
}
