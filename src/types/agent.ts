/**
 * Agent Configuration Types
 */

/**
 * A2A Extension configuration passed to agents
 */
export interface A2AExtensionConfig {
  settings?: {
    thinking_group?: {
      thinking?: boolean;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Agent Configuration
 *
 * Defines how to connect to an A2A agent.
 */
export interface AgentConfig {
  /** Unique identifier for this agent configuration */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** Agent's A2A endpoint URL (without /jsonrpc suffix) */
  url: string;

  /** Optional API key for authentication */
  apiKey?: string;

  /** Optional description for agent switcher UI */
  description?: string;

  /** Optional icon URL for agent avatar */
  iconUrl?: string;

  /** Optional A2A extension configuration */
  extensions?: A2AExtensionConfig;

  /** Optional metadata for application-specific use */
  metadata?: Record<string, unknown>;
}

/**
 * Multi-agent registry for applications with multiple agents
 */
export interface AgentRegistry {
  /** Map of agent ID to configuration */
  agents: Record<string, AgentConfig>;

  /** Default agent ID to use when none specified */
  defaultAgentId?: string;
}

/**
 * Agent connection state
 */
export type AgentConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'streaming';

/**
 * Agent state including connection and conversation
 */
export interface AgentState {
  connectionState: AgentConnectionState;
  error?: Error;
  taskId?: string;
  contextId?: string;
}
