'use strict';

var _require = require('conjunction-junction');

const isPrimitiveNumber = _require.isPrimitiveNumber,
      titleCaseWord = _require.titleCaseWord,
      precisionRound = _require.precisionRound;

const math = require('mathjs');

var _require2 = require('./nse');

const calcNse = _require2.calcNse;

var _require3 = require('./regression-process');

const determineIndicesOfSubArray = _require3.determineIndicesOfSubArray,
      fitSubArrayToDataType1 = _require3.fitSubArrayToDataType1;


const getFlowStats = input => {
  const dataType1WithPrediction = input.dataType1WithPrediction,
        observeKeyX = input.observeKeyX,
        predictKeyX = input.predictKeyX,
        observeKeyY = input.observeKeyY,
        predictKeyY = input.predictKeyY,
        indexStart = input.indexStart,
        indexEnd = input.indexEnd;

  // console.log('observeKeyY',observeKeyY,'predictKeyY',predictKeyY)

  const dataSliced = Array.isArray(dataType1WithPrediction) ? dataType1WithPrediction.slice(indexStart, indexEnd) : [];

  let runoffDrainMmTotalPredict = 0;
  let runoffDrainMmTotal = 0;
  let runoffDrainPeakRateMmPredict = 0;
  let runoffDrainPeakRateMm = 0;
  let runoffDrainMeanMmPredict = 0;
  let runoffDrainMeanMm = 0;
  let absorbPeakMmTotal = 0;
  let absorbPeakMmTotalPredict = 0;

  // console.log('dataSliced',dataSliced)
  const flowMeanArr = dataSliced.map((d, i) => {
    if (!d[observeKeyY] && d[observeKeyY] !== 0) {
      console.error('observeKeyY', observeKeyY, 'is missing at index', i);
    }
    if (!d[predictKeyY] && d[predictKeyY] !== 0) {
      console.error('predictKeyY', predictKeyY, 'is missing at index', i);
    }
    const mmHrObserve = d && isPrimitiveNumber(d[observeKeyY]) ? d[observeKeyY] : 0;
    const mmHrPredict = d && isPrimitiveNumber(d[predictKeyY]) ? d[predictKeyY] : 0;

    const mmObserve = precisionRound(mmHrObserve / 60, 4);
    const mmPredict = precisionRound(mmHrPredict / 60, 4);

    runoffDrainPeakRateMm = Math.max(runoffDrainPeakRateMm, mmObserve);
    runoffDrainPeakRateMmPredict = Math.max(runoffDrainPeakRateMmPredict, mmPredict);

    runoffDrainMmTotalPredict += mmPredict;
    runoffDrainMmTotal += mmObserve;

    const mmAbsorbObserve = d && isPrimitiveNumber(d[observeKeyX]) ? d[observeKeyX] : 0;
    const mmAbsorbPredict = d && isPrimitiveNumber(d[predictKeyX]) ? d[predictKeyX] : 0;

    absorbPeakMmTotal = Math.max(absorbPeakMmTotal, mmAbsorbObserve);
    absorbPeakMmTotalPredict = Math.max(absorbPeakMmTotalPredict, mmAbsorbPredict);

    return {
      mmObserve,
      mmPredict
    };
  });

  const flowMeanObserveArr = flowMeanArr.map(d => d.mmObserve);
  const flowMeanPredictArr = flowMeanArr.map(d => d.mmPredict);

  // console.log('subset',subset,'flowMeanArr [mmObserve, mmPredict]',flowMeanArr);
  runoffDrainMeanMm = flowMeanObserveArr.length > 0 ? math.mean(flowMeanObserveArr) : NaN;
  runoffDrainMeanMmPredict = flowMeanPredictArr.length > 0 ? math.mean(flowMeanPredictArr) : NaN;

  return {
    runoffDrainMmTotal,
    runoffDrainMmTotalPredict,

    runoffDrainPeakRateMm,
    runoffDrainPeakRateMmPredict,

    runoffDrainMeanMm,
    runoffDrainMeanMmPredict,

    absorbPeakMmTotal,
    absorbPeakMmTotalPredict
  };
};

const calcObserveRegression = input => {
  const idTest = input.idTest,
        dataType1 = input.dataType1,
        observeKeyX = input.observeKeyX,
        observeKeyY = input.observeKeyY,
        startUser = input.startUser,
        indexEndFromUser = input.indexEndFromUser,
        subset = input.subset,
        precision = input.precision,
        regressionMethod = input.regressionMethod,
        regressionFunction = input.regressionFunction;


  const predictKeyY = `${observeKeyY}${titleCaseWord(regressionMethod)}${subset ? `${titleCaseWord(subset)}` : 'All'}`; // change this on the server IF we want to save it
  const predictKeyX = `${observeKeyX}${titleCaseWord(regressionMethod)}${subset ? `${titleCaseWord(subset)}` : 'All'}`; // change this on the server IF we want to save it

  var _determineIndicesOfSu = determineIndicesOfSubArray({
    dataType1,
    startUser,
    indexEndFromUser,
    observeKeyX,
    observeKeyY
  });

  const indexStart = _determineIndicesOfSu.indexStart,
        indexEnd = _determineIndicesOfSu.indexEnd,
        messages = _determineIndicesOfSu.messages;


  const dataSliced = dataType1.slice(indexStart, indexEnd);

  if (dataSliced.length <= 3) {
    const errorMessage = `There are only ${dataSliced.length} data points for test ${idTest} method ${regressionMethod} subset ${subset}. Regression aborting.`;
    return { errorMessage };
  }

  const data = dataSliced.map(d => {
    return [d[observeKeyX], d[observeKeyY]];
  });
  // console.log('subset',subset,`data to send to regression: [${observeKeyX},${observeKeyY}]`,data);

  const options = {
    order: 2,
    precision
  };
  const regressionResult = regressionFunction(data, options);

  // console.log('subset',subset,'observeKeyY',observeKeyY,'regressionResult',regressionResult);

  const dataType1WithPrediction = fitSubArrayToDataType1({
    subset,
    predictKeyY,
    indexStart,
    indexEnd,
    regressionPointsSubArray: regressionResult.points,
    dataType1
  });

  var _getFlowStats = getFlowStats({
    regressionMethod,
    dataType1WithPrediction,
    observeKeyY,
    predictKeyY,
    indexStart,
    indexEnd
  });

  const runoffDrainMmTotal = _getFlowStats.runoffDrainMmTotal,
        runoffDrainMmTotalPredict = _getFlowStats.runoffDrainMmTotalPredict,
        runoffDrainPeakRateMm = _getFlowStats.runoffDrainPeakRateMm,
        runoffDrainPeakRateMmPredict = _getFlowStats.runoffDrainPeakRateMmPredict,
        runoffDrainMeanMm = _getFlowStats.runoffDrainMeanMm,
        runoffDrainMeanMmPredict = _getFlowStats.runoffDrainMeanMmPredict;

  var _calcNse = calcNse({
    dataType1WithPrediction,
    observeKeyY,
    predictKeyY,
    indexStart,
    indexEnd,
    runoffDrainMeanMm
  });

  const nse = _calcNse.nse;


  const observeRegression = {
    subset,
    regressionMethod: regressionMethod,

    messages, // messages about start and end
    indexStart,
    indexEnd,

    k: regressionResult.k,
    n: regressionResult.n,
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
    predict: regressionResult.predict
  };

  return observeRegression;
};

const predictLinearReservoirFromRegression = (settings, observeRegression) => {
  const dataType1 = settings.dataType1;
  const subset = observeRegression.subset,
        k = observeRegression.k,
        n = observeRegression.n,
        r2 = observeRegression.r2,
        regressionString = observeRegression.regressionString,
        observeKeyX = observeRegression.observeKeyX,
        observeKeyY = observeRegression.observeKeyY,
        predict = observeRegression.predict;


  const regressionMethod = 'predict';
  const predictKeyY = `${observeKeyY}${titleCaseWord(regressionMethod)}${titleCaseWord(subset) ? `${subset}` : 'All'}`; // change this on the server IF we want to save it
  const predictKeyX = `${observeKeyX}${titleCaseWord(regressionMethod)}${titleCaseWord(subset) ? `${subset}` : 'All'}`; // change this on the server IF we want to save it

  const runoffDrainMmTotalKey = `runoffDrainMmTotal${titleCaseWord(regressionMethod)}${subset ? `${titleCaseWord(subset)}` : 'All'}`;
  const runoffSheetMmTotalKey = `runoffSheetMmTotal${titleCaseWord(regressionMethod)}${subset ? `${titleCaseWord(subset)}` : 'All'}`;

  let priorInc = {};
  const dataType1WithPrediction = Array.isArray(dataType1) ? dataType1.map((d, i) => {
    if (i === 0) {
      const inc = {
        metadata: {
          observeKeyX,
          observeKeyY,
          predictKeyX,
          predictKeyY,
          runoffDrainMmTotalKey,
          runoffSheetMmTotalKey
        },
        rainMm: d.rainMm,
        minsTotal: d.minsTotal,
        [observeKeyX]: d[observeKeyX],
        [observeKeyY]: d[observeKeyY],
        [predictKeyX]: d[observeKeyX], // absorbDeltaMmTotal initial should be 0
        [predictKeyY]: d[observeKeyY], // runoffDrainMmHr
        [runoffDrainMmTotalKey]: d.runoffDrainMmTotal, // runoffDrainMmTotal
        [runoffSheetMmTotalKey]: d.runoffSheetMmTotal // runoffSheetMmTotal
      };
      priorInc = inc;
      return inc;
    } else {
      const runoffDrainMmHrArr = predict(priorInc[predictKeyX]);
      const runoffDrainMmHr = runoffDrainMmHrArr[1] || 0;
      const runoffDrainMm = runoffDrainMmHr / 60;
      const runoffSheetMm = 0;
      const storage = priorInc[predictKeyX] + d.rainMm - runoffDrainMm - runoffSheetMm;
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
          runoffSheetMmTotalKey
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
        [runoffDrainMmTotalKey]: priorInc[runoffDrainMmTotalKey] + runoffDrainMm,
        // runoffSheetMmTotal
        [runoffSheetMmTotalKey]: priorInc[runoffSheetMmTotalKey] + runoffSheetMm
      };
      priorInc = inc;
      return inc;
    }
  }) : [];

  const indexEnd = dataType1WithPrediction.length;

  var _getFlowStats2 = getFlowStats({
    regressionMethod,
    dataType1WithPrediction,
    observeKeyX: observeKeyX,
    predictKeyX: predictKeyX,
    observeKeyY: observeKeyY,
    predictKeyY: predictKeyY,
    indexStart: 0,
    indexEnd
  });

  const runoffDrainMmTotal = _getFlowStats2.runoffDrainMmTotal,
        runoffDrainMmTotalPredict = _getFlowStats2.runoffDrainMmTotalPredict,
        runoffDrainPeakRateMm = _getFlowStats2.runoffDrainPeakRateMm,
        runoffDrainPeakRateMmPredict = _getFlowStats2.runoffDrainPeakRateMmPredict,
        runoffDrainMeanMm = _getFlowStats2.runoffDrainMeanMm,
        runoffDrainMeanMmPredict = _getFlowStats2.runoffDrainMeanMmPredict,
        absorbPeakMmTotal = _getFlowStats2.absorbPeakMmTotal,
        absorbPeakMmTotalPredict = _getFlowStats2.absorbPeakMmTotalPredict;

  var _calcNse2 = calcNse({
    dataType1WithPrediction,
    observeKeyY: observeKeyY,
    predictKeyY: predictKeyY,
    indexStart: 0,
    indexEnd,
    runoffDrainMeanMm
  });

  const nse = _calcNse2.nse;


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
    predict
  };

  return predictRegression;
};

module.exports = {
  calcObserveRegression,
  predictLinearReservoirFromRegression
};