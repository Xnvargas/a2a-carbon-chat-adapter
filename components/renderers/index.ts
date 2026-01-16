/**
 * Renderers module - Custom renderers for Carbon AI Chat
 *
 * This module provides reusable renderer components for displaying
 * various content types in the chat interface.
 */

// Components
export { ErrorRenderer } from './ErrorRenderer'
export { FormRenderer } from './FormRenderer'

// Types
export type {
  // Base types
  BaseRendererProps,
  // Error renderer
  ErrorRendererProps,
  ErrorData,
  // Form renderer
  FormRendererProps,
  FormData,
  FormField,
  FormFieldType,
  FormFieldOption,
  FormFieldValidation,
  // User-defined content types
  UserDefinedContent,
  ImageContent,
  ChartContent,
  FileAttachmentContent,
  DataTableContent,
  StructuredDataContent,
  ErrorContent,
  FormContent
} from './types'
