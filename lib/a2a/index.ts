/**
 * A2A Client Library
 *
 * Exports the A2A client and utility functions for working with
 * A2A protocol messages and metadata.
 */

// Re-export everything from client
export {
  A2AClient,
  type AgentCard,
  type A2AExtensionConfig,
  type A2AClientConfig,
  type A2AError,
  type A2AMessagePart,
  type A2AMessage,
  type StreamChunk,
} from './client'

// AgentStack extension URIs for citation extraction
const AGENTSTACK_EXTENSION_URIS = {
  CITATION: 'https://a2a-extensions.agentstack.beeai.dev/ui/citation/v1',
} as const

/**
 * Citation type from AgentStack citation extension
 */
export interface Citation {
  title?: string
  url?: string
  snippet?: string
  source?: string
  relevance?: number
}

/**
 * Extract citations from A2A artifact or message metadata
 *
 * AgentStack uses URI-keyed metadata for extensions.
 * Reference: https://github.com/i-am-bee/agentstack/tree/main/apps/agentstack-sdk-py
 *
 * @param metadata - The metadata object from an artifact or message
 * @returns Array of citations, empty if none found
 */
export function extractCitations(metadata: Record<string, unknown> | undefined): Citation[] {
  if (!metadata) return []

  // Check for AgentStack citation extension URI
  const citationData = metadata[AGENTSTACK_EXTENSION_URIS.CITATION]

  if (!citationData) return []

  // Citations can be a single object or an array
  if (Array.isArray(citationData)) {
    return citationData.filter(
      (item): item is Citation =>
        typeof item === 'object' && item !== null
    )
  }

  if (typeof citationData === 'object' && citationData !== null) {
    // Check if it's a wrapper object with a citations array
    const wrapper = citationData as Record<string, unknown>
    if (Array.isArray(wrapper.citations)) {
      return wrapper.citations.filter(
        (item): item is Citation =>
          typeof item === 'object' && item !== null
      )
    }

    // Single citation object
    return [citationData as Citation]
  }

  return []
}
