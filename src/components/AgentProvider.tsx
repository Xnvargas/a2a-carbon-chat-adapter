'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import type { AgentConfig, AgentProviderProps, AgentContextValue } from '../types';

const AgentContext = createContext<AgentContextValue | null>(null);

/**
 * Hook to access agent context
 * Must be used within an AgentProvider
 */
export function useAgentContext(): AgentContextValue {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if not within provider
 * Useful for components that work both with and without provider
 */
export function useAgentContextOptional(): AgentContextValue | null {
  return useContext(AgentContext);
}

/**
 * Provider for managing agent configurations
 *
 * @example
 * // Single agent
 * <AgentProvider agent={{ id: 'main', name: 'Assistant', url: '...' }}>
 *   <App />
 * </AgentProvider>
 *
 * @example
 * // Multiple agents
 * <AgentProvider
 *   agents={[
 *     { id: 'research', name: 'Research', url: '...' },
 *     { id: 'code', name: 'Coder', url: '...' },
 *   ]}
 *   defaultAgentId="research"
 *   persistSelection
 * >
 *   <App />
 * </AgentProvider>
 */
export function AgentProvider({
  children,
  agent,
  agents: agentsProp,
  registry,
  defaultAgentId,
  persistSelection = false,
  storageKey = 'a2a-chat-selected-agent',
}: AgentProviderProps): ReactNode {
  // Build agents list from various input formats
  const agents = useMemo(() => {
    if (registry) {
      return Object.values(registry.agents);
    }
    if (agentsProp) {
      return agentsProp;
    }
    if (agent) {
      return [agent];
    }
    return [];
  }, [agent, agentsProp, registry]);

  // Determine initial agent
  const getInitialAgentId = (): string | null => {
    // Check persisted selection
    if (persistSelection && typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      if (saved && agents.some((a) => a.id === saved)) {
        return saved;
      }
    }

    // Use default
    if (defaultAgentId && agents.some((a) => a.id === defaultAgentId)) {
      return defaultAgentId;
    }

    if (registry?.defaultAgentId && agents.some((a) => a.id === registry.defaultAgentId)) {
      return registry.defaultAgentId;
    }

    // Fall back to first agent
    return agents[0]?.id ?? null;
  };

  const [currentAgentId, setCurrentAgentId] = useState<string | null>(getInitialAgentId);

  // Persist selection
  useEffect(() => {
    if (persistSelection && currentAgentId && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, currentAgentId);
    }
  }, [currentAgentId, persistSelection, storageKey]);

  const currentAgent = useMemo(
    () => agents.find((a) => a.id === currentAgentId) ?? null,
    [agents, currentAgentId]
  );

  const selectAgent = useCallback(
    (agentId: string) => {
      if (agents.some((a) => a.id === agentId)) {
        setCurrentAgentId(agentId);
      } else {
        console.warn(`[AgentProvider] Agent "${agentId}" not found in registry`);
      }
    },
    [agents]
  );

  const getAgent = useCallback((agentId: string) => agents.find((a) => a.id === agentId), [agents]);

  const hasAgent = useCallback((agentId: string) => agents.some((a) => a.id === agentId), [agents]);

  const value: AgentContextValue = useMemo(
    () => ({
      currentAgent,
      agents,
      selectAgent,
      getAgent,
      hasAgent,
    }),
    [currentAgent, agents, selectAgent, getAgent, hasAgent]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export default AgentProvider;
