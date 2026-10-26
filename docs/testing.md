# Manual testing

## Members (in-memory)

Start the api: `pnpm start` (listens on `PORT`, default 3000).

```sh
# create a member -> 201 {"id":1,"name":"An","email":"an@x.com"}
curl -s -X POST localhost:3000/members -H 'content-type: application/json' \
  -d '{"name":"An","email":"an@x.com"}'

# list all members
curl -s localhost:3000/members

# get one member
curl -s localhost:3000/members/1

# error path -> 404 {"message":"Member with id 99 not found",...}
curl -s localhost:3000/members/99

# error path -> 400 (id is not an integer)
curl -s localhost:3000/members/abc

# error path -> 400 (name and email are required)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' -d '{}'
```

Data lives in memory and is lost on restart.

## Migrations

```sh
pnpm db:up
set -a; . infra/.env; set +a; export DB_HOST=127.0.0.1

pnpm db:migrate                          # build, then apply pending migrations
pnpm --filter @symbion/api migration:revert   # undo the last migration

docker exec symbion-mysql-1 mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW CREATE TABLE members\G"
```
