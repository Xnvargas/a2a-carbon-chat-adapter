'use client';

import { useState, useCallback, useMemo } from 'react';
import type { AgentConfig } from '../types';

export interface UseMultiAgentOptions {
  /** Initial agents to register */
  agents?: AgentConfig[];

  /** Default agent ID */
  defaultAgentId?: string;

  /** Called when agent changes */
  onAgentChange?: (agent: AgentConfig) => void;
}

export interface UseMultiAgentReturn {
  /** All registered agents */
  agents: AgentConfig[];

  /** Currently active agent */
  currentAgent: AgentConfig | null;

  /** Switch to a different agent */
  switchAgent: (agentId: string) => void;

  /** Register a new agent */
  registerAgent: (agent: AgentConfig) => void;

  /** Unregister an agent */
  unregisterAgent: (agentId: string) => void;

  /** Update an existing agent's config */
  updateAgent: (agentId: string, updates: Partial<AgentConfig>) => void;

  /** Get agent by ID */
  getAgent: (agentId: string) => AgentConfig | undefined;

  /** Check if agent exists */
  hasAgent: (agentId: string) => boolean;
}

/**
 * Hook for managing multiple agents without using AgentProvider
 *
 * @example
 * const { currentAgent, switchAgent, agents } = useMultiAgent({
 *   agents: [
 *     { id: 'research', name: 'Research Agent', url: '...' },
 *     { id: 'code', name: 'Code Agent', url: '...' },
 *   ],
 *   defaultAgentId: 'research'
 * });
 */
export function useMultiAgent(options: UseMultiAgentOptions = {}): UseMultiAgentReturn {
  const { agents: initialAgents = [], defaultAgentId, onAgentChange } = options;

  const [agents, setAgents] = useState<AgentConfig[]>(initialAgents);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(
    defaultAgentId ?? initialAgents[0]?.id ?? null
  );

  const currentAgent = useMemo(
    () => agents.find((a) => a.id === currentAgentId) ?? null,
    [agents, currentAgentId]
  );

  const switchAgent = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId);
      if (agent) {
        setCurrentAgentId(agentId);
        onAgentChange?.(agent);
      } else {
        console.warn(`[useMultiAgent] Agent "${agentId}" not found`);
      }
    },
    [agents, onAgentChange]
  );

  const registerAgent = useCallback((agent: AgentConfig) => {
    setAgents((prev) => {
      if (prev.some((a) => a.id === agent.id)) {
        console.warn(`[useMultiAgent] Agent "${agent.id}" already exists, updating`);
        return prev.map((a) => (a.id === agent.id ? agent : a));
      }
      return [...prev, agent];
    });
  }, []);

  const unregisterAgent = useCallback(
    (agentId: string) => {
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (currentAgentId === agentId) {
        setCurrentAgentId(agents[0]?.id ?? null);
      }
    },
    [currentAgentId, agents]
  );

  const updateAgent = useCallback((agentId: string, updates: Partial<AgentConfig>) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, ...updates, id: agentId } : a))
    );
  }, []);

  const getAgent = useCallback((agentId: string) => agents.find((a) => a.id === agentId), [agents]);

  const hasAgent = useCallback((agentId: string) => agents.some((a) => a.id === agentId), [agents]);

  return {
    agents,
    currentAgent,
    switchAgent,
    registerAgent,
    unregisterAgent,
    updateAgent,
    getAgent,
    hasAgent,
  };
}

export default useMultiAgent;
