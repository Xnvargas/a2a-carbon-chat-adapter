/**
 * Type exports
 */

// Agent types
export type {
  AgentConfig,
  AgentRegistry,
  AgentState,
  AgentConnectionState,
  A2AExtensionConfig,
} from './agent';

// Chat types
export type { ChatLayout, A2AChatProps } from './chat';

// Provider types
export type { AgentProviderProps, AgentContextValue } from './provider';

// Re-export extension types from lib
export type {
  Citation,
  CitationMetadata,
  TrajectoryMetadata,
  ErrorMetadata,
  FormRequestMetadata,
  FormField,
  ParsedUIExtensions,
} from '../lib/a2a';

// Re-export renderer types
export type {
  CitationRendererProps,
  ErrorRendererProps,
  FormRendererProps,
  ProcessedCitation,
  TextSegment,
} from '../components/renderers';
