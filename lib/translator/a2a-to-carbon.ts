/**
 * A2A Protocol to Carbon AI Chat Translator (FIXED VERSION)
 *
 * FIXES APPLIED:
 * 1. Added parsing for AgentStack trajectory URI-keyed metadata
 * 2. Added parsing for tool_call/tool_result DataPart formats
 * 3. Added reasoning_steps support for thinking content
 *
 * DOCUMENTATION REFERENCES:
 * - AgentStack Trajectory Extension: https://github.com/i-am-bee/agentstack/blob/main/apps/agentstack-sdk-py/src/agentstack_sdk/a2a/extensions/ui/trajectory.py
 * - Carbon AI Chat Chain of Thought: https://github.com/carbon-design-system/carbon-ai-chat/blob/main/examples/react/reasoning-and-chain-of-thought/src/scenarios.ts
 * - AgentStack Trajectory Guide: https://raw.githubusercontent.com/i-am-bee/agentstack/main/docs/stable/agent-integration/trajectory.mdx
 */

// ==================== A2A Protocol Types ====================

interface A2APart {
  kind: 'text' | 'file' | 'data'
  text?: string
  file?: {
    name: string
    mimeType: string
    bytes?: string
    uri?: string
  }
  data?: Record<string, any>
  metadata?: Record<string, any>
}

interface A2AArtifact {
  artifactId: string
  name?: string
  description?: string
  parts: A2APart[]
  metadata?: Record<string, unknown>
}

interface A2ATask {
  id: string
  status: {
    state: 'submitted' | 'working' | 'completed' | 'failed'
    message?: any
  }
  artifacts: A2AArtifact[]
  history: Array<any>
}

// ==================== AgentStack Extension URIs ====================
// Reference: https://github.com/i-am-bee/agentstack/blob/main/apps/agentstack-sdk-py/src/agentstack_sdk/a2a/extensions/ui/trajectory.py

export const AGENTSTACK_EXTENSION_URIS = {
  TRAJECTORY: 'https://a2a-extensions.agentstack.beeai.dev/ui/trajectory/v1',
  CITATION: 'https://a2a-extensions.agentstack.beeai.dev/ui/citation/v1',
  ERROR: 'https://a2a-extensions.agentstack.beeai.dev/ui/error/v1',
} as const

// Content types used by backend agent (agent-a2a-web-searcher-local)
// Reference: src/utils/content_parts.py in agent-a2a-web-searcher-local
export const CONTENT_TYPES = {
  THINKING: 'thinking',
  RESPONSE: 'response',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  STATUS: 'status',
} as const

// ==================== Carbon AI Chat Types ====================
// Reference: https://github.com/carbon-design-system/carbon-ai-chat/blob/main/examples/react/reasoning-and-chain-of-thought/src/scenarios.ts

export enum ChainOfThoughtStepStatus {
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface ChainOfThoughtStep {
  title?: string
  tool_name?: string
  description?: string
  request?: { args?: unknown }
  response?: { content: unknown }
  status?: ChainOfThoughtStepStatus
}

export interface ReasoningStep {
  content: string
}

export enum ReasoningStepOpenState {
  OPEN = 'open',
  CLOSED = 'closed'
}

export interface ReasoningSteps {
  steps: ReasoningStep[]
  openState?: ReasoningStepOpenState
}

export interface CarbonMessage {
  response_type: string
  text?: string
  reasoning_steps?: ReasoningSteps
  chain_of_thought?: {
    steps: ChainOfThoughtStep[]
  }
  user_defined?: Record<string, any>
  metadata?: Record<string, unknown>
}

// ==================== Trajectory Data Types ====================
// Reference: https://github.com/i-am-bee/agentstack/blob/main/apps/agentstack-sdk-py/src/agentstack_sdk/a2a/extensions/ui/trajectory.py

interface TrajectoryData {
  title?: string | null
  content?: string | null
  group_id?: string | null
  content_type?: string | null
}

// ==================== Helper Functions ====================

/**
 * Extract trajectory data from URI-keyed metadata
 * Per AgentStack SDK: metadata is keyed by extension URI
 */
function extractTrajectoryFromMetadata(metadata: Record<string, unknown> | undefined): TrajectoryData | null {
  if (!metadata) return null

  // Check for AgentStack trajectory extension URI
  const trajectoryData = metadata[AGENTSTACK_EXTENSION_URIS.TRAJECTORY]
  if (trajectoryData && typeof trajectoryData === 'object') {
    return trajectoryData as TrajectoryData
  }

  return null
}

/**
 * Parse trajectory content to determine if it contains tool call/result info
 * The backend embeds JSON in markdown code blocks
 */
function parseTrajectoryContent(content: string | null | undefined): {
  type: 'tool_call' | 'tool_result' | 'thinking' | 'status' | 'text'
  toolName?: string
  args?: Record<string, any>
  result?: any
  status?: string
} {
  if (!content) return { type: 'text' }

  // Try to extract JSON from markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim())

      // Check if it's tool call metadata
      if (parsed.type === 'tool_call' || parsed.content_type === 'tool_call') {
        return {
          type: 'tool_call',
          toolName: parsed.tool_name || parsed.tool_data?.tool_name,
          args: parsed.args || parsed.tool_data?.args,
        }
      }

      // Check if it's tool result metadata
      if (parsed.type === 'tool_result' || parsed.content_type === 'tool_result') {
        return {
          type: 'tool_result',
          toolName: parsed.tool_name || parsed.tool_data?.tool_name,
          result: parsed.result || parsed.result_preview || parsed.tool_data?.result_preview,
          status: parsed.status || parsed.tool_data?.status || 'success',
        }
      }
    } catch {
      // JSON parsing failed, continue with text analysis
    }
  }

  // Fallback: analyze content text for patterns
  if (content.includes('**Arguments:**') || content.toLowerCase().includes('calling')) {
    return { type: 'tool_call' }
  }

  if (content.includes('**Result:**') || content.includes('**Status:**')) {
    return { type: 'tool_result' }
  }

  return { type: 'text' }
}

/**
 * Determine content type from trajectory title
 */
function inferContentTypeFromTitle(title: string | null | undefined): string | null {
  if (!title) return null

  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes('calling') || lowerTitle.includes('tool call')) {
    return CONTENT_TYPES.TOOL_CALL
  }

  if (lowerTitle.includes('result') || lowerTitle.includes('completed')) {
    return CONTENT_TYPES.TOOL_RESULT
  }

  if (lowerTitle.includes('thinking') || lowerTitle.includes('reasoning')) {
    return CONTENT_TYPES.THINKING
  }

  if (lowerTitle.includes('status') || lowerTitle.includes('progress')) {
    return CONTENT_TYPES.STATUS
  }

  return null
}

// ==================== Translator Class ====================

export class A2AToCarbonTranslator {

  /**
   * Translate an A2A task to Carbon messages
   */
  translateTask(task: A2ATask): CarbonMessage[] {
    const messages: CarbonMessage[] = []

    for (const artifact of task.artifacts) {
      // First, check artifact-level metadata for trajectory
      const artifactTrajectory = extractTrajectoryFromMetadata(artifact.metadata as Record<string, unknown>)
      if (artifactTrajectory) {
        const trajectoryMessage = this.translateTrajectory(artifactTrajectory)
        if (trajectoryMessage) {
          messages.push(trajectoryMessage)
        }
      }

      for (const part of artifact.parts) {
        const message = this.translatePart(part, artifact)
        if (message) messages.push(message)
      }
    }

    return messages
  }

  /**
   * Translate a single streaming A2A part to a Carbon message
   * Used for real-time streaming updates
   *
   * @param part The A2A part to translate
   * @param metadata Optional extension metadata from the artifact or status message
   */
  translateStreamingPart(part: A2APart, metadata?: Record<string, unknown>): CarbonMessage | null {
    // FIXED: Check for AgentStack trajectory URI in metadata first
    const trajectoryData = extractTrajectoryFromMetadata(metadata)
    if (trajectoryData) {
      return this.translateTrajectory(trajectoryData)
    }

    // Create a minimal artifact wrapper to preserve metadata
    const artifact: A2AArtifact | null = metadata ? {
      artifactId: '',
      parts: [],
      metadata
    } : null

    return this.translatePart(part, artifact)
  }

  /**
   * NEW: Translate AgentStack trajectory metadata to Carbon format
   *
   * Reference:
   * - AgentStack trajectory extension: https://github.com/i-am-bee/agentstack/blob/main/apps/agentstack-sdk-py/src/agentstack_sdk/a2a/extensions/ui/trajectory.py
   * - Carbon chain_of_thought: https://github.com/carbon-design-system/carbon-ai-chat/blob/main/examples/react/reasoning-and-chain-of-thought/src/scenarios.ts
   */
  translateTrajectory(trajectory: TrajectoryData): CarbonMessage | null {
    if (!trajectory.title && !trajectory.content) {
      return null
    }

    // Determine content type from explicit field, title, or content analysis
    const explicitType = trajectory.content_type
    const inferredType = inferContentTypeFromTitle(trajectory.title)
    const parsedContent = parseTrajectoryContent(trajectory.content)

    const contentType = explicitType || inferredType || parsedContent.type

    // Route to appropriate Carbon format based on content type
    switch (contentType) {
      case CONTENT_TYPES.TOOL_CALL:
        return this.createToolCallFromTrajectory(trajectory, parsedContent)

      case CONTENT_TYPES.TOOL_RESULT:
        return this.createToolResultFromTrajectory(trajectory, parsedContent)

      case CONTENT_TYPES.THINKING:
        return this.createReasoningFromTrajectory(trajectory)

      case CONTENT_TYPES.STATUS:
        return this.createStatusFromTrajectory(trajectory)

      default:
        // For untyped trajectory, treat as reasoning step
        if (trajectory.content) {
          return this.createReasoningFromTrajectory(trajectory)
        }
        return null
    }
  }

  /**
   * Create Carbon chain_of_thought for tool calls from trajectory
   *
   * Carbon format reference:
   * https://github.com/carbon-design-system/carbon-ai-chat/blob/main/examples/react/reasoning-and-chain-of-thought/src/scenarios.ts#L73-L87
   */
  private createToolCallFromTrajectory(
    trajectory: TrajectoryData,
    parsedContent: ReturnType<typeof parseTrajectoryContent>
  ): CarbonMessage {
    // Extract tool name from title (e.g., "Calling firecrawl_scrape" -> "firecrawl_scrape")
    const toolNameMatch = trajectory.title?.match(/(?:Calling|Tool Call:?)\s*(\S+)/i)
    const toolName = parsedContent.toolName || toolNameMatch?.[1] || 'tool'

    return {
      response_type: 'chain_of_thought',
      chain_of_thought: {
        steps: [{
          title: trajectory.title || `Calling ${toolName}`,
          tool_name: toolName,
          description: trajectory.content?.replace(/```[\s\S]*?```/g, '').trim() || undefined,
          request: parsedContent.args ? { args: parsedContent.args } : undefined,
          status: ChainOfThoughtStepStatus.PROCESSING
        }]
      }
    }
  }

  /**
   * Create Carbon chain_of_thought for tool results from trajectory
   */
  private createToolResultFromTrajectory(
    trajectory: TrajectoryData,
    parsedContent: ReturnType<typeof parseTrajectoryContent>
  ): CarbonMessage {
    // Extract tool name from title (e.g., "firecrawl_scrape Result" -> "firecrawl_scrape")
    const toolNameMatch = trajectory.title?.match(/^(\S+)\s*Result/i)
    const toolName = parsedContent.toolName || toolNameMatch?.[1] || 'tool'

    const isError = parsedContent.status === 'error' ||
                   trajectory.content?.toLowerCase().includes('error') ||
                   trajectory.title?.toLowerCase().includes('failed')

    return {
      response_type: 'chain_of_thought',
      chain_of_thought: {
        steps: [{
          title: trajectory.title || `${toolName} completed`,
          tool_name: toolName,
          description: trajectory.content?.replace(/```[\s\S]*?```/g, '').trim() || undefined,
          response: parsedContent.result ? { content: parsedContent.result } : undefined,
          status: isError ? ChainOfThoughtStepStatus.ERROR : ChainOfThoughtStepStatus.SUCCESS
        }]
      }
    }
  }

  /**
   * Create Carbon reasoning_steps from trajectory
   *
   * Carbon format reference:
   * https://github.com/carbon-design-system/carbon-ai-chat/blob/main/examples/react/reasoning-and-chain-of-thought/src/scenarios.ts#L46-L71
   */
  private createReasoningFromTrajectory(trajectory: TrajectoryData): CarbonMessage {
    const content = trajectory.content || trajectory.title || ''

    return {
      response_type: 'reasoning_steps',
      reasoning_steps: {
        steps: [{
          content: trajectory.title ? `**${trajectory.title}**\n\n${content}` : content
        }],
        openState: ReasoningStepOpenState.CLOSED
      }
    }
  }

  /**
   * Create Carbon status message from trajectory
   */
  private createStatusFromTrajectory(trajectory: TrajectoryData): CarbonMessage {
    return {
      response_type: 'user_defined',
      user_defined: {
        type: 'status_message',
        message: trajectory.title || trajectory.content,
        metadata: { group_id: trajectory.group_id }
      }
    }
  }

  /**
   * Translate an A2A part to a Carbon message
   */
  private translatePart(part: A2APart, artifact: A2AArtifact | null): CarbonMessage | null {
    // Preserve metadata from artifact if present
    const extensionMetadata = artifact?.metadata

    // FIXED: Check for trajectory in part metadata
    const partTrajectory = extractTrajectoryFromMetadata(part.metadata)
    if (partTrajectory) {
      return this.translateTrajectory(partTrajectory)
    }

    // Handle parts with content_type metadata (direct format)
    if (part.metadata?.content_type) {
      const message = this.translateMetadataPart(part)
      if (message && extensionMetadata) {
        message.metadata = extensionMetadata
      }
      return message
    }

    // Handle data parts (tool_call, tool_result)
    if (part.kind === 'data' && part.data?.type) {
      const message = this.translateDataPart(part)
      if (message && extensionMetadata) {
        message.metadata = extensionMetadata
      }
      return message
    }

    // Handle standard part types
    switch (part.kind) {
      case 'text':
        return {
          response_type: 'text',
          text: part.text,
          metadata: extensionMetadata
        }

      case 'file':
        const fileMessage = this.translateFilePart(part, artifact)
        if (fileMessage && extensionMetadata) {
          fileMessage.metadata = extensionMetadata
        }
        return fileMessage

      case 'data':
        const dataMessage = this.translateGenericDataPart(part)
        if (dataMessage && extensionMetadata) {
          dataMessage.metadata = extensionMetadata
        }
        return dataMessage

      default:
        return null
    }
  }

  /**
   * Translate parts with content_type metadata (thinking, response, status)
   */
  private translateMetadataPart(part: A2APart): CarbonMessage | null {
    const contentType = part.metadata?.content_type

    switch (contentType) {
      case CONTENT_TYPES.THINKING:
        return {
          response_type: 'reasoning_steps',
          reasoning_steps: {
            steps: [{
              content: part.text || ''
            }],
            openState: ReasoningStepOpenState.CLOSED
          }
        }

      case CONTENT_TYPES.RESPONSE:
        return {
          response_type: 'text',
          text: part.text
        }

      case CONTENT_TYPES.STATUS:
        return {
          response_type: 'user_defined',
          user_defined: {
            type: 'status_message',
            message: part.text,
            metadata: part.metadata
          }
        }

      default:
        return null
    }
  }

  /**
   * Translate data parts (tool_call, tool_result)
   */
  private translateDataPart(part: A2APart): CarbonMessage | null {
    const dataType = part.data?.type

    switch (dataType) {
      case 'tool_call':
        return {
          response_type: 'chain_of_thought',
          chain_of_thought: {
            steps: [{
              title: part.data?.title || `Calling ${part.data?.tool_name || 'tool'}`,
              tool_name: part.data?.tool_name,
              description: part.data?.description,
              request: part.data?.args ? { args: part.data.args } : undefined,
              status: ChainOfThoughtStepStatus.PROCESSING
            }]
          }
        }

      case 'tool_result':
        return {
          response_type: 'chain_of_thought',
          chain_of_thought: {
            steps: [{
              title: part.data?.title || `${part.data?.tool_name || 'Tool'} completed`,
              tool_name: part.data?.tool_name,
              description: part.data?.description,
              request: part.data?.args ? { args: part.data.args } : undefined,
              response: part.data?.result ? { content: part.data.result } : undefined,
              status: part.data?.error
                ? ChainOfThoughtStepStatus.ERROR
                : ChainOfThoughtStepStatus.SUCCESS
            }]
          }
        }

      default:
        return null
    }
  }

  /**
   * Translate file parts (images, attachments)
   */
  private translateFilePart(part: A2APart, artifact: A2AArtifact | null): CarbonMessage | null {
    if (!part.file) return null

    const mimeType = part.file.mimeType

    if (mimeType.startsWith('image/')) {
      return {
        response_type: 'image',
        user_defined: {
          type: 'image',
          url: part.file.uri || this.base64ToDataUrl(part.file.bytes || '', mimeType),
          alt: part.file.name,
          caption: artifact?.description
        }
      }
    }

    if (part.file.name?.includes('chart') || part.file.name?.includes('graph')) {
      return {
        response_type: 'user_defined',
        user_defined: {
          type: 'chart',
          imageUrl: part.file.uri || this.base64ToDataUrl(part.file.bytes || '', mimeType),
          title: artifact?.name,
          description: artifact?.description
        }
      }
    }

    return {
      response_type: 'user_defined',
      user_defined: {
        type: 'file_attachment',
        fileName: part.file.name,
        mimeType: part.file.mimeType,
        downloadUrl: part.file.uri,
        size: part.file.bytes?.length
      }
    }
  }

  /**
   * Translate generic data parts
   */
  private translateGenericDataPart(part: A2APart): CarbonMessage | null {
    const data = part.data

    if (!data) return null

    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      return {
        response_type: 'user_defined',
        user_defined: {
          type: 'data_table',
          columns: Object.keys(data[0]),
          rows: data
        }
      }
    }

    return {
      response_type: 'user_defined',
      user_defined: {
        type: 'structured_data',
        data: data
      }
    }
  }

  /**
   * Convert base64 to data URL
   */
  private base64ToDataUrl(base64: string, mimeType: string): string {
    return `data:${mimeType};base64,${base64}`
  }

  // ==================== Static Factory Methods ====================

  static createToolCallMessage(
    toolName: string,
    args?: unknown,
    description?: string
  ): CarbonMessage {
    return {
      response_type: 'chain_of_thought',
      chain_of_thought: {
        steps: [{
          title: `Calling ${toolName}`,
          tool_name: toolName,
          description,
          request: args ? { args } : undefined,
          status: ChainOfThoughtStepStatus.PROCESSING
        }]
      }
    }
  }

  static createToolResultMessage(
    toolName: string,
    result: unknown,
    args?: unknown,
    error?: boolean,
    description?: string
  ): CarbonMessage {
    return {
      response_type: 'chain_of_thought',
      chain_of_thought: {
        steps: [{
          title: `${toolName} ${error ? 'failed' : 'completed'}`,
          tool_name: toolName,
          description,
          request: args ? { args } : undefined,
          response: { content: result },
          status: error ? ChainOfThoughtStepStatus.ERROR : ChainOfThoughtStepStatus.SUCCESS
        }]
      }
    }
  }

  static createReasoningMessage(
    content: string,
    openState: ReasoningStepOpenState = ReasoningStepOpenState.CLOSED
  ): CarbonMessage {
    return {
      response_type: 'reasoning_steps',
      reasoning_steps: {
        steps: [{ content }],
        openState
      }
    }
  }
}
