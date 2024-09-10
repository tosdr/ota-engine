import { createServer } from 'http';

import track from './src/index.js';

createServer(async (req, res) => {
  // eslint-disable-next-line no-unused-vars
  let body = '';

  req.on('data', chunk => {
    body += chunk;
  });
  req.on('end', async () => {
    res.write(body);
    const options = JSON.parse(body);

    console.log(options);

    await track(options);
    res.write('done');
    res.end();
  });
}).listen(3000);
console.log('listening on port 3000');
