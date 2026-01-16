/**
 * TypeScript interfaces for renderers
 */

// Base renderer props
export interface BaseRendererProps {
  className?: string
}

// Error renderer types
export interface ErrorRendererProps extends BaseRendererProps {
  error: ErrorData
  onRetry?: () => void
  onDismiss?: () => void
}

export interface ErrorData {
  message: string
  code?: string | number
  details?: string
  timestamp?: string
  recoverable?: boolean
}

// Form renderer types
export interface FormRendererProps extends BaseRendererProps {
  form: FormData
  onSubmit: (values: Record<string, unknown>) => void
  onCancel?: () => void
  isSubmitting?: boolean
}

export interface FormData {
  id: string
  title?: string
  description?: string
  fields: FormField[]
  submitLabel?: string
  cancelLabel?: string
}

export interface FormField {
  name: string
  label: string
  type: FormFieldType
  placeholder?: string
  required?: boolean
  defaultValue?: unknown
  options?: FormFieldOption[]
  validation?: FormFieldValidation
  helpText?: string
  disabled?: boolean
}

export type FormFieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'file'

export interface FormFieldOption {
  value: string
  label: string
  disabled?: boolean
}

export interface FormFieldValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  patternMessage?: string
}

// User-defined content types for Carbon chat
export interface UserDefinedContent {
  type: string
  [key: string]: unknown
}

export interface ImageContent extends UserDefinedContent {
  type: 'image'
  url: string
  alt?: string
  caption?: string
}

export interface ChartContent extends UserDefinedContent {
  type: 'chart'
  title?: string
  imageUrl: string
  description?: string
}

export interface FileAttachmentContent extends UserDefinedContent {
  type: 'file_attachment'
  fileName: string
  downloadUrl: string
  mimeType: string
  size?: number
}

export interface DataTableContent extends UserDefinedContent {
  type: 'data_table'
  columns: string[]
  rows: Record<string, unknown>[]
}

export interface StructuredDataContent extends UserDefinedContent {
  type: 'structured_data'
  data: Record<string, unknown>
}

export interface ErrorContent extends UserDefinedContent {
  type: 'error'
  error: ErrorData
}

export interface FormContent extends UserDefinedContent {
  type: 'form'
  form: FormData
}
