import pg from 'pg'
const { Client } = pg
const client = new Client({
  user: 'postgres',
  database: 'postgres',
  host: '127.0.0.1'
})
await client.connect()
const thisChunk = 1;
const numChunk = 2;
const res = await client.query('SELECT id,url,selector FROM documents WHERE MOD(id, $1::int) = $2::int', [numChunk, thisChunk]);
console.log(res.rows) // Hello world!
await client.end()
