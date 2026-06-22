import {
  Bot,
  Brain,
  CheckSquare,
  Database,
  Download,
  FileEdit,
  FilePlus,
  FileText,
  FolderOpen,
  Globe,
  Layers,
  MessageCircle,
  Search,
  ScrollText,
  Terminal,
  Wrench,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import type { AgentMode } from '@/types/ui';
import {
  FileEdit as FileEditIcon,
  ScrollText as ScrollTextIcon,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export type ToolIconType = ComponentType<{ size?: number; color?: string }>;

export interface ToolDisplayInfo {
  labelKey: string;
  Icon: ToolIconType;
}

export function getToolInfo(toolName: string): ToolDisplayInfo {
  const name = (toolName || '').toLowerCase().trim();
  if (name === 'agent' || name.endsWith('_agent')) return { labelKey: 'tools.agent', Icon: Bot };
  if (name.includes('list_directory') || name.includes('listdir') || name.includes('list_dir')) return { labelKey: 'tools.listDir', Icon: FolderOpen };
  if (name.includes('write_file') || name === 'write' || name.includes('create_file')) return { labelKey: 'tools.writeFile', Icon: FilePlus };
  if (name.includes('edit_file') || name.includes('str_replace') || name === 'edit' || name.includes('patch')) return { labelKey: 'tools.editFile', Icon: FileEdit };
  if (name.includes('read_file') || name === 'read') return { labelKey: 'tools.readFile', Icon: FileText };
  if (name.includes('bash') || name.includes('execute') || name.includes('run_command') || name.includes('shell') || name.includes('terminal')) return { labelKey: 'tools.shell', Icon: Terminal };
  if (name.includes('grep') || name.includes('search_files') || name === 'search') return { labelKey: 'tools.search', Icon: Search };
  if (name.includes('glob') || name.includes('find_files') || name === 'find') return { labelKey: 'tools.findFiles', Icon: Layers };
  if (name.includes('think')) return { labelKey: 'tools.think', Icon: Brain };
  if (name.includes('memory') || name.includes('save_mem')) return { labelKey: 'tools.memory', Icon: Database };
  if (name.includes('web_search') || name.includes('websearch') || name.includes('browse')) return { labelKey: 'tools.webSearch', Icon: Globe };
  if (name.includes('web_fetch') || name.includes('fetch')) return { labelKey: 'tools.webFetch', Icon: Download };
  if (name.includes('todo')) return { labelKey: 'tools.todo', Icon: CheckSquare };
  if (name.includes('task_')) return { labelKey: 'tools.todo', Icon: CheckSquare };
  if (name.includes('ask_user') || name.includes('ask_question')) return { labelKey: 'tools.askUser', Icon: MessageCircle };
  if (name.includes('exit_plan') || name.includes('plan_mode')) return { labelKey: 'tools.planMode', Icon: ScrollText };
  return { labelKey: 'tools.tool', Icon: Wrench };
}

export function getToolStatusColor(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'completed') {
    return '#86efac';
  }

  if (normalized === 'error' || normalized === 'failed' || normalized === 'blocked') {
    return '#fca5a5';
  }

  if (normalized === 'approval-required' || normalized === 'input-required') {
    return '#fcd34d';
  }

  return '#60a5fa';
}

export const MODE_ICONS: Record<AgentMode, ReactNode> = {
  'default': <ShieldCheck size={14} />,
  'plan': <ScrollTextIcon size={14} />,
  'auto-edit': <FileEditIcon size={14} />,
  'yolo': <Zap size={14} />,
};
