#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3000';

yargs(hideBin(process.argv))
  .scriptName("levo")
  .command(
    'import',
    'Import an OpenAPI spec',
    (yargs) => {
      return yargs
        .option('spec', {
          alias: 's',
          type: 'string',
          description: 'Path to the OpenAPI spec file',
          demandOption: true,
        })
        .option('application', {
          alias: 'a',
          type: 'string',
          description: 'The application name',
          demandOption: true,
        })
        .option('service', {
          type: 'string',
          description: 'The service name (optional)',
        });
    },
    async (argv) => {
      const { spec, application, service } = argv;

      if (!fs.existsSync(spec)) {
        console.error(`Error: File not found at ${path.resolve(spec)}`);
        process.exit(1);
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(spec));
      form.append('application', application);
      if (service) {
        form.append('service', service);
      }

      try {
        const response = await axios.post(`${API_URL}/upload`, form, {
          headers: form.getHeaders(),
        });
        console.log('✅ Upload successful:');
        console.log(response.data);
      } catch (error: any) {
        console.error('❌ Upload failed:');
        console.error(error.response ? error.response.data : error.message);
      }
    },
  )
  .command(
    'get',
    'Get a schema',
    (yargs) => {
      return yargs
        .option('application', {
          alias: 'a',
          type: 'string',
          description: 'The application name',
          demandOption: true,
        })
        .option('service', {
          type: 'string',
          description: 'The service name (optional)',
        })
        .option('schema-version', { // <-- RENAMED from 'version'
          alias: 'v',
          type: 'string',
          description: 'The version to fetch (e.g., "latest" or a number)',
          default: 'latest',
        });
    },
    async (argv) => {
      // yargs camelCases schema-version to schemaVersion
      const { application, service, schemaVersion } = argv;
      const params = new URLSearchParams({
        application,
        version: schemaVersion, // Pass it as 'version' in the query
      });
      if (service) {
        params.append('service', service);
      }

      try {
        const response = await axios.get(`${API_URL}/schema?${params.toString()}`);
        console.log('✅ Schema details:');
        console.log(response.data);
      } catch (error: any) {
        console.error('❌ Failed to get schema:');
        console.error(error.response ? error.response.data : error.message);
      }
    },
  )
  .demandCommand(1, 'You need to provide a command (import or get).')
  .help()
  .strict().argv;