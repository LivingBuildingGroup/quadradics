'use strict';

var _require = require('conjunction-junction');

const isPrimitiveNumber = _require.isPrimitiveNumber;


const createFunctionFromCoeffData = data => {

  function emptyFunction() {
    return 0;
  }

  if (!data) {
    return emptyFunction;
  }

  const polyArr = Array.isArray(data.poly) ? data.poly : [];

  function poly(x) {
    let y = 0;
    polyArr.forEach(segment => {
      if (isPrimitiveNumber(segment.k) && isPrimitiveNumber(segment.n)) {
        y += segment.k * Math.pow(x, segment.n);
      } else if (isPrimitiveNumber(segment.c)) {
        y += segment.c;
      }
    });
    return Math.max(y, 0);
  }

  function exp(x) {
    if (isPrimitiveNumber(data.k) && isPrimitiveNumber(data.n)) {
      return data.k * Math.exp(x * data.n);
    }
    return 0;
  }

  function power(x) {
    if (isPrimitiveNumber(data.k) && isPrimitiveNumber(data.n)) {
      return data.k * Math.pow(x, data.n);
    }
    return 0;
  }

  if (data.functionType === 'poly') {
    return poly;
  } else if (data.functionType === 'exp') {
    return exp;
  } else {
    return power;
  }
};

const stringifyCoeff = data => {

  if (!data) {
    return 'Error: no data!';
  }

  if (data.functionType === 'poly' && Array.isArray(data.poly)) {
    let string = 'Polynomial: ';
    data.poly.forEach((segment, i) => {
      const operator = i > 0 ? ' + ' : '';
      if (isPrimitiveNumber(segment.k) && isPrimitiveNumber(segment.n)) {
        string += `${operator}${segment.k} * (x^${segment.n})`;
      } else if (isPrimitiveNumber(segment.c)) {
        string += `${operator}${segment.c}`;
      }
    });
    return string;
  } else if (data.functionType === 'exp') {
    const string = `Exponential: ${data.k} * e(x * ${data.n})`;
    return string;
  } else if (data.functionType === 'power') {
    const string = `Power: ${data.k} * (x ^ ${data.n})`;
    return string;
  }
  return 'Error: unable to read function!';
};

const createCoeffKey = (raw, complete, parser, type) => {
  const coeffs = {};

  if (!raw || !Array.isArray(raw.rows)) {
    return coeffs;
  }

  raw.rows.forEach(join => {

    const value = join.value;

    const coeff = {};

    parser(value, type, (err, value) => {
      if (err) {
        coeff.message = 'not parsed';
      } else if (value.coeff) {
        for (let k in value.coeff) {
          coeff[k] = value.coeff[k];
        }
      }
    });
    if (!coeffs[join.join_type]) {
      coeffs[join.join_type] = {};
    }
    if (Array.isArray(join.names_versions)) {
      join.names_versions.forEach(v => {
        if (!coeffs[join.join_type][v]) {
          coeffs[join.join_type][v] = {};
        }
        if (!coeffs[join.join_type][v][join.profile_code]) {
          coeffs[join.join_type][v][join.profile_code] = {};
        }
        const boilerplate = {
          namesVersions: join.names_versions,
          joinType: join.join_type,
          notes: join.notes,
          string: stringifyCoeff(coeff)
        };
        if (complete) {
          boilerplate.id = join.id;
          boilerplate.timestampCreated = join.timestamp_created;
          boilerplate.profileCode = join.profile_code;
          boilerplate.idJoin = join.id_join;
          boilerplate.idTestLo = join.id_test_lo;
          boilerplate.idTestHi = join.id_test_hi;
        }
        coeffs[join.join_type][v][join.profile_code][coeff.functionType] = Object.assign({}, coeff, boilerplate);
      });
    }
  });
  return coeffs;
};

const baseCodesToTry = [
// one of the following keys should match
// a key from coeffKey.iFromQ
// e.g. 20+20x10
// these are ONLY the MW + HCht x HCdia combo
// the 10T is rounded to 10mm (HC dia to 5mm)
// 20T is rounded to 20mm (HC dia to 5mm)
// in these codes:
// MW thickness max is 20mm (so only 0mm and 20mm)
// HC thickness max is 80mm (so only 0mm to 80mm range)
// more than max = max
'profileCode10T', // best fit
'profile_code_10_t', // same snake
'profileCode20T', // ok fit
'profile_code_20_t'];

const profileCodesToTry = ['profileCodeExact', // best fit
'profile_code_exact', 'profileCodeExactNvg', 'profile_code_exact_nvg', 'profileCode5Nvg', 'profile_code_5_nvg', 'profileCode10Nvg', 'profile_code_10_nvg', 'profileCode20Nvg', // ok fit
'profile_code_20_nvg'];

const profileCodesToTryByJoinTypes = {
  iFromQ: baseCodesToTry,
  qFromI: baseCodesToTry,
  iFromS: profileCodesToTry
};

const createCoeffData = (joinType, thisProfile, coeffKey, versions) => {

  const _versions = Array.isArray(versions) ? versions : [];
  let data;

  if (!profileCodesToTryByJoinTypes) {
    return [];
  }

  const codesToTry = profileCodesToTryByJoinTypes[joinType] || [];

  codesToTry.forEach(c => {
    // go in order
    const profileCode = thisProfile[c];

    if (profileCode) {
      // don't check if not found
      _versions.forEach(v => {
        // versions should list either only the current version, or list all versions from preferable to least preferable
        if (!data) {
          // if already found (better fit), don't look anymore
          if (coeffKey[joinType] && coeffKey[joinType][v] && coeffKey[joinType][v][profileCode]) {

            const thisData = coeffKey[joinType][v][profileCode];

            data = thisData.poly && !Array.isArray(thisData.poly) ? thisData.poly : thisData.exp ? thisData.exp : thisData.power ? thisData.power : thisData;

            data.matchFound = `${c} = ${profileCode}`;
          }
        }
      });
    }
  });

  if (data) {
    data.predict = createFunctionFromCoeffData(data);
  }

  return data;
};

const formatCoeffArr = coeffKey => {
  let hash = {
    iFromS: {
      power: [],
      poly: [],
      exp: [],
      other: []
    },
    iFromQ: {
      power: [],
      poly: [],
      exp: [],
      other: []
    },
    qFromI: {
      power: [],
      poly: [],
      exp: [],
      other: []
    }
  };

  const ids = {};

  for (let joinType in coeffKey) {
    if (!hash[joinType]) {
      hash[joinType] = {};
    }
    for (let version in coeffKey[joinType]) {
      for (let profileCode in coeffKey[joinType][version]) {
        for (let functionType in coeffKey[joinType][version][profileCode]) {
          const value = coeffKey[joinType][version][profileCode][functionType];
          if (Array.isArray(hash[joinType][functionType]) && !ids[`${value.id}`]) {
            hash[joinType][functionType].push(value);
            ids[`${value.id}`] = true;
          } else if (!ids[`${value.id}`]) {
            hash[joinType].other.push(value);
            ids[`${value.id}`] = true;
          }
        }
      }
    }
  }

  for (let joinType in hash) {
    for (let functionType in hash[joinType]) {
      if (Array.isArray(hash[joinType][functionType])) {
        hash[joinType][functionType].sort((a, b) => {
          if (a.id > b.id) {
            return 1;
          }
          if (a.id < b.id) {
            return -1;
          }
          return 0;
        });
      }
    }
  }

  const arr = [...hash.iFromS.power, ...hash.iFromS.poly, ...hash.iFromS.exp, ...hash.iFromS.other, ...hash.iFromQ.power, ...hash.iFromQ.poly, ...hash.iFromQ.exp, ...hash.iFromQ.other, ...hash.qFromI.power, ...hash.qFromI.poly, ...hash.qFromI.exp, ...hash.qFromI.other];

  return arr;
};

module.exports = {
  createFunctionFromCoeffData,
  stringifyCoeff,
  createCoeffKey,
  createCoeffData,
  formatCoeffArr
};