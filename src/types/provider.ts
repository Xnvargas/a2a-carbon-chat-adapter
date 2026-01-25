/**
 * Provider Types
 */

import type { ReactNode } from 'react';
import type { AgentConfig, AgentRegistry } from './agent';

/**
 * Props for AgentProvider component
 */
export interface AgentProviderProps {
  children: ReactNode;

  /**
   * Single agent configuration
   * Use for simple single-agent apps
   */
  agent?: AgentConfig;

  /**
   * Multiple agent configurations
   * Use for apps with multiple agents
   */
  agents?: AgentConfig[];

  /**
   * Full registry with default selection
   * Use for complex multi-agent scenarios
   */
  registry?: AgentRegistry;

  /**
   * Default agent ID when multiple agents provided
   */
  defaultAgentId?: string;

  /**
   * Persist selected agent to localStorage
   * @default false
   */
  persistSelection?: boolean;

  /**
   * Storage key for persisted selection
   * @default 'a2a-chat-selected-agent'
   */
  storageKey?: string;
}

/**
 * Context value provided by AgentProvider
 */
export interface AgentContextValue {
  /** Currently selected agent config */
  currentAgent: AgentConfig | null;

  /** All available agents */
  agents: AgentConfig[];

  /** Select a different agent by ID */
  selectAgent: (agentId: string) => void;

  /** Get agent config by ID */
  getAgent: (agentId: string) => AgentConfig | undefined;

  /** Check if an agent ID exists */
  hasAgent: (agentId: string) => boolean;
}
