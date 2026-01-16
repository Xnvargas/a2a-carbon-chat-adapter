'use client'

import { useState, useCallback } from 'react'
import type { FormRendererProps, FormField } from './types'

/**
 * FormRenderer - Renders dynamic forms in the chat interface
 *
 * Displays form fields based on configuration and handles submission.
 * Styled to integrate with Carbon AI Chat components.
 */
export function FormRenderer({
  form,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className = ''
}: FormRendererProps) {
  const { id, title, description, fields, submitLabel = 'Submit', cancelLabel = 'Cancel' } = form

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {}
    fields.forEach((field) => {
      initial[field.name] = field.defaultValue ?? (field.type === 'checkbox' ? false : '')
    })
    return initial
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateField = useCallback((field: FormField, value: unknown): string | null => {
    if (field.required && (value === '' || value === null || value === undefined)) {
      return `${field.label} is required`
    }

    if (field.validation) {
      const { min, max, minLength, maxLength, pattern, patternMessage } = field.validation

      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          return `${field.label} must be at least ${min}`
        }
        if (max !== undefined && value > max) {
          return `${field.label} must be at most ${max}`
        }
      }

      if (typeof value === 'string') {
        if (minLength !== undefined && value.length < minLength) {
          return `${field.label} must be at least ${minLength} characters`
        }
        if (maxLength !== undefined && value.length > maxLength) {
          return `${field.label} must be at most ${maxLength} characters`
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          return patternMessage || `${field.label} has an invalid format`
        }
      }
    }

    return null
  }, [])

  const handleChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }, [])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    fields.forEach((field) => {
      const error = validateField(field, values[field.name])
      if (error) {
        newErrors[field.name] = error
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit(values)
  }, [fields, values, validateField, onSubmit])

  const renderField = useCallback((field: FormField) => {
    const { name, label, type, placeholder, required, options, helpText, disabled } = field
    const value = values[name]
    const error = errors[name]
    const inputId = `${id}-${name}`

    const baseInputClass = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      error ? 'border-red-300 bg-red-50' : 'border-gray-300'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`

    const labelElement = (
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )

    const errorElement = error && (
      <p className="mt-1 text-xs text-red-600">{error}</p>
    )

    const helpElement = helpText && !error && (
      <p className="mt-1 text-xs text-gray-500">{helpText}</p>
    )

    switch (type) {
      case 'textarea':
        return (
          <div key={name} className="form-field mb-4">
            {labelElement}
            <textarea
              id={inputId}
              name={name}
              value={value as string}
              onChange={(e) => handleChange(name, e.target.value)}
              placeholder={placeholder}
              disabled={disabled || isSubmitting}
              className={`${baseInputClass} min-h-[100px] resize-y`}
              rows={4}
            />
            {errorElement}
            {helpElement}
          </div>
        )

      case 'select':
        return (
          <div key={name} className="form-field mb-4">
            {labelElement}
            <select
              id={inputId}
              name={name}
              value={value as string}
              onChange={(e) => handleChange(name, e.target.value)}
              disabled={disabled || isSubmitting}
              className={baseInputClass}
            >
              <option value="">{placeholder || 'Select an option'}</option>
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errorElement}
            {helpElement}
          </div>
        )

      case 'checkbox':
        return (
          <div key={name} className="form-field mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id={inputId}
                name={name}
                checked={value as boolean}
                onChange={(e) => handleChange(name, e.target.checked)}
                disabled={disabled || isSubmitting}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </span>
            </label>
            {errorElement}
            {helpElement}
          </div>
        )

      case 'radio':
        return (
          <div key={name} className="form-field mb-4">
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </legend>
              <div className="space-y-2">
                {options?.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={name}
                      value={opt.value}
                      checked={value === opt.value}
                      onChange={(e) => handleChange(name, e.target.value)}
                      disabled={opt.disabled || disabled || isSubmitting}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {errorElement}
            {helpElement}
          </div>
        )

      default:
        return (
          <div key={name} className="form-field mb-4">
            {labelElement}
            <input
              type={type}
              id={inputId}
              name={name}
              value={value as string}
              onChange={(e) => handleChange(name, type === 'number' ? Number(e.target.value) : e.target.value)}
              placeholder={placeholder}
              disabled={disabled || isSubmitting}
              className={baseInputClass}
            />
            {errorElement}
            {helpElement}
          </div>
        )
    }
  }, [id, values, errors, handleChange, isSubmitting])

  return (
    <div className={`form-renderer border border-gray-200 bg-white rounded-lg p-4 ${className}`}>
      {title && (
        <h3 className="form-renderer__title text-lg font-semibold text-gray-900 mb-1">
          {title}
        </h3>
      )}

      {description && (
        <p className="form-renderer__description text-sm text-gray-600 mb-4">
          {description}
        </p>
      )}

      <form onSubmit={handleSubmit} className="form-renderer__form">
        {fields.map(renderField)}

        <div className="form-renderer__actions flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default FormRenderer
