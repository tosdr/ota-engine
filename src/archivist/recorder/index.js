import e from 'express';
import RepositoryFactory from './repositories/factory.js';
import Snapshot from './snapshot.js';
import Version from './version.js';

export default class Recorder {
  constructor(config) {
    this.versionsRepository = RepositoryFactory.create(config.versions.storage);
    this.snapshotsRepository = RepositoryFactory.create(config.snapshots.storage);
  }

  initialize() {
    return Promise.all([ this.versionsRepository.initialize(), this.snapshotsRepository.initialize() ]);
  }

  finalize() {
    return Promise.all([ this.versionsRepository.finalize(), this.snapshotsRepository.finalize() ]);
  }

  getLatestSnapshot(terms, sourceDocumentId) {
    let mimeType;
    if (terms.hasMultipleSourceDocuments) {
      terms.sourceDocumentsmap(sourceDocument => {
        if (sourceDocument.id === sourceDocumentId) {
          mimeType = sourceDocument.mimeType;
        }
      });
    } else {
      mimeType = terms.sourceDocuments[0].mimeType;
    }
    console.log('getLatestSnapshot calling findLatest', terms.sourceDocuments, mimeType);
    return this.snapshotsRepository.findLatest(terms.service.id, terms.type, mimeType, terms.hasMultipleSourceDocuments && sourceDocumentId);
  }

  record(record) {
    record.validate();

    switch (record.constructor) { // eslint-disable-line default-case
    case Version:
      return this.versionsRepository.save(record);
    case Snapshot:
      return this.snapshotsRepository.save(record);
    }
  }
}
