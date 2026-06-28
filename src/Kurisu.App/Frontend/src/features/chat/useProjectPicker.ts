import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getProjectlessTempDirectory,
  isTemporaryChatWorkingDirectory,
  joinDesktopPath,
  normalizePathKey,
  pathStartsWith,
} from '@/lib/paths';
import { useBootstrap } from '@/hooks/useBootstrap';
import { getProjectDisplayName } from '@/features/chat/composer/composerLabels';
import type { ProjectOption, ProjectPickerPosition } from '@/features/chat';

export interface UseProjectPickerResult {
  isOpen: boolean;
  query: string;
  position: ProjectPickerPosition;
  selectedProjectPath: string;
  selectedProjectMode: 'project' | 'no-project';
  selectedProjectWorkingDirectory: string;
  filteredProjectOptions: ProjectOption[];
  projectListHeight: number;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  menuRef: React.RefObject<HTMLDivElement | null>;
  setIsOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
  setQuery: (value: string) => void;
  selectProject: (project: ProjectOption) => void;
  addProject: () => Promise<void>;
  selectedProjectLabel: string;
}

export function useProjectPicker(
  selectedSession: { workingDirectory?: string } | undefined,
  sidebarMode: 'projects' | 'chats',
): UseProjectPickerResult {
  const { t } = useTranslation();
  const { bootstrap } = useBootstrap();
  const sessions = useMemo(
    () => bootstrap?.recentSessions ?? [],
    [bootstrap?.recentSessions],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState<ProjectPickerPosition>({ top: 0, left: 0, width: 320, maxHeight: 320 });
  const [selectedProjectMode, setSelectedProjectMode] = useState<'project' | 'no-project'>('project');
  const [selectedProjectPath, setSelectedProjectPath] = useState('');
  const [customProjectPaths, setCustomProjectPaths] = useState<string[]>([]);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const runtimeTempRoot = useMemo(
    () => joinDesktopPath(bootstrap?.kurisuRuntime?.runtimeBaseDirectory ?? bootstrap?.workspaceRoot ?? '', 'tmp'),
    [bootstrap?.kurisuRuntime?.runtimeBaseDirectory, bootstrap?.workspaceRoot],
  );

  const projectOptions = useMemo(() => {
    const projectMap = new Map<string, ProjectOption>();
    const appendProject = (path: string, lastActivity: string) => {
      if (!path || pathStartsWith(path, runtimeTempRoot) || isTemporaryChatWorkingDirectory(path)) {
        return;
      }

      const key = normalizePathKey(path);
      const existing = projectMap.get(key);
      const nextActivity = lastActivity || existing?.lastActivity || '';
      projectMap.set(key, {
        name: getProjectDisplayName(path, t),
        path,
        lastActivity: nextActivity,
      });
    };

    appendProject(bootstrap?.workspaceRoot ?? '', '');
    customProjectPaths.forEach((path) => appendProject(path, ''));
    sessions
      .slice()
      .sort((left, right) => Date.parse(right.lastActivity) - Date.parse(left.lastActivity))
      .forEach((session) => appendProject(session.workingDirectory, session.lastActivity));

    return Array.from(projectMap.values()).sort((left, right) => {
      if (!left.lastActivity && !right.lastActivity) return left.name.localeCompare(right.name);
      if (!left.lastActivity) return 1;
      if (!right.lastActivity) return -1;
      return Date.parse(right.lastActivity) - Date.parse(left.lastActivity);
    });
  }, [bootstrap?.workspaceRoot, customProjectPaths, runtimeTempRoot, sessions, t]);

  const topProjectOptions = useMemo(() => projectOptions.slice(0, 3), [projectOptions]);

  const filteredProjectOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return topProjectOptions;
    }

    return projectOptions.filter((project) =>
      project.name.toLowerCase().includes(q) ||
      project.path.toLowerCase().includes(q),
    );
  }, [projectOptions, query, topProjectOptions]);

  const selectedProjectLabel = getProjectDisplayName(selectedProjectPath, t);
  const selectedProjectWorkingDirectory = selectedProjectMode === 'no-project'
    ? getProjectlessTempDirectory(bootstrap?.kurisuRuntime?.runtimeBaseDirectory ?? '', bootstrap?.workspaceRoot ?? '')
    : selectedProjectPath;

  const projectListHeight = useMemo(() => {
    const visibleRowCount = Math.min(3, Math.max(filteredProjectOptions.length, 1));
    const desiredHeight = 16 + (visibleRowCount * 40) + ((visibleRowCount - 1) * 4);
    return Math.min(desiredHeight, Math.max(120, position.maxHeight - 126));
  }, [filteredProjectOptions.length, position.maxHeight]);

  const updatePosition = useCallback(() => {
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    if (!buttonRect) {
      return;
    }

    const menuWidth = Math.min(320, window.innerWidth - 32);
    const desiredLeft = buttonRect.left + (buttonRect.width / 2) - (menuWidth / 2);
    const clampedLeft = Math.min(
      window.innerWidth - 16 - menuWidth,
      Math.max(16, desiredLeft),
    );
    const preferredTop = buttonRect.bottom + 12;
    const maxMenuHeight = 360;
    const minTop = 24;
    const finalTop = Math.max(minTop, Math.min(preferredTop, window.innerHeight - maxMenuHeight - 24));
    setPosition({
      top: finalTop,
      left: clampedLeft,
      width: menuWidth,
      maxHeight: Math.max(220, window.innerHeight - finalTop - 24),
    });
  }, []);

  const toggle = useCallback(() => {
    setQuery('');
    setIsOpen((current) => {
      if (!current) {
        updatePosition();
      }
      return !current;
    });
  }, [updatePosition]);

  const close = useCallback(() => setIsOpen(false), []);

  const selectProject = useCallback((project: ProjectOption) => {
    setSelectedProjectMode('project');
    setSelectedProjectPath(project.path);
    setIsOpen(false);
    setQuery('');
  }, []);

  const addProject = useCallback(async () => {
    const result = await window.kurisuDesktop?.selectProjectDirectory?.();
    if (!result || result.cancelled || !result.selectedPath) {
      return;
    }

    setCustomProjectPaths((current) =>
      current.some((path) => normalizePathKey(path) === normalizePathKey(result.selectedPath))
        ? current
        : [result.selectedPath, ...current],
    );
    setSelectedProjectMode('project');
    setSelectedProjectPath(result.selectedPath);
    setIsOpen(false);
    setQuery('');
  }, []);

  // All effects below sync derived state in response to dependency changes.
  // The React Compiler's lint rule disapproves of synchronous setState in
  // effects, but the picker is a stateful controller that legitimately owns
  // these transitions; suppress the rule for the whole block.
  /* eslint-disable react-hooks/set-state-in-effect */

  useEffect(() => {
    // Auto-close the picker when the sidebar switches to chat mode.
    if (sidebarMode === 'chats' && isOpen) {
      setIsOpen(false);
    }
  }, [sidebarMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!selectedProjectPath) return;

    const fallbackProjectPath =
      bootstrap?.workspaceRoot ??
      sessions.find((session) =>
        !pathStartsWith(session.workingDirectory, runtimeTempRoot) &&
        !isTemporaryChatWorkingDirectory(session.workingDirectory),
      )?.workingDirectory ??
      '';

    if (fallbackProjectPath) {
      setSelectedProjectPath(fallbackProjectPath);
    }
  }, [bootstrap?.workspaceRoot, runtimeTempRoot, selectedProjectPath, sessions]);

  useEffect(() => {
    // Derive the project mode + path from the active session / sidebar mode.
    if (selectedSession?.workingDirectory) {
      if (
        pathStartsWith(selectedSession.workingDirectory, getProjectlessTempDirectory(bootstrap?.kurisuRuntime?.runtimeBaseDirectory ?? '', bootstrap?.workspaceRoot ?? '')) ||
        isTemporaryChatWorkingDirectory(selectedSession.workingDirectory)
      ) {
        if (selectedProjectMode !== 'no-project') {
          setSelectedProjectMode('no-project');
        }
        return;
      }

      if (selectedProjectMode !== 'project') {
        setSelectedProjectMode('project');
      }

      if (normalizePathKey(selectedProjectPath) !== normalizePathKey(selectedSession.workingDirectory)) {
        setSelectedProjectPath(selectedSession.workingDirectory);
      }
      return;
    }

    if (sidebarMode === 'chats') {
      if (selectedProjectMode !== 'no-project') {
        setSelectedProjectMode('no-project');
      }
      return;
    }

    if (selectedProjectMode !== 'project') {
      setSelectedProjectMode('project');
    }
  }, [
    bootstrap?.kurisuRuntime?.runtimeBaseDirectory,
    bootstrap?.workspaceRoot,
    selectedProjectMode,
    selectedProjectPath,
    selectedSession?.workingDirectory,
    sidebarMode,
  ]);

  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    isOpen,
    query,
    position,
    selectedProjectPath,
    selectedProjectMode,
    selectedProjectWorkingDirectory,
    filteredProjectOptions,
    projectListHeight,
    buttonRef,
    menuRef,
    setIsOpen,
    toggle,
    close,
    setQuery,
    selectProject,
    addProject,
    selectedProjectLabel,
  };
}
