# Manual testing

## Members (MySQL)

Needs MySQL with migrations applied (see Migrations) and at least one merchant and one tier row. Start the api: `pnpm start` (listens on `PORT`, default 3000). New members get the tier with the lowest `min_points`.

```sh
# create a member -> 201; the same email again -> 409
# (merchantId must exist in merchants)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' \
  -d '{"name":"An","email":"an@x.com","merchantId":1}'

# list all members
curl -s localhost:3000/members

# get one member
curl -s localhost:3000/members/1

# error path -> 404 {"message":"Member with id 99 not found",...}
curl -s localhost:3000/members/99

# error path -> 400 (id is not an integer)
curl -s localhost:3000/members/abc

# error path -> 400 (name, email and merchantId are required)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' -d '{}'
```

The e2e tests (`pnpm check`) delete all rows in `members`, `tiers` and `merchants`, so run them against a throwaway database only.

## Migrations

```sh
pnpm db:up
set -a; . infra/.env; set +a; export DB_HOST=127.0.0.1

pnpm db:migrate                          # build, then apply pending migrations
pnpm --filter @symbion/api migration:revert   # undo the last migration

docker exec symbion-mysql-1 mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW CREATE TABLE members\G"
```
