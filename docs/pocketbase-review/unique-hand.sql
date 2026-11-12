-- REVIEW ONLY. Do not run against production without approved schema change.
-- Validate PB version/schema and back up first. Register this index in the
-- PocketBase collection's indexes via a version-compatible migration, rather
-- than executing ad hoc SQL on a running PB database.
-- Existing duplicates make CREATE UNIQUE INDEX fail; never delete them here.
CREATE UNIQUE INDEX idx_v186_game_hands_session_number
ON game_hands (session, hand_number)
WHERE session != '' AND hand_number > 0;
