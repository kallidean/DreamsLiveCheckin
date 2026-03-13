-- Migration 010: Split users.name into first_name + last_name

ALTER TABLE users RENAME COLUMN name TO first_name;
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Split existing data on the first space
UPDATE users
SET
  last_name = CASE
    WHEN POSITION(' ' IN first_name) > 0
    THEN TRIM(SUBSTRING(first_name FROM POSITION(' ' IN first_name) + 1))
    ELSE NULL
  END,
  first_name = CASE
    WHEN POSITION(' ' IN first_name) > 0
    THEN SPLIT_PART(first_name, ' ', 1)
    ELSE first_name
  END
WHERE first_name IS NOT NULL;
