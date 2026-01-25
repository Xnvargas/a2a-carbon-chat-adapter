'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AgentConfig, AgentState, AgentConnectionState } from '../types';
import { useAgentContextOptional } from '../components/AgentProvider';
import { A2AToCarbonTranslator, createTranslator } from '../lib/translator';

export interface UseA2AAgentOptions {
  /** Agent configuration (or use agentId with AgentProvider) */
  agent?: AgentConfig;

  /** Agent ID to look up from context */
  agentId?: string;

  /** Auto-connect on mount */
  autoConnect?: boolean;

  /** Callbacks */
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: any) => void;
}

export interface UseA2AAgentReturn {
  /** Current agent configuration */
  agent: AgentConfig | null;

  /** Connection state */
  state: AgentState;

  /** Send a message to the agent */
  sendMessage: (message: string) => Promise<any>;

  /** Cancel current streaming response */
  cancelStream: () => void;

  /** Disconnect from agent */
  disconnect: () => void;

  /** Reconnect to agent */
  reconnect: () => void;

  /** Clear conversation history */
  clearHistory: () => void;

  /** Whether currently streaming */
  isStreaming: boolean;

  /** Whether connected */
  isConnected: boolean;

  /** Last error */
  error: Error | null;
}

/**
 * Hook for interacting with an A2A agent programmatically
 *
 * @example
 * // With direct config
 * const { sendMessage, isStreaming } = useA2AAgent({
 *   agent: { id: 'my-agent', name: 'My Agent', url: 'https://...' }
 * });
 *
 * @example
 * // With context provider
 * const { sendMessage } = useA2AAgent({ agentId: 'research-agent' });
 */
export function useA2AAgent(options: UseA2AAgentOptions = {}): UseA2AAgentReturn {
  const { agent: agentProp, agentId, autoConnect = false, onConnect, onDisconnect, onError, onMessage } = options;

  const agentContext = useAgentContextOptional();

  // Resolve agent config
  const agent = agentProp ?? (agentId ? agentContext?.getAgent(agentId) : agentContext?.currentAgent) ?? null;

  // State
  const [connectionState, setConnectionState] = useState<AgentConnectionState>('disconnected');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [taskId, setTaskId] = useState<string | undefined>();
  const [contextId, setContextId] = useState<string | undefined>();

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const translatorRef = useRef<A2AToCarbonTranslator | null>(null);
  const historyRef = useRef<any[]>([]);

  // Send message
  const sendMessage = useCallback(
    async (message: string) => {
      if (!agent) {
        const err = new Error('No agent configured');
        setError(err);
        onError?.(err);
        throw err;
      }

      setIsStreaming(true);
      setConnectionState('streaming');
      setError(null);

      translatorRef.current = createTranslator(agent.name, agent.iconUrl);
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentUrl: agent.url,
            apiKey: agent.apiKey,
            message,
            extensions: agent.extensions,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let result: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim().startsWith('data: ')) {
              const dataStr = line.trim().slice(6);
              if (!dataStr || dataStr === '[DONE]') continue;

              try {
                const data = JSON.parse(dataStr);
                if (data.result) {
                  result = data.result;
                  setTaskId(data.result.taskId);
                  setContextId(data.result.contextId);
                  onMessage?.(data.result);
                }
              } catch (e) {
                // Skip parse errors
              }
            }
          }
        }

        setConnectionState('connected');
        onConnect?.();
        return result;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err as Error);
          setConnectionState('error');
          onError?.(err as Error);
        }
        throw err;
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [agent, onConnect, onError, onMessage]
  );

  // Cancel stream
  const cancelStream = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setConnectionState('connected');
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    cancelStream();
    setConnectionState('disconnected');
    setTaskId(undefined);
    setContextId(undefined);
    onDisconnect?.();
  }, [cancelStream, onDisconnect]);

  // Reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setConnectionState('connecting');
    // The next sendMessage will establish connection
    setConnectionState('connected');
  }, [disconnect]);

  // Clear history
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setTaskId(undefined);
    setContextId(undefined);
  }, []);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && agent && connectionState === 'disconnected') {
      setConnectionState('connected');
      onConnect?.();
    }
  }, [autoConnect, agent, connectionState, onConnect]);

  return {
    agent,
    state: {
      connectionState,
      error: error ?? undefined,
      taskId,
      contextId,
    },
    sendMessage,
    cancelStream,
    disconnect,
    reconnect,
    clearHistory,
    isStreaming,
    isConnected: connectionState === 'connected' || connectionState === 'streaming',
    error,
  };
}

export default useA2AAgent;
