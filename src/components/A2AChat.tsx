'use client';

import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import type {
  A2AChatProps,
  AgentConfig,
  AgentConnectionState,
} from '../types';
import type { Citation, ErrorMetadata, FormRequestMetadata } from '../lib/a2a';
import { useAgentContextOptional } from './AgentProvider';
import { A2AToCarbonTranslator, createTranslator } from '../lib/translator';
import { CitationRenderer } from './renderers/CitationRenderer';
import { ErrorRenderer } from './renderers/ErrorRenderer';
import { FormRenderer } from './renderers/FormRenderer';

// =============================================================================
// HELPER UTILITIES
// =============================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Main A2A Chat component
 *
 * Connects to A2A agents and renders chat UI using Carbon AI Chat components.
 *
 * @example
 * // Direct agent config
 * <A2AChat
 *   agent={{ id: 'my-agent', name: 'My Agent', url: 'https://...' }}
 *   layout="sidebar"
 * />
 *
 * @example
 * // Using AgentProvider context
 * <AgentProvider agents={[...]}>
 *   <A2AChat agentId="research" />
 * </AgentProvider>
 *
 * @example
 * // Simple URL-only
 * <A2AChat agentUrl="https://my-agent.example.com" layout="fullscreen" />
 */
export function A2AChat({
  // Agent configuration
  agent: agentProp,
  agentId,
  agentUrl,
  apiKey,

  // Display options
  layout = 'fullscreen',
  allowLayoutSwitch = false,
  defaultOpen = true,
  className = '',
  agentName,
  agentIconUrl,

  // Behavior options
  showThinking = true,
  showChainOfThought = true,
  allowCancel = true,
  extensions,

  // Callbacks
  onOpen,
  onClose,
  onSend,
  onResponse,
  onConnectionChange,
  onError,
  onDisconnect,

  // Custom renderers
  renderCitations,
  renderError,
  renderForm,
  renderUserDefined,
}: A2AChatProps) {
  // ---------------------------------------------------------------------------
  // RESOLVE AGENT CONFIG
  // ---------------------------------------------------------------------------

  const agentContext = useAgentContextOptional();

  const agent = useMemo((): AgentConfig | null => {
    // Priority: direct prop > context lookup > URL-only
    if (agentProp) {
      return agentProp;
    }

    if (agentId && agentContext) {
      return agentContext.getAgent(agentId) ?? null;
    }

    if (!agentProp && !agentId && agentContext?.currentAgent) {
      return agentContext.currentAgent;
    }

    if (agentUrl) {
      return {
        id: 'default',
        name: agentName ?? 'AI Assistant',
        url: agentUrl,
        apiKey,
        iconUrl: agentIconUrl,
      };
    }

    return null;
  }, [agentProp, agentId, agentUrl, apiKey, agentName, agentIconUrl, agentContext]);

  // ---------------------------------------------------------------------------
  // STATE
  // ---------------------------------------------------------------------------

  const [connectionState, setConnectionState] = useState<AgentConnectionState>('disconnected');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentFormRequest, setCurrentFormRequest] = useState<FormRequestMetadata | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [carbonLoaded, setCarbonLoaded] = useState(false);
  const [CarbonComponents, setCarbonComponents] = useState<{
    ChatCustomElement?: React.ComponentType<any>;
    ChatContainer?: React.ComponentType<any>;
  }>({});

  const instanceRef = useRef<any>(null);
  const translatorRef = useRef<A2AToCarbonTranslator | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // LOAD CARBON COMPONENTS
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@carbon/ai-chat')
        .then((mod) => {
          setCarbonComponents({
            ChatCustomElement: mod.ChatCustomElement,
            ChatContainer: mod.ChatContainer,
          });
          setCarbonLoaded(true);
        })
        .catch((err) => {
          console.error('[A2AChat] Failed to load @carbon/ai-chat:', err);
        });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // UPDATE CONNECTION STATE
  // ---------------------------------------------------------------------------

  useEffect(() => {
    onConnectionChange?.(connectionState);
  }, [connectionState, onConnectionChange]);

  // ---------------------------------------------------------------------------
  // MESSAGE HANDLER
  // ---------------------------------------------------------------------------

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!agent) {
        console.error('[A2AChat] No agent configured');
        return;
      }

      const instance = instanceRef.current;
      if (!instance) {
        console.error('[A2AChat] Chat instance not ready');
        return;
      }

      onSend?.(message);
      setIsStreaming(true);
      setConnectionState('streaming');

      // Create translator for this response
      translatorRef.current = createTranslator(
        agent.name,
        agent.iconUrl ?? '/bot.svg'
      );

      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentUrl: agent.url,
            apiKey: agent.apiKey,
            message,
            extensions: extensions ?? agent.extensions,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        // Process SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const dataStr = trimmedLine.slice(6);
              if (!dataStr || dataStr === '[DONE]') continue;

              try {
                const data = JSON.parse(dataStr);
                if (data.result) {
                  const carbonChunks = translatorRef.current?.translateStreamChunk(data.result) ?? [];
                  for (const chunk of carbonChunks) {
                    await instance.messaging.addMessageChunk(chunk);
                  }

                  // Check for form requests
                  if (data.result.status?.state === 'input-required') {
                    const formRequest = extractFormRequest(data.result);
                    if (formRequest) {
                      setCurrentFormRequest(formRequest);
                      setPendingTaskId(data.result.taskId);
                    }
                  }
                }
              } catch (e) {
                console.warn('[A2AChat] Failed to parse SSE data:', e);
              }
            }
          }
        }

        setConnectionState('connected');
        onResponse?.(translatorRef.current?.getState?.() ?? {});
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.log('[A2AChat] Request cancelled');
        } else {
          console.error('[A2AChat] Error:', error);
          setConnectionState('error');
          onError?.(error as Error);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [agent, extensions, onSend, onResponse, onError]
  );

  // ---------------------------------------------------------------------------
  // CANCEL HANDLER
  // ---------------------------------------------------------------------------

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setConnectionState('connected');
  }, []);

  // ---------------------------------------------------------------------------
  // CUSTOM RESPONSE RENDERER
  // ---------------------------------------------------------------------------

  const renderCustomResponse = useCallback(
    (state: any, _instance: any) => {
      const messageItem = state.messageItem;
      const userDefined = messageItem?.user_defined;

      if (!userDefined) return null;

      // Custom renderer provided by consumer
      if (renderUserDefined) {
        return renderUserDefined(userDefined, messageItem);
      }

      // Text with citations
      if (userDefined.type === 'text_with_citations') {
        if (renderCitations) {
          return renderCitations(userDefined.citations || [], userDefined.text);
        }
        return (
          <CitationRenderer text={userDefined.text} citations={userDefined.citations || []} />
        );
      }

      // Sources list
      if (userDefined.type === 'sources_list' && userDefined.citations) {
        const citations = userDefined.citations as Citation[];
        if (citations.length === 0) return null;

        const uniqueCitations = citations.filter(
          (c, i, arr) => c.url && arr.findIndex((x) => x.url === c.url) === i
        );

        return (
          <div className="a2a-sources-list">
            <h4 className="a2a-sources-list__title">Sources</h4>
            <ol className="a2a-sources-list__items">
              {uniqueCitations.map((citation, idx) => (
                <li key={idx} className="a2a-sources-list__item">
                  <a href={citation.url ?? '#'} target="_blank" rel="noopener noreferrer">
                    {citation.title || citation.url}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        );
      }

      // Error
      if (userDefined.type === 'error' && userDefined.error) {
        if (renderError) {
          return renderError(userDefined.error as ErrorMetadata);
        }
        return <ErrorRenderer error={userDefined.error as ErrorMetadata} />;
      }

      return null;
    },
    [renderCitations, renderError, renderUserDefined]
  );

  // ---------------------------------------------------------------------------
  // FORM HANDLERS
  // ---------------------------------------------------------------------------

  const handleFormSubmit = useCallback(
    async (values: Record<string, unknown>) => {
      if (!pendingTaskId) return;

      setCurrentFormRequest(null);
      const taskId = pendingTaskId;
      setPendingTaskId(null);

      const formResponseMessage = JSON.stringify({
        type: 'form_response',
        taskId,
        values,
      });

      await handleSendMessage(formResponseMessage);
    },
    [pendingTaskId, handleSendMessage]
  );

  const handleFormCancel = useCallback(() => {
    setCurrentFormRequest(null);
    setPendingTaskId(null);
  }, []);

  // ---------------------------------------------------------------------------
  // AFTER RENDER HANDLER
  // ---------------------------------------------------------------------------

  const handleAfterRender = useCallback((instance: any) => {
    instanceRef.current = instance;
    console.log('[A2AChat] Chat instance ready');
  }, []);

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  if (!agent) {
    return (
      <div className={`a2a-chat a2a-chat--error ${className}`}>
        <p>No agent configured. Provide `agent`, `agentId`, or `agentUrl` prop.</p>
      </div>
    );
  }

  if (!carbonLoaded) {
    return (
      <div className={`a2a-chat a2a-chat--loading ${className}`}>
        <div className="a2a-chat__spinner" />
      </div>
    );
  }

  const { ChatCustomElement, ChatContainer } = CarbonComponents;

  // Form overlay
  const formOverlay = currentFormRequest && (
    <div className="a2a-chat__form-overlay">
      {renderForm ? (
        renderForm(currentFormRequest, handleFormSubmit)
      ) : (
        <FormRenderer
          form={currentFormRequest}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
    </div>
  );

  // Render based on layout
  if (layout === 'float' && ChatContainer) {
    return (
      <div className={`a2a-chat a2a-chat--float ${className}`}>
        <ChatContainer
          {...({
            debug: false,
            aiEnabled: true,
          } as any)}
          header={{
            title: agent?.name ?? 'AI Assistant',
          }}
          launcher={{
            isOn: true,
          }}
          onAfterRender={handleAfterRender}
          renderUserDefinedResponse={renderCustomResponse}
          messaging={{
            skipWelcome: true,
            customSendMessage: async (
              request: any,
              _options: any,
              _instance: any
            ) => {
              const text = request?.input?.text;
              if (text) {
                await handleSendMessage(text);
              }
            },
          } as any}
        />
        {formOverlay}
      </div>
    );
  }

  if (ChatCustomElement) {
    return (
      <div
        className={`a2a-chat a2a-chat--${layout} ${className}`}
        style={{
          height: layout === 'fullscreen' ? '100vh' : undefined,
          width: layout === 'sidebar' ? '400px' : undefined,
        }}
      >
        <ChatCustomElement
          {...({
            className: 'a2a-chat__element',
            debug: false,
            aiEnabled: true,
            openChatByDefault: true,
          } as any)}
          header={{
            title: agent?.name ?? 'AI Assistant',
            showMinimize: layout !== 'fullscreen',
          }}
          launcher={{
            isOn: layout === 'float',
          }}
          layout={{
            showFrame: layout === 'float',
            showCloseAndRestartButton: layout !== 'fullscreen',
          }}
          onAfterRender={handleAfterRender}
          renderUserDefinedResponse={renderCustomResponse}
          messaging={{
            skipWelcome: true,
            messageLoadingIndicatorTimeoutSecs: 0,
            customSendMessage: async (
              request: any,
              _options: any,
              _instance: any
            ) => {
              const text = request?.input?.text;
              if (text) {
                await handleSendMessage(text);
              }
            },
          } as any}
        />
        {formOverlay}
      </div>
    );
  }

  return (
    <div className={`a2a-chat a2a-chat--loading ${className}`}>
      <div className="a2a-chat__spinner" />
    </div>
  );
}

// Helper to extract form request from chunk
function extractFormRequest(chunk: any): FormRequestMetadata | null {
  const metadata = chunk.status?.message?.metadata;
  if (!metadata) return null;

  const formData = metadata['https://a2a-extensions.agentstack.beeai.dev/ui/form-request/v1'];
  if (!formData) return null;

  return formData as FormRequestMetadata;
}

export default A2AChat;
