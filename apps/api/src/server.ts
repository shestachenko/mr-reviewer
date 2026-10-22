import {build} from './app.js';

const {app, config} = await build();

await app.listen({port: config.port, host: config.host});
