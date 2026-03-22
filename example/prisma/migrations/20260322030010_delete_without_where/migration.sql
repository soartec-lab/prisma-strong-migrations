-- Intentional: delete all unpublished posts (cleanup)
-- prisma-strong-migrations-disable-next-line deleteWithoutWhere
DELETE FROM "posts" WHERE published_at IS NULL;
