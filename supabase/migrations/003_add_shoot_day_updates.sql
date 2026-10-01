CREATE TABLE shoot_day_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scene_id UUID NOT NULL CONSTRAINT shoot_day_updates_scene_id_fkey REFERENCES scenes(id) ON DELETE CASCADE,
  shoot_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('status', 'rescheduled')),
  previous_status TEXT CHECK (previous_status IN ('up_next', 'shooting', 'wrapped')),
  new_status TEXT CHECK (new_status IN ('up_next', 'shooting', 'wrapped')),
  previous_date DATE,
  new_date DATE,
  updated_by UUID NOT NULL CONSTRAINT shoot_day_updates_updated_by_fkey REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT shoot_day_updates_event_payload_check CHECK (
    (event_type = 'status' AND new_status IS NOT NULL AND previous_date IS NULL AND new_date IS NULL)
    OR
    (event_type = 'rescheduled' AND new_date IS NOT NULL)
  )
);

CREATE INDEX idx_shoot_day_updates_project_created
  ON shoot_day_updates(project_id, created_at DESC);
CREATE INDEX idx_shoot_day_updates_scene_date_created
  ON shoot_day_updates(scene_id, shoot_date, created_at DESC);

ALTER TABLE shoot_day_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY shoot_day_updates_select_policy ON shoot_day_updates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM project_roles pr
      WHERE pr.project_id = shoot_day_updates.project_id
        AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY shoot_day_updates_insert_policy ON shoot_day_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM project_roles pr
      WHERE pr.project_id = shoot_day_updates.project_id
        AND pr.user_id = auth.uid()
        AND pr.permission_level = 'editor'
    )
  );

CREATE OR REPLACE FUNCTION record_shoot_day_update(
  p_scene_id UUID,
  p_shoot_date DATE,
  p_event_type TEXT,
  p_previous_status TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL,
  p_new_date DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_project_id UUID;
  v_scheduled_date DATE;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to update a shoot day.';
  END IF;

  SELECT project_id, scheduled_date
  INTO v_project_id, v_scheduled_date
  FROM scenes
  WHERE id = p_scene_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Scene not found.';
  END IF;

  IF v_scheduled_date IS DISTINCT FROM p_shoot_date THEN
    RAISE EXCEPTION 'Scene is not scheduled for the selected shoot date.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM project_roles
    WHERE project_id = v_project_id
      AND user_id = v_user_id
      AND permission_level = 'editor'
  ) THEN
    RAISE EXCEPTION 'Only project editors can update a shoot day.';
  END IF;

  IF p_event_type = 'status' THEN
    IF p_new_status IS NULL OR p_new_status NOT IN ('up_next', 'shooting', 'wrapped') THEN
      RAISE EXCEPTION 'Invalid shoot-day status.';
    END IF;

    INSERT INTO shoot_day_updates (
      project_id, scene_id, shoot_date, event_type,
      previous_status, new_status, updated_by
    )
    VALUES (
      v_project_id, p_scene_id, p_shoot_date, 'status',
      p_previous_status, p_new_status, v_user_id
    );
  ELSIF p_event_type = 'rescheduled' THEN
    IF p_new_date IS NULL OR p_new_date = p_shoot_date THEN
      RAISE EXCEPTION 'Choose a different date to reschedule this scene.';
    END IF;

    UPDATE scenes
    SET scheduled_date = p_new_date
    WHERE id = p_scene_id
      AND project_id = v_project_id;

    INSERT INTO shoot_day_updates (
      project_id, scene_id, shoot_date, event_type,
      previous_status, previous_date, new_date, updated_by
    )
    VALUES (
      v_project_id, p_scene_id, p_shoot_date, 'rescheduled',
      p_previous_status, p_shoot_date, p_new_date, v_user_id
    );
  ELSE
    RAISE EXCEPTION 'Invalid shoot-day event type.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION record_shoot_day_update(UUID, DATE, TEXT, TEXT, TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION record_shoot_day_update(UUID, DATE, TEXT, TEXT, TEXT, DATE) TO authenticated;
