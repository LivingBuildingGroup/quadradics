'use strict';

const coeffFunctions    = require('./build/coeff-functions');
const linearReservoir   = require('./build/linear-reservoir');
const nse               = require('./build/nse');
const regression        = require('./build/regression');
const regressionProcess = require('./build/regression-process');

module.exports = Object.assign({},
  coeffFunctions,
  linearReservoir,
  nse,
  regression,
  regressionProcess
);