'use strict';

var _require = require('conjunction-junction');

const isPrimitiveNumber = _require.isPrimitiveNumber,
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

  let runoff_trans_mm_total_predict = 0;
  let runoff_trans_mm_total = 0;
  let runoff_trans_peak_rate_mm_predict = 0;
  let runoff_trans_peak_rate_mm = 0;
  let runoff_trans_mean_mm_predict = 0;
  let runoff_trans_mean_mm = 0;
  let absorb_peak_mm_total = 0;
  let absorb_peak_mm_total_predict = 0;

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

    runoff_trans_peak_rate_mm = Math.max(runoff_trans_peak_rate_mm, mmObserve);
    runoff_trans_peak_rate_mm_predict = Math.max(runoff_trans_peak_rate_mm_predict, mmPredict);

    runoff_trans_mm_total_predict += mmPredict;
    runoff_trans_mm_total += mmObserve;

    const mmAbsorbObserve = d && isPrimitiveNumber(d[observeKeyX]) ? d[observeKeyX] : 0;
    const mmAbsorbPredict = d && isPrimitiveNumber(d[predictKeyX]) ? d[predictKeyX] : 0;

    absorb_peak_mm_total = Math.max(absorb_peak_mm_total, mmAbsorbObserve);
    absorb_peak_mm_total_predict = Math.max(absorb_peak_mm_total_predict, mmAbsorbPredict);

    return {
      mmObserve,
      mmPredict
    };
  });

  const flowMeanObserveArr = flowMeanArr.map(d => d.mmObserve);
  const flowMeanPredictArr = flowMeanArr.map(d => d.mmPredict);

  // console.log('subset',subset,'flowMeanArr [mmObserve, mmPredict]',flowMeanArr);
  runoff_trans_mean_mm = flowMeanObserveArr.length > 0 ? math.mean(flowMeanObserveArr) : NaN;
  runoff_trans_mean_mm_predict = flowMeanPredictArr.length > 0 ? math.mean(flowMeanPredictArr) : NaN;

  return {
    runoff_trans_mm_total,
    runoff_trans_mm_total_predict,

    runoff_trans_peak_rate_mm,
    runoff_trans_peak_rate_mm_predict,

    runoff_trans_mean_mm,
    runoff_trans_mean_mm_predict,

    absorb_peak_mm_total,
    absorb_peak_mm_total_predict
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


  const predictKeyY = `${observeKeyY}_${regressionMethod}_${subset ? `${subset}` : 'all'}`; // change this on the server IF we want to save it
  const predictKeyX = `${observeKeyX}_${regressionMethod}_${subset ? `${subset}` : 'all'}`; // change this on the server IF we want to save it

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

  const runoff_trans_mm_total = _getFlowStats.runoff_trans_mm_total,
        runoff_trans_mm_total_predict = _getFlowStats.runoff_trans_mm_total_predict,
        runoff_trans_peak_rate_mm = _getFlowStats.runoff_trans_peak_rate_mm,
        runoff_trans_peak_rate_mm_predict = _getFlowStats.runoff_trans_peak_rate_mm_predict,
        runoff_trans_mean_mm = _getFlowStats.runoff_trans_mean_mm,
        runoff_trans_mean_mm_predict = _getFlowStats.runoff_trans_mean_mm_predict;

  var _calcNse = calcNse({
    dataType1WithPrediction,
    observeKeyY,
    predictKeyY,
    indexStart,
    indexEnd,
    runoff_trans_mean_mm
  });

  const nse = _calcNse.nse;


  const observeRegression = {
    subset,
    regression_method: regressionMethod,

    messages, // messages about start and end
    indexStart,
    indexEnd,

    k: regressionResult.k,
    n: regressionResult.n,
    r2: regressionResult.r2,
    regression_string: regressionResult.string,

    observe_key_x: observeKeyX,
    absorb_peak_mm_total: '',
    absorb_peak_mm_total_predict: '',
    predict_key_x: predictKeyX,

    observe_key_y: observeKeyY,
    runoff_trans_mm_total,
    runoff_trans_mm_total_predict,
    predict_key_y: predictKeyY,

    runoff_trans_peak_rate_mm,
    runoff_trans_peak_rate_mm_predict,

    runoff_trans_mean_mm,
    runoff_trans_mean_mm_predict,

    nse,

    points_raw: regressionResult.points,
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
        regression_string = observeRegression.regression_string,
        observe_key_x = observeRegression.observe_key_x,
        observe_key_y = observeRegression.observe_key_y,
        predict = observeRegression.predict;


  const regressionMethod = 'predict';
  const predict_key_y = `${observe_key_y}_${regressionMethod}_${subset ? `${subset}` : 'all'}`; // change this on the server IF we want to save it
  const predict_key_x = `${observe_key_x}_${regressionMethod}_${subset ? `${subset}` : 'all'}`; // change this on the server IF we want to save it

  const runoff_trans_mm_total_key = `runoff_trans_mm_total_${regressionMethod}_${subset ? `${subset}` : 'all'}`;
  const runoff_sheet_mm_total_key = `runoff_sheet_mm_total_${regressionMethod}_${subset ? `${subset}` : 'all'}`;

  let priorInc = {};
  const dataType1WithPrediction = Array.isArray(dataType1) ? dataType1.map((d, i) => {
    if (i === 0) {
      const inc = {
        metadata: {
          observe_key_x,
          observe_key_y,
          predict_key_x,
          predict_key_y,
          runoff_trans_mm_total_key,
          runoff_sheet_mm_total_key
        },
        rain_mm: d.rain_mm,
        mins_total: d.mins_total,
        [observe_key_x]: d[observe_key_x],
        [observe_key_y]: d[observe_key_y],
        [predict_key_x]: d[observe_key_x], // absorb_delta_mm_total initial should be 0
        [predict_key_y]: d[observe_key_y], // runoff_trans_mm_hr
        [runoff_trans_mm_total_key]: d.runoff_trans_mm_total, // runoff_trans_mm_total
        [runoff_sheet_mm_total_key]: d.runoff_sheet_mm_total // runoff_sheet_mm_total
      };
      priorInc = inc;
      return inc;
    } else {
      const runoff_trans_mm_hr_arr = predict(priorInc[predict_key_x]);
      const runoff_trans_mm_hr = runoff_trans_mm_hr_arr[1] || 0;
      const runoff_trans_mm = runoff_trans_mm_hr / 60;
      const runoff_sheet_mm = 0;
      const storage = priorInc[predict_key_x] + d.rain_mm - runoff_trans_mm - runoff_sheet_mm;
      const inc = {
        metadata: {
          // priorInc,
          observe_key_x,
          observe_key_y,
          predict_key_x,
          predict_key_y,
          runoff_trans_mm_hr_arr,
          runoff_trans_mm_hr,
          runoff_trans_mm,
          runoff_sheet_mm,
          runoff_trans_mm_total_key,
          runoff_sheet_mm_total_key
        },
        rain_mm: d.rain_mm,
        mins_total: d.mins_total,
        // absorb_delta_mm_total
        [observe_key_x]: d[observe_key_x],
        // runoff_trans_mm_hr
        [observe_key_y]: d[observe_key_y],
        // absorb_delta_mm_total_predict_SUBSET
        [predict_key_x]: storage,
        // runoff_trans_mm_hr_predict_SUBSET
        [predict_key_y]: runoff_trans_mm_hr,
        // runoff_trans_mm_total
        [runoff_trans_mm_total_key]: priorInc[runoff_trans_mm_total_key] + runoff_trans_mm,
        // runoff_sheet_mm_total
        [runoff_sheet_mm_total_key]: priorInc[runoff_sheet_mm_total_key] + runoff_sheet_mm
      };
      priorInc = inc;
      return inc;
    }
  }) : [];

  const indexEnd = dataType1WithPrediction.length;

  var _getFlowStats2 = getFlowStats({
    regressionMethod,
    dataType1WithPrediction,
    observeKeyX: observe_key_x,
    predictKeyX: predict_key_x,
    observeKeyY: observe_key_y,
    predictKeyY: predict_key_y,
    indexStart: 0,
    indexEnd
  });

  const runoff_trans_mm_total = _getFlowStats2.runoff_trans_mm_total,
        runoff_trans_mm_total_predict = _getFlowStats2.runoff_trans_mm_total_predict,
        runoff_trans_peak_rate_mm = _getFlowStats2.runoff_trans_peak_rate_mm,
        runoff_trans_peak_rate_mm_predict = _getFlowStats2.runoff_trans_peak_rate_mm_predict,
        runoff_trans_mean_mm = _getFlowStats2.runoff_trans_mean_mm,
        runoff_trans_mean_mm_predict = _getFlowStats2.runoff_trans_mean_mm_predict,
        absorb_peak_mm_total = _getFlowStats2.absorb_peak_mm_total,
        absorb_peak_mm_total_predict = _getFlowStats2.absorb_peak_mm_total_predict;

  var _calcNse2 = calcNse({
    dataType1WithPrediction,
    observeKeyY: observe_key_y,
    predictKeyY: predict_key_y,
    indexStart: 0,
    indexEnd,
    runoff_trans_mean_mm
  });

  const nse = _calcNse2.nse;


  const predictRegression = {
    subset,
    regression_method: regressionMethod,

    indexStart: 0,
    indexEnd: dataType1.length,

    k,
    n,
    r2,
    regression_string,

    observe_key_x,
    absorb_peak_mm_total,
    absorb_peak_mm_total_predict,
    predict_key_x,

    observe_key_y,
    runoff_trans_mm_total,
    runoff_trans_mm_total_predict,
    predict_key_y,

    runoff_trans_peak_rate_mm,
    runoff_trans_peak_rate_mm_predict,

    runoff_trans_mean_mm,
    runoff_trans_mean_mm_predict,

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