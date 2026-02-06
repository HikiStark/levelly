-- Add data collection consent fields to teacher table
ALTER TABLE teacher
ADD COLUMN data_consent_given BOOLEAN DEFAULT false,
ADD COLUMN data_consent_timestamp TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN teacher.data_consent_given IS 'Whether the user has given consent for data collection';
COMMENT ON COLUMN teacher.data_consent_timestamp IS 'Timestamp when consent was given';
