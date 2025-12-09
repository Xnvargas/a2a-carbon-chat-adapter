# Agent Client Zero

> A Next.js frontend client for the Agent2Agent (A2A) protocol, rendering AI agent communications using IBM Carbon AI Chat components.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Carbon AI Chat](https://img.shields.io/badge/Carbon_AI_Chat-1.2.1-blue)](https://www.npmjs.com/package/@carbon/ai-chat)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Core Concepts](#core-concepts)
  - [A2A Protocol Communication](#a2a-protocol-communication)
  - [Message Translation Pipeline](#message-translation-pipeline)
  - [Custom Response Rendering](#custom-response-rendering)
- [Setup & Configuration](#setup--configuration)
  - [Environment Variables](#environment-variables)
  - [Supabase Setup](#supabase-setup)
- [Development Guide](#development-guide)
  - [Local Development](#local-development)
  - [Adding New Response Types](#adding-new-response-types)
  - [Extending the A2A Client](#extending-the-a2a-client)
- [Extension Points](#extension-points)
- [Deployment](#deployment)
  - [Docker](#docker)
  - [Kubernetes / EKS](#kubernetes--eks)
- [API Reference](#api-reference)

---

## Overview

**Agent Client Zero** is a production-ready frontend client that connects to Python-based A2A (Agent2Agent) servers and renders their communications using IBM's Carbon Design System AI Chat components. It provides:

- **A2A Protocol Support**: JSON-RPC 2.0 based communication with A2A agents
- **Multi-Modal Responses**: Support for text, images, charts, files, and structured data
- **Semantic Search**: Client-side embeddings with Supabase pgvector for conversation search
- **Secure Architecture**: API key proxying, Row-Level Security, and authentication via Supabase
- **Production Ready**: Docker containerization and Kubernetes manifests for EKS deployment

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐  │
│  │   app/page.tsx   │───▶│ EnhancedChat     │───▶│  Carbon AI Chat      │  │
│  │   (Entry Point)  │    │ Wrapper.tsx      │    │  Components          │  │
│  └──────────────────┘    └────────┬─────────┘    └──────────────────────┘  │
│                                   │                                         │
│                    ┌──────────────┴──────────────┐                         │
│                    ▼                              ▼                         │
│          ┌─────────────────┐           ┌─────────────────────┐             │
│          │  A2AClient      │           │ A2AToCarbonTranslator│             │
│          │  (lib/a2a/)     │           │ (lib/translator/)    │             │
│          └────────┬────────┘           └─────────────────────┘             │
│                   │                                                         │
├───────────────────┼─────────────────────────────────────────────────────────┤
│                   │              API LAYER                                  │
│                   ▼                                                         │
│  ┌──────────────────────────────┐    ┌──────────────────────────────────┐  │
│  │  /api/agent/send (POST)      │    │  /api/health (GET)               │  │
│  │  - Auth verification         │    │  - Database connectivity check   │  │
│  │  - API key proxy             │    │  - Server status                 │  │
│  └──────────────┬───────────────┘    └──────────────────────────────────┘  │
│                 │                                                           │
├─────────────────┼───────────────────────────────────────────────────────────┤
│                 │           EXTERNAL SERVICES                               │
│                 ▼                                                           │
│  ┌──────────────────┐         ┌──────────────────────────────────────────┐ │
│  │   A2A Agent      │         │           Supabase                       │ │
│  │   (Python)       │         │  ┌─────────────────────────────────────┐ │ │
│  │                  │         │  │  Auth: User authentication          │ │ │
│  │  /.well-known/   │         │  │  DB: profiles, conversations,       │ │ │
│  │   agent-card.json│         │  │      messages, agent_configs        │ │ │
│  │                  │         │  │  pgvector: Semantic search          │ │ │
│  └──────────────────┘         │  └─────────────────────────────────────┘ │ │
│                               └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Input** → `EnhancedChatWrapper` captures message via Carbon Chat UI
2. **A2A Request** → `A2AClient.streamMessage()` sends JSON-RPC 2.0 request to agent
3. **Agent Response** → Agent returns Task with Artifacts (text, files, data)
4. **Translation** → `A2AToCarbonTranslator` converts A2A artifacts to Carbon message format
5. **Rendering** → Custom renderers display images, charts, tables, files in chat UI

---

## Directory Structure

```
carbon_agents/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── agent/send/
│   │   │   └── route.ts          # Secure proxy for A2A agent communication
│   │   └── health/
│   │       └── route.ts          # Health check endpoint for K8s probes
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with fonts
│   └── page.tsx                  # Main entry point - renders chat
│
├── components/
│   └── EnhancedChatWrapper.tsx   # Main chat component with custom renderers
│
├── lib/
│   ├── a2a/
│   │   └── client.ts             # A2A protocol client (JSON-RPC 2.0)
│   ├── embeddings/
│   │   └── service.ts            # Client-side embedding generation
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   └── server.ts             # Server-side Supabase client (SSR)
│   └── translator/
│       └── a2a-to-carbon.ts      # A2A → Carbon message translator
│
├── supabase/
│   └── schema.sql                # Database schema with RLS policies
│
├── k8s/
│   ├── deployment.yaml           # K8s Deployment, Service, HPA
│   └── network-policy.yaml       # Network security policies
│
├── middleware.ts                 # Supabase auth session refresh
├── Dockerfile                    # Multi-stage production build
├── cluster-config.yaml           # EKS cluster configuration
├── next.config.ts                # Next.js configuration
└── package.json                  # Dependencies and scripts
```

---

## Core Concepts

### A2A Protocol Communication

The A2A (Agent2Agent) protocol enables interoperability between AI agents using JSON-RPC 2.0. This client implements the protocol as follows:

#### Agent Discovery

Agents expose their capabilities via `/.well-known/agent-card.json`:

```typescript
interface AgentCard {
  name: string
  url: string
  skills: Array<{ id: string; name: string; description: string }>
  securitySchemes?: Record<string, any>
}
```

#### Message Sending

Messages are sent using the `message/send` or `message/stream` JSON-RPC methods:

```typescript
// lib/a2a/client.ts - Key methods

class A2AClient {
  // Initialize by fetching agent capabilities
  async initialize(): Promise<AgentCard>
  
  // Send message with blocking response
  async sendMessage(message: string, skillId?: string): Promise<Task>
  
  // Send message with streaming response (SSE)
  async streamMessage(message: string, onChunk: (chunk: any) => void): Promise<void>
}
```

#### JSON-RPC 2.0 Payload Structure

```json
{
  "jsonrpc": "2.0",
  "id": "uuid",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "messageId": "uuid",
      "parts": [{ "kind": "text", "text": "Hello" }]
    },
    "configuration": {
      "acceptedOutputModes": ["application/json", "text/plain", "image/*"],
      "historyLength": 10,
      "blocking": true
    }
  }
}
```

### Message Translation Pipeline

The `A2AToCarbonTranslator` converts A2A Task artifacts into Carbon AI Chat message formats:

```typescript
// lib/translator/a2a-to-carbon.ts

interface A2ATask {
  id: string
  status: { state: 'submitted' | 'working' | 'completed' | 'failed' }
  artifacts: Array<{
    artifactId: string
    parts: Array<{
      kind: 'text' | 'file' | 'data'
      text?: string
      file?: { name: string; mimeType: string; bytes?: string; uri?: string }
      data?: Record<string, any>
    }>
  }>
}

interface CarbonMessage {
  response_type: string           // 'text', 'image', 'user_defined'
  text?: string                   // For text responses
  user_defined?: {                // For custom content types
    type: string                  // 'image', 'chart', 'file_attachment', 'data_table', 'structured_data'
    // ... type-specific properties
  }
}
```

#### Translation Mapping

| A2A Part Kind | Condition | Carbon response_type | user_defined.type |
|---------------|-----------|---------------------|-------------------|
| `text` | - | `text` | - |
| `file` | mimeType starts with `image/` | `image` | `image` |
| `file` | name contains 'chart' or 'graph' | `user_defined` | `chart` |
| `file` | other | `user_defined` | `file_attachment` |
| `data` | array of objects | `user_defined` | `data_table` |
| `data` | other | `user_defined` | `structured_data` |

### Custom Response Rendering

The `EnhancedChatWrapper` provides custom renderers for each `user_defined` type:

```typescript
// components/EnhancedChatWrapper.tsx

const renderCustomResponse = (state: any, instance: any) => {
  const userDefined = state.messageItem?.user_defined
  
  switch (userDefined?.type) {
    case 'image':     // Renders <img> with caption
    case 'chart':     // Renders chart image with title/description
    case 'file_attachment': // Renders downloadable file link
    case 'data_table':     // Renders HTML table from array data
    case 'structured_data': // Renders JSON in <pre><code>
  }
}
```

---

## Setup & Configuration

### Environment Variables

Create a `.env.local` file with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# Agent Configuration (for direct connection - development only)
NEXT_PUBLIC_AGENT_URL=http://localhost:8000
NEXT_PUBLIC_AGENT_API_KEY=your-agent-api-key

# For production, agent configs are stored per-user in Supabase
# The API route retrieves them securely from the database
```

### Supabase Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)

2. **Enable pgvector extension** (for semantic search):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
   ```

3. **Run the schema** from `supabase/schema.sql`:
   - Creates tables: `profiles`, `conversations`, `messages`, `agent_configs`
   - Sets up 384-dimensional vector embeddings for semantic search
   - Configures Row-Level Security (RLS) policies
   - Creates `match_messages` function for similarity search

#### Database Schema Overview

```sql
-- Core tables
profiles       -- User profiles (extends auth.users)
conversations  -- Chat sessions with agent URLs
messages       -- Chat messages with embeddings for semantic search
agent_configs  -- Per-user agent API keys (stored securely)

-- Key features
- pgvector for 384-dimensional embeddings (GTE-small model)
- HNSW index for fast cosine similarity search
- RLS policies ensuring users only access their own data
```

---

## Development Guide

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Adding New Response Types

To support a new type of agent response:

**1. Update the Translator** (`lib/translator/a2a-to-carbon.ts`):

```typescript
private translatePart(part: any, artifact: any): CarbonMessage | null {
  switch (part.kind) {
    // ... existing cases

    case 'your_new_type':
      return {
        response_type: 'user_defined',
        user_defined: {
          type: 'your_new_type',
          // ... extract relevant data from part
        }
      }
  }
}
```

**2. Add Custom Renderer** (`components/EnhancedChatWrapper.tsx`):

```typescript
const renderCustomResponse = (state: any, instance: any) => {
  const userDefined = state.messageItem?.user_defined
  
  // Add new case
  if (userDefined?.type === 'your_new_type') {
    return (
      <YourCustomComponent data={userDefined} />
    )
  }
  
  // ... existing cases
}
```

**3. Update TypeScript Interfaces** (if desired):

```typescript
// lib/translator/a2a-to-carbon.ts
interface CarbonMessage {
  response_type: string
  user_defined?: {
    type: 'image' | 'chart' | 'file_attachment' | 'data_table' | 'structured_data' | 'your_new_type'
    // ...
  }
}
```

### Extending the A2A Client

To add new A2A protocol methods:

```typescript
// lib/a2a/client.ts

class A2AClient {
  // Add new method
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const payload = {
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'task/get',
      params: { taskId }
    }

    const response = await fetch(this.agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    })

    return (await response.json()).result
  }
  
  // Add skill-specific invocation
  async invokeSkill(skillId: string, message: string): Promise<Task> {
    // Similar to sendMessage but with skill routing
  }
}
```

---

## Extension Points

For AI agents developing extensions, here are the key integration points:

### 1. New Agent Types

Extend `A2AClient` to support different agent protocols:

```typescript
// lib/a2a/custom-client.ts
export class CustomAgentClient extends A2AClient {
  // Override methods for protocol variations
  // Add authentication schemes
  // Handle custom response formats
}
```

### 2. Response Visualizations

Add new visualization components:

```typescript
// components/visualizations/
ChartVisualization.tsx    // For data charts
MapVisualization.tsx      // For geographic data
TimelineVisualization.tsx // For temporal data
CodeVisualization.tsx     // For code with syntax highlighting
```

### 3. Conversation Persistence

Extend the embeddings service for advanced RAG:

```typescript
// lib/embeddings/service.ts
class EmbeddingService {
  // Add hybrid search (semantic + keyword)
  async hybridSearch(query: string, keywords: string[]): Promise<Message[]>
  
  // Add conversation summarization
  async summarizeConversation(conversationId: string): Promise<string>
}
```

### 4. Multi-Agent Orchestration

Create an orchestrator for multi-agent conversations:

```typescript
// lib/orchestrator/multi-agent.ts
export class MultiAgentOrchestrator {
  private agents: Map<string, A2AClient>
  
  async routeMessage(message: string): Promise<string>
  async coordinateResponse(agents: string[], message: string): Promise<CombinedResponse>
}
```

### 5. Authentication Providers

Add OAuth/OIDC providers beyond Supabase Auth:

```typescript
// lib/auth/providers/
supabase.ts   // Current implementation
okta.ts       // Enterprise SSO
auth0.ts      // Auth0 integration
```

---

## Deployment

### Docker

Multi-stage Dockerfile for production builds:

```bash
# Build the image
docker build -t nextjs-a2a-app:latest .

# Run locally
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... \
  nextjs-a2a-app:latest
```

The Dockerfile features:
- Node.js 22 slim base image
- Multi-stage build (dependencies → build → run)
- Non-root user execution (UID 1001)
- Standalone Next.js output for minimal image size

### Kubernetes / EKS

**1. Create EKS Cluster** (using `cluster-config.yaml`):

```bash
eksctl create cluster -f cluster-config.yaml
```

**2. Create Secrets**:

```bash
kubectl create secret generic app-secrets \
  --from-literal=supabase-url=YOUR_URL \
  --from-literal=supabase-key=YOUR_KEY \
  --from-literal=agent-api-key=YOUR_AGENT_KEY
```

**3. Deploy Application**:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/network-policy.yaml
```

**Features**:
- 3 replicas with HorizontalPodAutoscaler (3-10 pods)
- CPU/memory resource limits
- Liveness/readiness probes using `/api/health`
- Network policies restricting ingress/egress
- AWS NLB load balancer

---

## API Reference

### `POST /api/agent/send`

Secure proxy for A2A agent communication.

**Authentication**: Requires Supabase auth session (cookie-based)

**Request Body**: Any JSON-RPC 2.0 payload for the A2A agent

**Response**: Proxied agent response

**Flow**:
1. Verifies user authentication via Supabase
2. Retrieves user's agent config (URL + API key) from database
3. Forwards request to agent with server-side API key
4. Returns agent response

### `GET /api/health`

Health check endpoint for Kubernetes probes.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": "connected",
    "server": "running"
  }
}
```

---

## Key Interfaces Reference

### A2AClient

```typescript
class A2AClient {
  constructor(agentUrl: string, apiKey: string)
  
  initialize(): Promise<AgentCard>
  sendMessage(message: string, skillId?: string): Promise<Task>
  streamMessage(message: string, onChunk: (chunk) => void): Promise<void>
}
```

### A2AToCarbonTranslator

```typescript
class A2AToCarbonTranslator {
  translateTask(task: A2ATask): CarbonMessage[]
}
```

### EmbeddingService

```typescript
class EmbeddingService {
  initialize(): Promise<void>
  generateEmbedding(text: string): Promise<number[]>
  searchSimilarMessages(
    query: string,
    conversationId?: string,
    threshold?: number,
    limit?: number
  ): Promise<{ data: Message[], error: Error | null }>
}
```

---

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
