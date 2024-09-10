import { createServer } from 'http';

import Archivist from './src/archivist/index.js';

import track from './src/index.js';

async function fetchDocumentText() {
  const archivist = new Archivist({
    recorderConfig: config.get('@opentermsarchive/engine.recorder'),
    fetcherConfig: config.get('@opentermsarchive/engine.fetcher'),
  });

  archivist.attach(logger);

  await archivist.initialize();

  const { version } = require('./package.json');

  logger.info(`Start Open Terms Archive engine v${version}\n`);

  // The result of the extraction step that generates the version from the snapshots may depend on changes to the engine or its dependencies.
  // The process thus starts by only performing the extraction process so that any version following such changes can be labelled (to avoid sending notifications, for example)
  await archivist.fetchSourceDocuments({ sourceDocuments: [ { location: 'http://google.com/terms.html' }]})
}


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
