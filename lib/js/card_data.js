// Stores the data used by the app when analyzing a patient's age, bmi, blood sugar, etc.

// card background colors
const green = '#62c35d';
const orange = '#cd8923';
const red = '#cb2c2c';
const lightGreen = '#a0d79d';
const lightOrange = '#cfad78';
const lightRed = '#d48383';

// observation level values
const levelNormal = 'normal';
const levelHigh = 'high';
const levelVeryHigh = 'veryHigh';

// storage for the various observations being read
var glucLevel;
var bmiLevel;
var ageLevel;
var a1cLevel;
// if diagnosis level >= risk level, the patient should get an A1C test
var diagnosisLevel = 0;
const diagnosisRiskMed = 1;
const diagnosisRiskHigh = 3;

// returns the color and messages given the results of an observation value, and sets the variable levels for these obs
function getData(card_id, value) {
  switch(card_id) {
    case 'gluc':
      if (parseFloat(value) < 100) {
        return dataGlucoseNormal();
      }
      if (parseFloat(value) < 126) {
        return dataGlucoseHigh();
      }
      return dataGlucoseVeryHigh();
    case 'bmi':
      if (parseFloat(value) < 25) {
        return dataBMINormal();
      }
      return dataBMIHigh();
    case 'age':
      if (parseFloat(value) < 45) {
        return dataAgeYoung();
      }
      return dataAgeOld();
    case 'a1c':
      if (parseFloat(value) < 5.7) {
        return dataA1CNormal();
      }
      if (parseFloat(value) < 6.5) {
        return dataA1CPreDiabetes();
      }
      return dataA1CDiabetes();
    default:
      break;
  }
}

function dataGlucoseNormal() {
  glucLevel = levelNormal;
  return {
    color: lightGreen,
    message: ['Your blood sugar is at a healthy level.']
  };
}

function dataGlucoseHigh() {
  glucLevel = levelHigh;
  diagnosisLevel += 1;
  return {
    color: lightOrange,
    message: ['Your blood sugar level is a bit high.']
  };
}

function dataGlucoseVeryHigh() {
  glucLevel = levelVeryHigh;
  diagnosisLevel += 3;
  return {
    color: lightRed,
    message: ['Your blood sugar level is very high.']
  };
}

function dataBMINormal() {
  bmiLevel = levelNormal;
  return {
    color: lightGreen,
    message: ['You have a healthy BMI.']
  };
}

function dataBMIHigh() {
  bmiLevel = levelHigh;
  diagnosisLevel += 1;
  return {
    color: lightOrange,
    message: ['You have a high BMI, a common risk factor.']
  };
}

function dataAgeYoung() {
  ageLevel = levelNormal;
  return {
    color: lightGreen,
    message: ['You are relatively young.']
  };
}

function dataAgeOld() {
  ageLevel = levelHigh;
  diagnosisLevel += 1;
  return {
    color: lightOrange,
    message: ['Risk of diabetes increases after the age of 45.']
  };
}

function dataA1CNormal() {
  a1cLevel = levelNormal;
  if (getDifferenceInYears(userPatient.a1cDate) >= 3) {
    userPatient.notes.push();
  }
  return {
    color: green,
    message: ['Your A1C tests indicate normal blood sugar levels.']
  };
}

function dataA1CPreDiabetes() {
  a1cLevel = levelHigh;
  return {
    color: orange,
    message: ['Your A1C tests indicate you have pre-diabetes.']
  };
}

function dataA1CDiabetes() {
  a1cLevel = levelVeryHigh;
  return {
    color: red,
    message: ['Your A1C tests indicate you have diabetes.']
  };
}

// function to generate any additional notes
function generateNotes() {
  // tell user about the benefits of losing weight if they have a high BMI
  if (bmiLevel === levelHigh && a1cLevel !== levelVeryHigh) {
    var targetWeight = userPatient.weight.split(' ');
    targetWeight[0] = (parseFloat(targetWeight[0]) * 0.93).toFixed(0).toString();
    userPatient.notes.push('Losing weight has been shown to decrease the risk of diabetes.' +
      ' For you, getting your weight down from ' + parseFloat(userPatient.weight).toFixed(0) + ' ' + targetWeight[1] +
      ' to ' + targetWeight[0] + ' ' + targetWeight[1] +
      ' and exercising each day could reduce your risk for type 2 diabetes by 58%.');
  }

  // prompt the user to take the A1C test if they show risks and haven't taken the test yet
  if (userPatient.a1cDate === undefined && diagnosisLevel >= diagnosisRiskMed) {
    var risks = [];
    if (bmiLevel === levelHigh) risks.push('high weight');
    if (ageLevel === levelHigh) risks.push('over 45');
    if (glucLevel === levelHigh || glucLevel === levelVeryHigh) risks.push('high blood sugar');
    userPatient.notes.push('You have some common risk factors for diabetes (' + risks.join(', ') + '),' +
      ' you should discuss with your doctor about taking an A1C test, the definitive test for diagnosing diabetes.');
  }

  // remind the user to take the A1C test if it has been over three years
  else if (userPatient.a1cDate !== undefined) {
    userPatient.notes.push('Good job getting an A1C test! It\'s important to get this test every 3 years.' +
      ' You were tested on ' + getDate(userPatient.a1cDate) + ', so ' +
      (getDifferenceInYears(userPatient.a1cDate) < 3 ? 'you\'re good for a while.' : 'it\'s time to get retested.'));
  }

  // interpret the A1C results
  if (a1cLevel === levelHigh) {
    const cdcSite = 'https://www.cdc.gov/diabetes/prevention/index.html';
    userPatient.notes.push('According to your A1C test, you have been diagnosed with pre-diabetes.' +
      ' This means that your blood sugar level is too high, but not quite high enough to be considered type 2 diabetes.' +
      ' If left unchecked, this could develop into type 2 diabetes and increases your risk of heart disease or stroke.' +
      ' This all may sound scary, but good news, it\'s not too late! A simple change in lifestyle can drastically lower your risk of developing type 2 diabetes.' +
      ' Visit ' + 'this website by the Center for Disease Control'.link(cdcSite) + ' to learn more about how to reduce your risk for diabetes.');
  } else if (a1cLevel === levelVeryHigh) {
    const adaSite = 'https://community.diabetes.org/home';
    userPatient.notes.push('According to your A1C test, you have been diagnosed with diabetes.' +
      ' Your doctor will be able to provide more information regarding the nature of your diagnosis.' +
      ' Now that you are aware of your diagnosis, it\'s time to take action!' +
      ' There are many resources available that provide encouragement, insights, and support.' +
      ' A good starting point is ' + 'the community page of the American Diabetes Association'.link(adaSite) + '.' +
      ' Remember to consult your doctor if you have any questions or concerns about your diagnosis.');
  }

  // if the user has no problems, congratulate them and possibly tell them to get a blood sugar test
  if (userPatient.notes.length === 0) {
    userPatient.notes.push('Good job staying so healthy!' +
      (userPatient.gluc === undefined ? ' However, without a blood sugar test on record, it\'s difficult to determine your actual risk.' : ''));
  }
}
