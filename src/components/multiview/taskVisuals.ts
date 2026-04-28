import type { CSSProperties } from 'react'
import type { TaskPriority, TaskStatus } from '../../tasks/types.ts'

export interface VisualToken {
  accent: string
  bg: string
  text: string
  border: string
}

export const STATUS_VISUALS: Record<TaskStatus, VisualToken> = {
  todo: {
    accent: '#64748b',
    bg: '#eef2f7',
    text: '#334155',
    border: '#cbd5e1',
  },
  doing: {
    accent: '#0ea5e9',
    bg: '#e0f2fe',
    text: '#075985',
    border: '#7dd3fc',
  },
  done: {
    accent: '#16a34a',
    bg: '#dcfce7',
    text: '#166534',
    border: '#86efac',
  },
  blocked: {
    accent: '#dc2626',
    bg: '#fee2e2',
    text: '#991b1b',
    border: '#fca5a5',
  },
}

export const PRIORITY_VISUALS: Record<TaskPriority, VisualToken> = {
  urgent: {
    accent: '#e11d48',
    bg: '#ffe4e6',
    text: '#9f1239',
    border: '#fda4af',
  },
  high: {
    accent: '#f97316',
    bg: '#ffedd5',
    text: '#9a3412',
    border: '#fdba74',
  },
  medium: {
    accent: '#ca8a04',
    bg: '#fef3c7',
    text: '#854d0e',
    border: '#facc15',
  },
  low: {
    accent: '#0d9488',
    bg: '#ccfbf1',
    text: '#115e59',
    border: '#5eead4',
  },
}

export function tokenStyle(token: VisualToken): CSSProperties {
  return {
    '--task-token-accent': token.accent,
    '--task-token-bg': token.bg,
    '--task-token-text': token.text,
    '--task-token-border': token.border,
  } as CSSProperties
}

export function tagTokenStyle(color: string): CSSProperties {
  const token = tagVisualToken(color)

  return {
    '--task-token-accent': token.accent,
    '--task-token-bg': token.bg,
    '--task-token-text': token.text,
    '--task-token-border': token.border,
  } as CSSProperties
}

export function tagVisualToken(color: string): VisualToken {
  const fallback = '#3b82f6'
  const accent = isHexColor(color) ? color : fallback
  const rgb = hexToRgb(accent) ?? hexToRgb(fallback)
  const softBg = rgb ? `rgb(${mixChannel(rgb.r, 255, 0.86)} ${mixChannel(rgb.g, 255, 0.86)} ${mixChannel(rgb.b, 255, 0.86)})` : '#eff6ff'
  const border = rgb ? `rgb(${mixChannel(rgb.r, 255, 0.56)} ${mixChannel(rgb.g, 255, 0.56)} ${mixChannel(rgb.b, 255, 0.56)})` : '#bfdbfe'

  return {
    accent,
    bg: softBg,
    text: accent,
    border,
  }
}

function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
}

function hexToRgb(value: string): { r: number; g: number; b: number } | undefined {
  const normalized = value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value
  const match = /^#([0-9a-f]{6})$/i.exec(normalized)
  if (!match) {
    return undefined
  }

  const int = Number.parseInt(match[1], 16)
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

function mixChannel(source: number, target: number, ratio: number): number {
  return Math.round(source * (1 - ratio) + target * ratio)
}
