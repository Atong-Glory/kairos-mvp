-- Row Level Security (RLS) Policies for Permission Enforcement
-- These policies enforce role-based access control at the database level

-- Enable RLS on relevant tables
ALTER TABLE call_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE storyboard_images ENABLE ROW LEVEL SECURITY;

-- =======================
-- CALL SHEETS: Policy for Read Access (Viewers can read)
-- =======================
CREATE POLICY "call_sheets_select_policy" ON call_sheets
  FOR SELECT
  TO authenticated
  USING (
    -- User is part of the project's team
    EXISTS (
      SELECT 1 FROM project_roles pr
      WHERE pr.project_id = call_sheets.project_id
      AND pr.user_id = auth.uid()
    )
  );

-- =======================
-- CALL SHEETS: Policy for Write Access (Only Editors)
-- =======================
CREATE POLICY "call_sheets_write_policy" ON call_sheets
  FOR INSERT, UPDATE
  TO authenticated
  WITH CHECK (
    -- User must be an editor in this project
    EXISTS (
      SELECT 1 FROM project_roles pr
      WHERE pr.project_id = call_sheets.project_id
      AND pr.user_id = auth.uid()
      AND pr.permission_level = 'editor'
    )
  );

-- =======================
-- BUDGET ITEMS: Policy for Read Access
-- =======================
CREATE POLICY "budget_items_select_policy" ON budget_items
  FOR SELECT
  TO authenticated
  USING (
    -- User is part of the project's team
    EXISTS (
      SELECT 1 FROM project_roles pr
      WHERE pr.project_id = budget_items.project_id
      AND pr.user_id = auth.uid()
    )
  );

-- =======================
-- BUDGET ITEMS: Policy for Write Access (Only Editors)
-- =======================
CREATE POLICY "budget_items_write_policy" ON budget_items
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  WITH CHECK (
    -- User must be an editor in this project
    EXISTS (
      SELECT 1 FROM project_roles pr
      WHERE pr.project_id = budget_items.project_id
      AND pr.user_id = auth.uid()
      AND pr.permission_level = 'editor'
    )
  );

-- =======================
-- STORYBOARD IMAGES: Policy for Read Access
-- =======================
CREATE POLICY "storyboard_images_select_policy" ON storyboard_images
  FOR SELECT
  TO authenticated
  USING (
    -- User is part of the project's team
    EXISTS (
      SELECT 1 FROM project_roles pr
      WHERE pr.project_id = storyboard_images.project_id
      AND pr.user_id = auth.uid()
    )
  );

-- =======================
-- STORYBOARD IMAGES: Policy for Write Access (Only Editors)
-- =======================
CREATE POLICY "storyboard_images_write_policy" ON storyboard_images
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  WITH CHECK (
    -- User must be an editor in this project
    EXISTS (
      SELECT 1 FROM project_roles pr
      WHERE pr.project_id = storyboard_images.project_id
      AND pr.user_id = auth.uid()
      AND pr.permission_level = 'editor'
    )
  );
