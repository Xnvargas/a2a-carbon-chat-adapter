/**
 * Chat Component Types
 */

import type { ReactNode } from 'react';
import type { AgentConfig, AgentConnectionState, A2AExtensionConfig } from './agent';
import type { Citation, ErrorMetadata, FormRequestMetadata } from '../lib/a2a';

/**
 * Layout modes for the chat interface
 */
export type ChatLayout = 'fullscreen' | 'sidebar' | 'float';

/**
 * Props for the main A2AChat component
 */
export interface A2AChatProps {
  // ===========================================================================
  // AGENT CONFIGURATION (pick one approach)
  // ===========================================================================

  /**
   * Full agent configuration object
   * Use this for complete control over agent settings
   */
  agent?: AgentConfig;

  /**
   * Agent ID to look up from AgentProvider context
   * Use this when agents are registered in a parent AgentProvider
   */
  agentId?: string;

  /**
   * Simple URL-only configuration
   * Use this for quick single-agent setups
   */
  agentUrl?: string;

  /**
   * API key (used with agentUrl)
   */
  apiKey?: string;

  // ===========================================================================
  // DISPLAY OPTIONS
  // ===========================================================================

  /**
   * Embedded mode - use when A2AChat is inside a parent-controlled container
   *
   * Supported layouts: 'sidebar', 'fullscreen' (ignored for 'float')
   *
   * When true:
   * - Parent controls OPENING (via mount/unmount or conditional rendering)
   * - Carbon's minimize button controls CLOSING (triggers onClose callback)
   * - No external launcher shown (parent provides open mechanism)
   * - Uses relative positioning (fills parent container)
   * - No internal view state management
   *
   * Flow: Parent renders → chat visible → user clicks minimize → onClose fires → parent unmounts
   *
   * @default false
   */
  embedded?: boolean;

  /**
   * Layout mode
   * @default 'fullscreen'
   */
  layout?: ChatLayout;

  /**
   * Allow user to switch layouts
   * @default false
   */
  allowLayoutSwitch?: boolean;

  /**
   * Initial open state (for sidebar/float layouts)
   * @default true for fullscreen, false for others
   */
  defaultOpen?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Override agent display name
   */
  agentName?: string;

  /**
   * Override agent icon
   */
  agentIconUrl?: string;

  // ===========================================================================
  // BEHAVIOR OPTIONS
  // ===========================================================================

  /**
   * Show thinking/reasoning accordion
   * @default true
   */
  showThinking?: boolean;

  /**
   * Show chain of thought steps
   * @default true
   */
  showChainOfThought?: boolean;

  /**
   * Enable streaming cancellation
   * @default true
   */
  allowCancel?: boolean;

  /**
   * A2A extension configuration to send with messages
   */
  extensions?: A2AExtensionConfig;

  // ===========================================================================
  // CALLBACKS
  // ===========================================================================

  /**
   * Called when chat is opened
   */
  onOpen?: () => void;

  /**
   * Called when chat is closed (sidebar/float only)
   */
  onClose?: () => void;

  /**
   * Called when user sends a message
   */
  onSend?: (message: string) => void;

  /**
   * Called when agent responds
   */
  onResponse?: (response: unknown) => void;

  /**
   * Called on connection state change
   */
  onConnectionChange?: (state: AgentConnectionState) => void;

  /**
   * Called on error
   */
  onError?: (error: Error) => void;

  /**
   * Called when user wants to disconnect/switch agents
   */
  onDisconnect?: () => void;

  // ===========================================================================
  // CUSTOM RENDERERS
  // ===========================================================================

  /**
   * Custom renderer for citations
   */
  renderCitations?: (citations: Citation[], text: string) => ReactNode;

  /**
   * Custom renderer for errors
   */
  renderError?: (error: ErrorMetadata) => ReactNode;

  /**
   * Custom renderer for forms
   */
  renderForm?: (
    form: FormRequestMetadata,
    onSubmit: (values: Record<string, unknown>) => void
  ) => ReactNode;

  /**
   * Custom renderer for user-defined response types
   */
  renderUserDefined?: (data: unknown, messageItem: unknown) => ReactNode;
}

// =============================================================================
// CARBON VIEW STATE TYPES
// =============================================================================

/**
 * Carbon AI Chat view state structure
 */
export interface CarbonViewState {
  mainWindow: boolean;
  launcher?: boolean;
  [key: string]: unknown;
}

/**
 * Carbon AI Chat view change event
 */
export interface ViewChangeEvent {
  newViewState: CarbonViewState;
  oldViewState?: CarbonViewState;
}
