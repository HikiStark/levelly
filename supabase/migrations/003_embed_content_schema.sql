-- Migration: Add embedded content support for level redirects
-- This allows teachers to configure either external links OR embedded content (H5P, iframes)
-- per student level

-- Add columns to level_redirect for embedded content support
ALTER TABLE level_redirect
ADD COLUMN redirect_type TEXT DEFAULT 'link' CHECK (redirect_type IN ('link', 'embed'));

ALTER TABLE level_redirect
ADD COLUMN embed_code TEXT;

-- Make redirect_url nullable (not required for embed type)
ALTER TABLE level_redirect
ALTER COLUMN redirect_url DROP NOT NULL;

-- Add constraint: require appropriate field based on type
-- For 'link' type: redirect_url must be set
-- For 'embed' type: embed_code must be set
ALTER TABLE level_redirect
ADD CONSTRAINT check_redirect_content CHECK (
  (redirect_type = 'link' AND redirect_url IS NOT NULL AND redirect_url != '') OR
  (redirect_type = 'embed' AND embed_code IS NOT NULL AND embed_code != '')
);

-- Update existing rows to have redirect_type = 'link' (already set by DEFAULT, but explicit)
UPDATE level_redirect SET redirect_type = 'link' WHERE redirect_type IS NULL;
