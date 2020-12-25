'use strict';

const { 
  isPrimitiveNumber,
  titleCaseWord,
  precisionRound } = require('conjunction-junction');
const math         = require('mathjs');
const { calcNse }  = require('./nse');
const {
  determineIndicesOfSubArray,
  fitSubArrayToDataType1 } = require('./regression-process');

const getFlowStats = input => {

  const {
    dataType1WithPrediction, 
    observeKeyX, 
    predictKeyX,
    observeKeyY, 
    predictKeyY,
    indexStart,
    indexEnd,
  } = input;

  // console.log('observeKeyY',observeKeyY,'predictKeyY',predictKeyY)
  const dataSliced = Array.isArray(dataType1WithPrediction) ?
    dataType1WithPrediction.slice(indexStart, indexEnd) : [];   

  let runoffDrainMmTotalPredict = 0;
  let runoffDrainMmTotal  = 0;
  let runoffDrainPeakRateMmPredict  = 0;
  let runoffDrainPeakRateMm   = 0;
  let runoffDrainMeanMmPredict  = 0;
  let runoffDrainMeanMm   = 0;
  let absorbPeakMmTotal = 0;
  let absorbPeakMmTotalPredict = 0;

  // console.log('dataSliced',dataSliced)
  const flowMeanArr = dataSliced.map((d,i)=>{
    if(!d[observeKeyY] && d[observeKeyY] !== 0){
      console.error('observeKeyY',observeKeyY,'is missing at index', i);
    }
    if(!d[predictKeyY] && d[predictKeyY] !== 0){
      console.error('predictKeyY',predictKeyY,'is missing at index', i);
    }
    const mmHrObserve = d && isPrimitiveNumber(d[observeKeyY]) ?
      d[observeKeyY] : 0;
    const mmHrPredict = d && isPrimitiveNumber(d[predictKeyY]) ?
      d[predictKeyY] : 0;

    const mmObserve = precisionRound(mmHrObserve/60,4);
    const mmPredict = precisionRound(mmHrPredict/60,4);
      
    runoffDrainPeakRateMm  = Math.max(runoffDrainPeakRateMm, mmObserve);
    runoffDrainPeakRateMmPredict = Math.max(runoffDrainPeakRateMmPredict, mmPredict);

    runoffDrainMmTotalPredict += mmPredict;
    runoffDrainMmTotal  += mmObserve;

    const mmAbsorbObserve = d && isPrimitiveNumber(d[observeKeyX]) ?
      d[observeKeyX] : 0;
    const mmAbsorbPredict = d && isPrimitiveNumber(d[predictKeyX]) ?
      d[predictKeyX] : 0;

    absorbPeakMmTotal = Math.max(absorbPeakMmTotal, mmAbsorbObserve);
    absorbPeakMmTotalPredict = Math.max(absorbPeakMmTotalPredict, mmAbsorbPredict);

    return {
      mmObserve, 
      mmPredict
    };
  });

  const flowMeanObserveArr = flowMeanArr.map(d=>d.mmObserve);
  const flowMeanPredictArr = flowMeanArr.map(d=>d.mmPredict);

  // console.log('subset',subset,'flowMeanArr [mmObserve, mmPredict]',flowMeanArr);
  runoffDrainMeanMm         = flowMeanObserveArr.length>0 ?
    math.mean(flowMeanObserveArr) : NaN ;
  runoffDrainMeanMmPredict = flowMeanPredictArr.length>0 ?
    math.mean(flowMeanPredictArr) : NaN ;

  return {
    runoffDrainMmTotal,
    runoffDrainMmTotalPredict,

    runoffDrainPeakRateMm,
    runoffDrainPeakRateMmPredict,

    runoffDrainMeanMm,
    runoffDrainMeanMmPredict,

    absorbPeakMmTotal,
    absorbPeakMmTotalPredict,
  };
};

const calcObserveRegression = input => {

  const {
    idTest,
    dataType1,
    observeKeyX,
    observeKeyY,
    startUser,
    indexEndFromUser,
    subset,
    precision,
    regressionMethod,
    regressionFunction,
  } = input;

  const predictKeyY = `${observeKeyY}${titleCaseWord(regressionMethod)}${subset ? `${titleCaseWord(subset)}`: 'All'}`; // change this on the server IF we want to save it
  const predictKeyX = `${observeKeyX}${titleCaseWord(regressionMethod)}${subset ? `${titleCaseWord(subset)}`: 'All'}`; // change this on the server IF we want to save it

  const {
    indexStart,
    indexEnd,
    messages,
  } = determineIndicesOfSubArray({
    dataType1, 
    startUser, 
    indexEndFromUser,
    observeKeyX,
    observeKeyY,
  });

  const dataSliced = dataType1.slice(indexStart, indexEnd);

  if(dataSliced.length <= 3){
    const errorMessage = `There are only ${dataSliced.length} data points for test ${idTest} method ${regressionMethod} subset ${subset}. Regression aborting.`;
    return {errorMessage};
  }

  const data = dataSliced.map(d=>{
    return [d[observeKeyX], d[observeKeyY]];
  });
  // console.log('subset',subset,`data to send to regression: [${observeKeyX},${observeKeyY}]`,data);

  const options = {
    order: 2, 
    precision,
  };
  const regressionResult = regressionFunction(data, options);

  // console.log('subset',subset,'observeKeyY',observeKeyY,'regressionResult',regressionResult);

  const dataType1WithPrediction = fitSubArrayToDataType1({
    subset,
    predictKeyY,
    indexStart,
    indexEnd,
    regressionPointsSubArray: regressionResult.points,
    dataType1,
  });

  const {
    runoffDrainMmTotal,
    runoffDrainMmTotalPredict,

    runoffDrainPeakRateMm,
    runoffDrainPeakRateMmPredict,

    runoffDrainMeanMm,
    runoffDrainMeanMmPredict,
  } = getFlowStats({
    regressionMethod,
    dataType1WithPrediction, 
    observeKeyY, 
    predictKeyY,
    indexStart,
    indexEnd,
  });

  const {
    nse,
  } = calcNse({
    dataType1WithPrediction, 
    observeKeyY, 
    predictKeyY,
    indexStart,
    indexEnd,
    runoffDrainMeanMm,
  });

  const observeRegression = {
    subset, 
    regressionMethod: regressionMethod,

    messages, // messages about start and end
    indexStart,
    indexEnd,

    k:  regressionResult.k,
    n:  regressionResult.n,
    r2: regressionResult.r2,
    regressionString: regressionResult.string,
    
    observeKeyX: observeKeyX,
    absorbPeakMmTotal: '',
    absorbPeakMmTotalPredict: '',
    predictKeyX: predictKeyX,

    observeKeyY: observeKeyY,
    runoffDrainMmTotal,
    runoffDrainMmTotalPredict,
    predictKeyY: predictKeyY,

    runoffDrainPeakRateMm,
    runoffDrainPeakRateMmPredict,
      
    runoffDrainMeanMm,
    runoffDrainMeanMmPredict,

    nse,

    pointsRaw: regressionResult.points,
    dataType1WithPrediction,
    predict: regressionResult.predict,
  };

  return observeRegression;
};

const predictLinearReservoirFromRegression = (settings, observeRegression) => {

  const {
    dataType1
  } = settings;

  const {
    subset,
    
    k,
    n,
    r2,
    regressionString,
    
    observeKeyX, // absorbDeltaMmTotal
    observeKeyY, // runoffDrainMmHr

    predict,
  } = observeRegression;

  const regressionMethod = 'predict';
  const predictKeyY = `${observeKeyY}${titleCaseWord(regressionMethod)}${titleCaseWord(subset) ? `${subset}`: 'All'}`; // change this on the server IF we want to save it
  const predictKeyX = `${observeKeyX}${titleCaseWord(regressionMethod)}${titleCaseWord(subset) ? `${subset}`: 'All'}`; // change this on the server IF we want to save it

  const runoffDrainMmTotalKey = `runoffDrainMmTotal${titleCaseWord(regressionMethod)}${subset ? `${titleCaseWord(subset)}`: 'All'}`;
  const runoffSheetMmTotalKey = `runoffSheetMmTotal${titleCaseWord(regressionMethod)}${subset ? `${titleCaseWord(subset)}`: 'All'}`;

  let priorInc = {};
  const dataType1WithPrediction = Array.isArray(dataType1) ?
    dataType1.map((d,i)=>{
      if(i===0){
        const inc = {
          metadata: {
            observeKeyX,
            observeKeyY,
            predictKeyX,
            predictKeyY,
            runoffDrainMmTotalKey,
            runoffSheetMmTotalKey,
          },
          rainMm: d.rainMm,
          minsTotal: d.minsTotal,
          [observeKeyX]: d[observeKeyX],
          [observeKeyY]: d[observeKeyY],          
          [predictKeyX]: d[observeKeyX], // absorbDeltaMmTotal initial should be 0
          [predictKeyY]: d[observeKeyY], // runoffDrainMmHr
          [runoffDrainMmTotalKey] : d.runoffDrainMmTotal, // runoffDrainMmTotal
          [runoffSheetMmTotalKey] : d.runoffSheetMmTotal, // runoffSheetMmTotal
        };
        priorInc = inc;
        return inc;
      } else {
        const runoffDrainMmHrArr = predict(priorInc[predictKeyX]);
        const runoffDrainMmHr = runoffDrainMmHrArr[1] || 0;
        const runoffDrainMm = runoffDrainMmHr / 60;
        const runoffSheetMm = 0;
        const storage = 
          priorInc[predictKeyX] + 
          d.rainMm - 
          runoffDrainMm - 
          runoffSheetMm;
        const inc = {
          metadata: {
            // priorInc,
            observeKeyX,
            observeKeyY,
            predictKeyX,
            predictKeyY,
            runoffDrainMmHrArr,
            runoffDrainMmHr,
            runoffDrainMm,
            runoffSheetMm,
            runoffDrainMmTotalKey,
            runoffSheetMmTotalKey,
          },
          rainMm: d.rainMm,
          minsTotal: d.minsTotal,
          // absorbDeltaMmTotal
          [observeKeyX]: d[observeKeyX],
          // runoffDrainMmHr
          [observeKeyY]: d[observeKeyY],    
          // absorbDeltaMmTotalPredictSUBSET
          [predictKeyX]: storage, 
          // runoffDrainMmHrPredictSUBSET
          [predictKeyY]: runoffDrainMmHr, 
          // runoffDrainMmTotal
          [runoffDrainMmTotalKey] : priorInc[runoffDrainMmTotalKey] + runoffDrainMm, 
          // runoffSheetMmTotal
          [runoffSheetMmTotalKey] : priorInc[runoffSheetMmTotalKey] + runoffSheetMm,         
        };
        priorInc = inc;
        return inc;
      }
    }) : [] ;

  const indexEnd = dataType1WithPrediction.length;

  const {
    runoffDrainMmTotal,
    runoffDrainMmTotalPredict,
  
    runoffDrainPeakRateMm,
    runoffDrainPeakRateMmPredict,
  
    runoffDrainMeanMm,
    runoffDrainMeanMmPredict,

    absorbPeakMmTotal,
    absorbPeakMmTotalPredict,
  } = getFlowStats({
    regressionMethod,
    dataType1WithPrediction, 
    observeKeyX: observeKeyX, 
    predictKeyX: predictKeyX,
    observeKeyY: observeKeyY, 
    predictKeyY: predictKeyY,
    indexStart: 0,
    indexEnd,
  });
  
  const {
    nse,
  } = calcNse({
    dataType1WithPrediction, 
    observeKeyY: observeKeyY, 
    predictKeyY: predictKeyY,
    indexStart: 0,
    indexEnd,
    runoffDrainMeanMm,
  });


  const predictRegression = {
    subset, 
    regressionMethod: regressionMethod,

    indexStart: 0,
    indexEnd: dataType1.length,

    k,
    n,
    r2,
    regressionString,
    
    observeKeyX,
    absorbPeakMmTotal,
    absorbPeakMmTotalPredict,
    predictKeyX,

    observeKeyY,
    runoffDrainMmTotal,
    runoffDrainMmTotalPredict,
    predictKeyY,

    runoffDrainPeakRateMm,
    runoffDrainPeakRateMmPredict,
      
    runoffDrainMeanMm,
    runoffDrainMeanMmPredict,

    nse,

    dataType1WithPrediction,
    predict,
  };

  return predictRegression;
};

module.exports = {
  calcObserveRegression,
  predictLinearReservoirFromRegression,
};