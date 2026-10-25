# Manual testing

## Members (in-memory)

Start the api: `pnpm --filter api start` (listens on `PORT`, default 3000).

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
```

Data lives in memory and is lost on restart.
