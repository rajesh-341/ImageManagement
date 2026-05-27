-- Performance indexes for image_management table
CREATE INDEX IF NOT EXISTS idx_image_management_folder_name ON image_management (folder_name);
CREATE INDEX IF NOT EXISTS idx_image_management_created_at ON image_management (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_image_management_employee_id ON image_management (employee_id);
CREATE INDEX IF NOT EXISTS idx_image_management_image_data_gin ON image_management USING GIN (image_data jsonb_path_ops);

-- Indexes for folders table
CREATE INDEX IF NOT EXISTS idx_folders_name ON folders (name);
CREATE INDEX IF NOT EXISTS idx_folders_scope ON folders (scope);
CREATE INDEX IF NOT EXISTS idx_folders_created_at ON folders (created_at DESC);

-- Index for employee_details
CREATE INDEX IF NOT EXISTS idx_employee_details_employee_id ON employee_details (employee_id);

-- Index for favorite_folder_mapping
CREATE INDEX IF NOT EXISTS idx_favorite_folder_mapping_user ON favorite_folder_mapping (user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_folder_mapping_folder ON favorite_folder_mapping (folder_id);

-- Partial index for active images
CREATE INDEX IF NOT EXISTS idx_image_management_active ON image_management (id) WHERE image_data->>'imageUrl' IS NOT NULL;
