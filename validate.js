import fsApi from 'fs';
import path from 'path';

import Ajv from 'ajv';
// import { expect } from 'chai';
import config from 'config';
import jsonSourceMap from 'json-source-map';

import extract, { ExtractDocumentError } from './src/archivist/extract/index.js';
import fetch, { launchHeadlessBrowser, stopHeadlessBrowser, FetchDocumentError } from './src/archivist/fetcher/index.js';
import * as services from './src/archivist/services/index.js';
import DeclarationUtils from './scripts/declarations/utils/index.js';

import serviceHistorySchema from './scripts/declarations/validate/service.history.schema.js';
import serviceSchema from './scripts/declarations/validate/service.schema.js';

const fs = fsApi.promises;

const MIN_DOC_LENGTH = 100;
const SLOW_DOCUMENT_THRESHOLD = 10 * 1000; // number of milliseconds after which a document fetch is considered slow

const declarationsPath = path.resolve(process.cwd(), config.get('@opentermsarchive/engine.services.declarationsPath'));
const instancePath = path.resolve(declarationsPath, '../');

// see https://stackoverflow.com/a/57599885/680454
export async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}
export function split(arr, n) {
  var res = [];
  while (arr.length) {
    res.push(arr.splice(0, n));
  }
  return res;
}
export const delayMS = (t = 200) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(t);
    }, t);
  });
};
export const throttledPromises = (
  asyncFunction,
  items = [],
  batchSize = 1,
  delay = 0
) => {
  return new Promise(async (resolve, reject) => {
    const output = [];
    const batches= split(items, batchSize);
    await asyncForEach(batches, async (batch) => {
      const promises = batch.map(asyncFunction).map(p => p.catch(reject));
      const results = await Promise.all(promises);
      output.push(...results);
      await delayMS(delay);
    });
    resolve(output);
  });
};

async function validate(serviceId, service, servicesTermsTypes) {
  const schemaOnly = false;
  const termsTypes = [];

  const filePath = path.join(declarationsPath, `${serviceId}.json`);
  const historyFilePath = path.join(declarationsPath, `${serviceId}.history.json`);

  const declaration = JSON.parse(await fs.readFile(filePath));
  try {
    assertValid(serviceSchema, declaration);
  } catch (err) {
    console.log(`FAIL A ${serviceId} schema`);
    return;
  }
  if (!schemaOnly && service) {
    await Promise.all(service.getTermsTypes()
      .filter(termsType => {
        if (!service.terms[termsType]?.latest) { // If this terms type has been deleted and there is only a historical record for it, but no current valid declaration
          return false;
        }

        if (servicesTermsTypes[serviceId] && servicesTermsTypes[serviceId].length > 0) {
          return servicesTermsTypes[serviceId].includes(termsType);
        }

        if (termsTypes.length > 0) {
          return termsTypes.includes(termsType);
        }

        return true;
      })
      .map(async type => {
        const terms = service.getTerms({ type });

        await Promise.all(terms.sourceDocuments.map(async sourceDocument => {
          let filteredContent;
          const { location, executeClientScripts } = sourceDocument;

          try {

            ({ content: sourceDocument.content, mimeType: sourceDocument.mimeType } = await fetch({
              url: location,
              executeClientScripts,
              cssSelectors: sourceDocument.cssSelectors,
              config: config.get('@opentermsarchive/engine.fetcher'),
            }));
            if (!sourceDocument.content) {
              console.log('          [Tests skipped as URL is not fetchable]');
            }

            filteredContent = await extract(sourceDocument);
            console.log(`OK ${serviceId} ${type} ${location} ${filteredContent.length} characters`);
          } catch (err) {
            if (err instanceof FetchDocumentError) {
              console.log(`FAIL B ${serviceId} ${type} fetch ${location}`);
            } else if (err instanceof ExtractDocumentError) {
              console.log(`FAIL C ${serviceId} ${type} extract ${location}`);
            } else {
              console.log(`FAIL D ${serviceId} ${type} other ${location}`);
            }
          }
      }));
    }));
  }
}

async function run (options) {
  let servicesToValidate = options.services || [];
  let servicesTermsTypes = {};

  const serviceDeclarations = await services.loadWithHistory(servicesToValidate);

  if (!servicesToValidate.length) {
    servicesToValidate = Object.keys(serviceDeclarations);
  }

  if (options.modified) {
    const declarationUtils = new DeclarationUtils(instancePath);

    ({ services: servicesToValidate, servicesTermsTypes } = await declarationUtils.getModifiedServicesAndTermsTypes());
  }

  await launchHeadlessBrowser();
  // batched loop over servicesToValidate
  // const promises = throttledPromises()
  servicesToValidate.forEach(async (serviceId) => {
    const service = serviceDeclarations[serviceId];
    return validate(serviceId, service, servicesTermsTypes);
  });
  await stopHeadlessBrowser();
}


const validator = new Ajv({
  allErrors: true,
  jsonPointers: true,
});

function assertValid(schema, subject) {
  const valid = validator.validate(schema, subject);

  if (!valid) {
    const errorPointers = new Set();
    let errorMessage = '';
    const sourceMap = jsonSourceMap.stringify(subject, null, 2);
    const jsonLines = sourceMap.json.split('\n');

    validator.errors.forEach(error => {
      console.log('error', error);
      errorMessage += `\n\n${validator.errorsText([error])}`;
      const errorPointer = sourceMap.pointers[error.dataPath];

      if (errorPointer) {
        errorMessage += `\n> ${jsonLines
          .slice(errorPointer.value.line, errorPointer.valueEnd.line)
          .join('\n> ')}`;
        errorPointers.add(errorPointer);
      } else {
        errorMessage += ' (in entire file)\n';
      }
    });

    errorMessage += `\n\n${errorPointers.size} features have errors in total`;

    throw new Error(errorMessage);
  }
}

//...
run({});