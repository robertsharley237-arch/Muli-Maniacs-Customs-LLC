BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::JSONB
    CHECK (jsonb_typeof(images) = 'array');

UPDATE products
SET images = jsonb_build_array(
  jsonb_build_object(
    'url', image,
    'publicId', image_public_id
  )
)
WHERE image <> ''
  AND images = '[]'::JSONB;

COMMIT;
