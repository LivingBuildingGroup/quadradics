'use strict';

const { isPrimitiveNumber } = require('conjunction-junction');

const findIndexStartOfSubArray = input => {
  const {
    dataType1, 
    startUser,
    indexEndFromUser, 
    observeKeyX,
    observeKeyY,
  } = input;

  let indexStart = dataType1.length;
  const messages = [];

  dataType1.forEach((d,i)=>{
    // if we are within the user-specified range
    // but x or y are 0 values
    // leave the end as specified, but shorten
    // the start to start after zeros
    if(i >= startUser && i < indexEndFromUser){
      if(!isPrimitiveNumber(d[observeKeyX])){
        messages.push(`x is ${d[observeKeyX]}, not a number at index ${i}`);
      } else if(!isPrimitiveNumber(d[observeKeyY])){
        messages.push(`y is ${d[observeKeyY]}, not a number at index ${i}`);
      } else if(d[observeKeyX] <= 0){
        messages.push(`x is ${d[observeKeyX]}, not a positive number at index ${i}`);
      } else if(d[observeKeyY] <= 0){
        messages.push(`y is ${d[observeKeyY]}, not a positive number at index ${i}`);
      } else {
        indexStart = Math.min(indexStart, i);
      }
    }
  });
      
  return {
    indexStart,
    messagesStart: messages,
  };
};

const findIndexEndOfSubArray = input => {
  const {
    dataType1, 
    indexStart, 
    indexEndFromUser,
    observeKeyX,
    observeKeyY,
  } = input;

  let indexEnd = indexEndFromUser;
  const messages = [];

  dataType1.forEach((d,i)=>{
    // if we are within the user-specified range
    // but x or y are 0 values
    // leave the end as specified, but shorten
    // the start to start after zeros
    if(i >= indexStart && i < indexEnd){
      if(!isPrimitiveNumber(d[observeKeyX])){
        messages.push(`x is ${d[observeKeyX]}, not a number at index ${i}`);
        indexEnd = Math.min(indexEnd, i);
      } else if(!isPrimitiveNumber(d[observeKeyY])){
        messages.push(`y is ${d[observeKeyY]}, not a number at index ${i}`);
        indexEnd = Math.min(indexEnd, i);
      } else if(d[observeKeyX] <= 0){
        messages.push(`x is ${d[observeKeyX]}, not a positive number at index ${i}`);
        indexEnd = Math.min(indexEnd, i);
      } else if(d[observeKeyY] <= 0){
        messages.push(`y is ${d[observeKeyY]}, not a positive number at index ${i}`);
        indexEnd = Math.min(indexEnd, i);
      }
    }
  });
      
  return {
    indexEnd,
    messagesEnd: messages,
  };
};

const determineIndicesOfSubArray = input => {
  const {
    indexStart,
    messagesStart
  } = findIndexStartOfSubArray(input);

  const {
    indexEnd,
    messagesEnd
  } = findIndexEndOfSubArray(Object.assign({},
    input,
    {
      indexStart
    }
  ));

  const messages = [];
  if(messagesStart.length > 0){
    messages.push('START:');
    messages.push(...messagesStart);
  }
  if(messagesEnd.length > 0){
    messages.push('END:');
    messages.push(...messagesEnd);
  }

  return {
    indexStart,
    indexEnd,
    messages,
  };
};

const fitSubArrayToDataType1 = input => {

  const {
    predictKeyY, 
    indexStart, 
    indexEnd, 
    regressionPointsSubArray, 
    dataType1,
  } = input;

  const nulls = [];
  let i=0;
  while(i<indexStart){
    nulls.push(null);
    i++;
  }

  const regressionPointsSubArrayWithConformedStart = Array.isArray(regressionPointsSubArray) ? 
    [...nulls, ...regressionPointsSubArray] : [];

  const dataType1WithPrediction = dataType1.map((d,i)=>{
    const predictYValue = i<indexStart || i>= indexEnd ?
      null :
      Array.isArray(regressionPointsSubArrayWithConformedStart[i]) &&
      isPrimitiveNumber(regressionPointsSubArrayWithConformedStart[i][1]) ?
        regressionPointsSubArrayWithConformedStart[i][1] : 
        null ;
    return Object.assign({},
      d,
      {
        [predictKeyY]: predictYValue,
      }
    );
  });
  if(!dataType1WithPrediction[0][predictKeyY]){
    dataType1WithPrediction[0][predictKeyY] = null; // graph selectors populate based on FIRST item in array
  }
  return dataType1WithPrediction;
};

module.exports = {
  findIndexStartOfSubArray,
  findIndexEndOfSubArray,
  determineIndicesOfSubArray,
  fitSubArrayToDataType1,
};