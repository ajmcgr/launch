-- Update the Onecord custom ad description to 'Your Discord AI Agent'.
-- Covers all monthly slots (Oct 2026 - Feb 2027) of the same campaign.
-- Idempotent: safe to run again; does nothing once applied.

UPDATE sponsored_products
SET custom_description = 'Your Discord AI Agent'
WHERE ad_type = 'custom'
  AND custom_target_url = 'https://onecord.ai'
  AND custom_description IS DISTINCT FROM 'Your Discord AI Agent';

-- Verify (should return 5 rows, all with the new description):
SELECT id, slot_month, custom_title, custom_description
FROM sponsored_products
WHERE custom_target_url = 'https://onecord.ai'
ORDER BY slot_month;
