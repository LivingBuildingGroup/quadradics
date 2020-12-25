'use strict';
const {precisionRound}     = require('conjunction-junction');
const {mean}               = require('mathjs');

const calcNse = input => {

  const {
    dataType1WithPrediction, 
    observeKeyY, 
    predictKeyY,
    indexStart,
    indexEnd,
    runoffDrainMeanMm,
  } = input;

  if(!Array.isArray(dataType1WithPrediction)){
    return;
  }

  const dataSliced = Array.isArray(dataType1WithPrediction) ?
    dataType1WithPrediction.slice(indexStart, indexEnd) : [];   
  
  // dataSliced is the data subset from start of model to end of model
  // map is a loop (that returns a new array)
  let numeratorPriorSum   = 0 ;
  let denominatorPriorSum = 0 ;

  const numDomArr = dataSliced.map(d=>{
    // initialize at 0, otherwise, get prior step
    const observe  = d ? d[observeKeyY] : null ;
    const predict  = d ? d[predictKeyY] : null ;
    // Math.pow is (value, power)
    const numerator   = Math.pow(predict - observe    , 2);
    const denominator = Math.pow(observe  - runoffDrainMeanMm, 2);
    numeratorPriorSum   = numerator   + numeratorPriorSum ;
    denominatorPriorSum = denominator + denominatorPriorSum ;
    return {
      numerator,
      denominator,
      numeratorSum:   numeratorPriorSum,
      denominatorSum: denominatorPriorSum,
    };
  });

  const last = numDomArr.length-1;
  const lastItem = numDomArr[last] || {};
  const numeratorLast   = lastItem.numeratorSum;
  const denominatorLast = lastItem.denominatorSum;
  
  // NSE=1-numerator(t)/denominator(t) T = LAST TIME STEP
  const nse = 1 - (numeratorLast/denominatorLast);
  // console.log('regressionMethod',regressionMethod,'subset', subset, 'predictKeyY',predictKeyY,'array of numerators and denominators',numDomArr);
  return {
    nse,
    numDomArr,
  };
};

const formatNse = (f, area) => {
  const gadget = f.gadget || {};
  if(!gadget.hydro){return null;}

  const m = area    || {};
  const s = m.stats || {};
  const dataPoints = Array.isArray(m.dataType1) ? m.dataType1 : [];

  const swTestStats = f.swTestStats || null;
  if(!swTestStats){return null;}

  const tests = [{
    id: 'model',
    rainMmTotal: s.stormVolumeMm,
    rainPeakMmHr: s.rainPeakRateMmHr,
    runoffMmTotal: s.runoffMmTotal,
    runoffMaxMmHr: s.runoffMaxMmHr,
    runoffDrainMmTotal: s.runoffDrainMmTotal,
    runoffDrainMaxMmHr: s.runoffDrainMaxMmHr,
    runoffSheetMmTotal: s.runoffSheetMmTotal,
    runoffSheetMaxMmHr: s.runoffSheetMaxMmHr,
    nse: '',
  }];
  for(let id in swTestStats){

    const predictDrainKeyY  = 'runoffDrainMm';
    const observeDrainKeyY  = `${id}__${predictDrainKeyY}`;
    const predictRunoffKeyY = 'runoffMm';
    const observeRunoffKeyY = `${id}__${predictRunoffKeyY}`;
    // filter to remove undefined, i.e. data points that exceed the measured array length
    const meanObserveDrainArr = dataPoints.map(d=>d[observeDrainKeyY]).filter(d=>d!==undefined);
  
    const meanObserveDrain = meanObserveDrainArr.length>0 ?
      mean(meanObserveDrainArr) : NaN ;

    const meanObserveRunoffArr = dataPoints.map(d=>d[observeRunoffKeyY]).filter(d=>d!==undefined);
  
    const meanObserveRunoff = meanObserveRunoffArr.length>0 ?
      mean(meanObserveRunoffArr) : NaN ;

    const dataPointsSliced = dataPoints.slice(0,meanObserveDrainArr.length);

    const nseDrainInput = {
      dataPoints: dataPointsSliced, 
      observeKeyY: observeDrainKeyY, 
      predictKeyY: predictDrainKeyY,
      startIndex: 0,
      endIndex: dataPointsSliced.length -1,
      meanObserve: meanObserveDrain,
    };
    const nseRunoffInput = {
      dataPoints: dataPointsSliced, 
      observeKeyY: observeRunoffKeyY, 
      predictKeyY: predictRunoffKeyY,
      startIndex: 0,
      endIndex: dataPointsSliced.length -1,
      meanObserve: meanObserveRunoff,
    };
    tests.push(Object.assign({},
      swTestStats[id],
      {
        nseDrain: precisionRound(calcNse(nseDrainInput).nse,2),
        nseRunoff: precisionRound(calcNse(nseRunoffInput).nse,2),
      }
    ));
  }

  return tests;
};

module.exports = {
  calcNse,
  formatNse,
};