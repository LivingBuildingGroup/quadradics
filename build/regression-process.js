'use strict';

var _require = require('conjunction-junction');

const isPrimitiveNumber = _require.isPrimitiveNumber;


const findIndexStartOfSubArray = input => {
  const dataType1 = input.dataType1,
        startUser = input.startUser,
        indexEndFromUser = input.indexEndFromUser,
        observeKeyX = input.observeKeyX,
        observeKeyY = input.observeKeyY;


  let indexStart = dataType1.length;
  const messages = [];

  dataType1.forEach((d, i) => {
    // if we are within the user-specified range
    // but x or y are 0 values
    // leave the end as specified, but shorten
    // the start to start after zeros
    if (i >= startUser && i < indexEndFromUser) {
      if (!isPrimitiveNumber(d[observeKeyX])) {
        messages.push(`x is ${d[observeKeyX]}, not a number at index ${i}`);
      } else if (!isPrimitiveNumber(d[observeKeyY])) {
        messages.push(`y is ${d[observeKeyY]}, not a number at index ${i}`);
      } else if (d[observeKeyX] <= 0) {
        messages.push(`x is ${d[observeKeyX]}, not a positive number at index ${i}`);
      } else if (d[observeKeyY] <= 0) {
        messages.push(`y is ${d[observeKeyY]}, not a positive number at index ${i}`);
      } else {
        indexStart = Math.min(indexStart, i);
      }
    }
  });

  return {
    indexStart,
    messagesStart: messages
  };
};

const findIndexEndOfSubArray = input => {
  const dataType1 = input.dataType1,
        indexStart = input.indexStart,
        indexEndFromUser = input.indexEndFromUser,
        observeKeyX = input.observeKeyX,
        observeKeyY = input.observeKeyY;


  let indexEnd = indexEndFromUser;
  const messages = [];

  dataType1.forEach((d, i) => {
    // if we are within the user-specified range
    // but x or y are 0 values
    // leave the end as specified, but shorten
    // the start to start after zeros
    if (i >= indexStart && i < indexEnd) {
      if (!isPrimitiveNumber(d[observeKeyX])) {
        messages.push(`x is ${d[observeKeyX]}, not a number at index ${i}`);
        indexEnd = Math.min(indexEnd, i);
      } else if (!isPrimitiveNumber(d[observeKeyY])) {
        messages.push(`y is ${d[observeKeyY]}, not a number at index ${i}`);
        indexEnd = Math.min(indexEnd, i);
      } else if (d[observeKeyX] <= 0) {
        messages.push(`x is ${d[observeKeyX]}, not a positive number at index ${i}`);
        indexEnd = Math.min(indexEnd, i);
      } else if (d[observeKeyY] <= 0) {
        messages.push(`y is ${d[observeKeyY]}, not a positive number at index ${i}`);
        indexEnd = Math.min(indexEnd, i);
      }
    }
  });

  return {
    indexEnd,
    messagesEnd: messages
  };
};

const determineIndicesOfSubArray = input => {
  var _findIndexStartOfSubA = findIndexStartOfSubArray(input);

  const indexStart = _findIndexStartOfSubA.indexStart,
        messagesStart = _findIndexStartOfSubA.messagesStart;

  var _findIndexEndOfSubArr = findIndexEndOfSubArray(Object.assign({}, input, {
    indexStart
  }));

  const indexEnd = _findIndexEndOfSubArr.indexEnd,
        messagesEnd = _findIndexEndOfSubArr.messagesEnd;


  const messages = [];
  if (messagesStart.length > 0) {
    messages.push('START:');
    messages.push(...messagesStart);
  }
  if (messagesEnd.length > 0) {
    messages.push('END:');
    messages.push(...messagesEnd);
  }

  return {
    indexStart,
    indexEnd,
    messages
  };
};

const fitSubArrayToDataType1 = input => {
  const predictKeyY = input.predictKeyY,
        indexStart = input.indexStart,
        indexEnd = input.indexEnd,
        regressionPointsSubArray = input.regressionPointsSubArray,
        dataType1 = input.dataType1;


  const nulls = [];
  let i = 0;
  while (i < indexStart) {
    nulls.push(null);
    i++;
  }

  const regressionPointsSubArrayWithConformedStart = Array.isArray(regressionPointsSubArray) ? [...nulls, ...regressionPointsSubArray] : [];

  const dataType1WithPrediction = dataType1.map((d, i) => {
    const predictYValue = i < indexStart || i >= indexEnd ? null : Array.isArray(regressionPointsSubArrayWithConformedStart[i]) && isPrimitiveNumber(regressionPointsSubArrayWithConformedStart[i][1]) ? regressionPointsSubArrayWithConformedStart[i][1] : null;
    return Object.assign({}, d, {
      [predictKeyY]: predictYValue
    });
  });
  if (!dataType1WithPrediction[0][predictKeyY]) {
    dataType1WithPrediction[0][predictKeyY] = null; // graph selectors populate based on FIRST item in array
  }
  return dataType1WithPrediction;
};

module.exports = {
  findIndexStartOfSubArray,
  findIndexEndOfSubArray,
  determineIndicesOfSubArray,
  fitSubArrayToDataType1
};