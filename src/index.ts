/**
 * @kuntur/a2a-carbon-chat-adapter
 *
 * A2A protocol adapter for Carbon AI Chat
 *
 * @example
 * import { A2AChat, AgentProvider } from '@kuntur/a2a-carbon-chat-adapter';
 *
 * <AgentProvider agents={[...]}>
 *   <A2AChat agentId="my-agent" />
 * </AgentProvider>
 */

// =============================================================================
// COMPONENTS
// =============================================================================

export { A2AChat } from './components/A2AChat';
export { AgentProvider, useAgentContext, useAgentContextOptional } from './components/AgentProvider';
export { AgentSwitcher } from './components/AgentSwitcher';
export type { AgentSwitcherProps } from './components/AgentSwitcher';

// Renderers
export { CitationRenderer } from './components/renderers/CitationRenderer';
export { ErrorRenderer } from './components/renderers/ErrorRenderer';
export { FormRenderer } from './components/renderers/FormRenderer';
export { processCitations, segmentTextWithCitations, getUniqueCitations } from './components/renderers/citation-utils';

// =============================================================================
// HOOKS
// =============================================================================

export { useA2AAgent } from './hooks/useA2AAgent';
export type { UseA2AAgentOptions, UseA2AAgentReturn } from './hooks/useA2AAgent';

export { useMultiAgent } from './hooks/useMultiAgent';
export type { UseMultiAgentOptions, UseMultiAgentReturn } from './hooks/useMultiAgent';

// =============================================================================
// LIBRARY UTILITIES
// =============================================================================

// A2A Client
export { A2AClient } from './lib/a2a/client';
export { EXTENSION_URIS } from './lib/a2a/extension-uris';
export {
  parseUIExtensions,
  extractCitations,
  extractTrajectory,
  extractError,
  extractFormRequest,
} from './lib/a2a/ui-extension-parser';

export {
  handleAgentCard,
  extractDemandsFromAgentCard,
  buildFulfillments,
  resolveMetadata,
} from './lib/a2a/extension-handler';

// Translator
export {
  A2AToCarbonTranslator,
  createTranslator,
  isFinalResponse,
  isPartialItem,
  isCompleteItem,
  MessageResponseTypes,
  ChainOfThoughtStepStatus,
  ReasoningStepOpenState,
  UserType,
} from './lib/translator/a2a-to-carbon';

// =============================================================================
// TYPES
// =============================================================================

// Agent types
export type {
  AgentConfig,
  AgentRegistry,
  AgentState,
  AgentConnectionState,
  A2AExtensionConfig,
} from './types/agent';

// Chat types
export type { ChatLayout, A2AChatProps } from './types/chat';

// Provider types
export type { AgentProviderProps, AgentContextValue } from './types/provider';

// Extension types (from lib)
export type {
  Citation,
  CitationMetadata,
  TrajectoryMetadata,
  ErrorMetadata,
  FormRequestMetadata,
  FormField,
  ParsedUIExtensions,
  CanvasEditMetadata,
  AgentDetailMetadata,
} from './lib/a2a/ui-extension-parser';

export type { ExtensionUri } from './lib/a2a/extension-uris';

export type { PlatformConfig } from './lib/a2a/extension-handler';

// Renderer types
export type {
  CitationRendererProps,
  ErrorRendererProps,
  FormRendererProps,
  ProcessedCitation,
  TextSegment,
} from './components/renderers/types';

// Additional type exports from lib
export type {
  AgentCard,
  A2AClientConfig,
  StreamChunk,
  A2AMessage,
  A2AMessagePart,
  A2AError,
} from './lib/a2a/client';

export type {
  ResponseUserProfile,
  ReasoningStep,
  ChainOfThoughtStep,
  CarbonStreamChunk,
  CarbonMessage,
  LegacyCarbonMessage,
  MessageResponseOptions,
  PartialItemChunk,
  CompleteItemChunk,
  FinalResponseChunk,
  TextItem,
  UserDefinedItem,
  GenericItem,
  ItemStreamingMetadata,
  A2APartWithMetadata,
  ToolCallData,
  ToolResultData,
  MessageResponseType,
} from './lib/translator/a2a-to-carbon';
