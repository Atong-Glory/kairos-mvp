-- Migration: Add permissions and invite tracking to project_roles table
-- Purpose: Enforce role-based permissions and track email invitations

-- Add permission column to project_roles (editor or viewer)
ALTER TABLE project_roles 
ADD COLUMN permission_level VARCHAR(20) DEFAULT 'viewer' CHECK (permission_level IN ('viewer', 'editor'));

-- Add invite tracking columns to track email invitations
ALTER TABLE users
ADD COLUMN invite_status VARCHAR(20) DEFAULT 'active' CHECK (invite_status IN ('active', 'invited', 'pending')),
ADD COLUMN invitation_sent_at TIMESTAMPTZ,
ADD COLUMN last_invite_email VARCHAR(255);

-- Create index on permission_level for faster queries
CREATE INDEX idx_project_roles_permission_level ON project_roles(project_id, permission_level);

-- Create index on invite_status for admin queries
CREATE INDEX idx_users_invite_status ON users(tenant_id, invite_status);

-- Add comment for documentation
COMMENT ON COLUMN project_roles.permission_level IS 'Role permission: viewer (read-only) or editor (full access)';
COMMENT ON COLUMN users.invite_status IS 'Track if user was invited: active (joined), invited (invite sent), pending (not yet invited)';
