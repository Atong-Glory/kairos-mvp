import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type PermissionLevel = 'viewer' | 'editor' | null;

interface ProjectPermissions {
  [projectId: string]: PermissionLevel;
}

type PermissionsContextType = {
  permissions: ProjectPermissions;
  isEditor: (projectId: string) => boolean;
  isViewer: (projectId: string) => boolean;
  hasAnyAccess: (projectId: string) => boolean;
  refreshPermissions: (projectId: string) => Promise<void>;
  loading: boolean;
};

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: {},
  isEditor: () => false,
  isViewer: () => false,
  hasAnyAccess: () => false,
  refreshPermissions: async () => {},
  loading: false,
});

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<ProjectPermissions>({});
  const [loading, setLoading] = useState(false);

  // Check permission for a specific project
  const checkPermission = useCallback(
    async (projectId: string): Promise<PermissionLevel> => {
      if (!user?.id) return null;

      try {
        const cachedPermission = permissions[projectId];
        if (cachedPermission !== undefined) {
          return cachedPermission;
        }

        const { data, error } = await supabase
          .from('project_roles')
          .select('permission_level')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          setPermissions(prev => ({ ...prev, [projectId]: null }));
          return null;
        }

        const level = (data.permission_level as PermissionLevel) || null;
        setPermissions(prev => ({ ...prev, [projectId]: level }));
        return level;
      } catch (err) {
        console.error('Error checking permission:', err);
        return null;
      }
    },
    [user?.id, permissions]
  );

  // Refresh permissions for a specific project
  const refreshPermissions = useCallback(
    async (projectId: string) => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('project_roles')
          .select('permission_level')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          setPermissions(prev => ({ ...prev, [projectId]: null }));
        } else {
          const level = (data.permission_level as PermissionLevel) || null;
          setPermissions(prev => ({ ...prev, [projectId]: level }));
        }
      } catch (err) {
        console.error('Error refreshing permissions:', err);
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Helper functions
  const isEditor = useCallback(
    (projectId: string): boolean => {
      return permissions[projectId] === 'editor';
    },
    [permissions]
  );

  const isViewer = useCallback(
    (projectId: string): boolean => {
      return permissions[projectId] === 'viewer';
    },
    [permissions]
  );

  const hasAnyAccess = useCallback(
    (projectId: string): boolean => {
      const level = permissions[projectId];
      return level === 'editor' || level === 'viewer';
    },
    [permissions]
  );

  return (
    <PermissionsContext.Provider
      value={{
        permissions,
        isEditor,
        isViewer,
        hasAnyAccess,
        refreshPermissions,
        loading,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return context;
};
