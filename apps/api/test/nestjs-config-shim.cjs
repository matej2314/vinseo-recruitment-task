'use strict';

/**
 * Jest + Nest 12: barrel `@nestjs/config` pulls CJS ConditionalModule which
 * require()s ESM `@nestjs/common` and hits ERR_REQUIRE_CYCLE_MODULE.
 * Re-export only what this app uses.
 */
const { ConfigModule } = require('@nestjs/config/dist/config.module.js');
const { ConfigService } = require('@nestjs/config/dist/config.service.js');

module.exports = {
  ConfigModule,
  ConfigService,
};
