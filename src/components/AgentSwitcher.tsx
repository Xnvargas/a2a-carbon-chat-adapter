'use client';

import React from 'react';
import type { AgentConfig } from '../types';

export interface AgentSwitcherProps {
  /** Available agents */
  agents: AgentConfig[];

  /** Currently selected agent ID */
  currentAgentId?: string;

  /** Called when user selects an agent */
  onSelect: (agentId: string) => void;

  /** Variant style */
  variant?: 'dropdown' | 'tabs' | 'cards';

  /** Show agent descriptions */
  showDescriptions?: boolean;

  /** Show agent icons */
  showIcons?: boolean;

  /** Custom class name */
  className?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Label text */
  label?: string;
}

/**
 * Component for switching between multiple agents
 *
 * @example
 * const { agents, currentAgent, selectAgent } = useAgentContext();
 *
 * <AgentSwitcher
 *   agents={agents}
 *   currentAgentId={currentAgent?.id}
 *   onSelect={selectAgent}
 * />
 */
export function AgentSwitcher({
  agents,
  currentAgentId,
  onSelect,
  variant = 'dropdown',
  showDescriptions = false,
  showIcons = true,
  className = '',
  disabled = false,
  label = 'Select Agent',
}: AgentSwitcherProps) {
  if (agents.length === 0) {
    return null;
  }

  if (variant === 'tabs') {
    return (
      <div className={`a2a-agent-switcher a2a-agent-switcher--tabs ${className}`}>
        <div className="a2a-agent-switcher__tabs" role="tablist" aria-label={label}>
          {agents.map((agent) => (
            <button
              key={agent.id}
              role="tab"
              aria-selected={agent.id === currentAgentId}
              className={`a2a-agent-switcher__tab ${
                agent.id === currentAgentId ? 'a2a-agent-switcher__tab--active' : ''
              }`}
              onClick={() => onSelect(agent.id)}
              disabled={disabled}
            >
              {showIcons && agent.iconUrl && (
                <img
                  src={agent.iconUrl}
                  alt=""
                  className="a2a-agent-switcher__icon"
                  width={20}
                  height={20}
                />
              )}
              <span>{agent.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={`a2a-agent-switcher a2a-agent-switcher--cards ${className}`}>
        <fieldset disabled={disabled}>
          <legend className="a2a-agent-switcher__label">{label}</legend>
          <div className="a2a-agent-switcher__cards">
            {agents.map((agent) => (
              <button
                key={agent.id}
                className={`a2a-agent-switcher__card ${
                  agent.id === currentAgentId ? 'a2a-agent-switcher__card--active' : ''
                }`}
                onClick={() => onSelect(agent.id)}
              >
                {showIcons && agent.iconUrl && (
                  <img
                    src={agent.iconUrl}
                    alt=""
                    className="a2a-agent-switcher__card-icon"
                    width={32}
                    height={32}
                  />
                )}
                <div className="a2a-agent-switcher__card-content">
                  <span className="a2a-agent-switcher__card-name">{agent.name}</span>
                  {showDescriptions && agent.description && (
                    <span className="a2a-agent-switcher__card-description">{agent.description}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    );
  }

  // Default: dropdown
  return (
    <div className={`a2a-agent-switcher a2a-agent-switcher--dropdown ${className}`}>
      <label className="a2a-agent-switcher__label">
        {label}
        <select
          value={currentAgentId ?? ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className="a2a-agent-switcher__select"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default AgentSwitcher;
