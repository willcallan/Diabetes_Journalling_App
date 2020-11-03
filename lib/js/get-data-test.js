// --- CODE CREDIT: All project files were modified from Georgia Tech Cs6440 Lab 3.2, Fall2020. ---

// adapted from the cerner smart on fhir guide. updated to utilize client.js v2 library and FHIR R4

// create a fhir client based on the sandbox environment and test patient.
const client = new FHIR.client({
  serverUrl: "https://r4.smarthealthit.org",
  tokenResponse: {
    patient: "326b4675-0bc8-4dbd-b406-a5564c282401"
  }
});

// function to create a patient object to initialize the patient
function defaultPatient() {
  return {
    gluc: '',
    bmi: '',
    age: '',
    a1c: '',
    weight: '',
    height: '',
    notes: [],
  };
}

// function to display the patient name, gender, and dob in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
  document.getElementById('gender').innerHTML = pt.gender;
  document.getElementById('dob').innerHTML = pt.birthDate;
}

// helper function to process fhir resource to get the patient name.
function getPatientName(pt) {
  if (pt.name) {
    var names = pt.name.map(function(name) {
      return name.given.join(" ") + " " + name.family;
    });
    return names.join(" / ")
  } else {
    return "anonymous";
  }
}

// helper function to get the number of years difference between a date and today
function getDifferenceInYears(date) {
  var startDate = new Date(parseInt(date.substring(0, 4)),
    parseInt(date.substring(5, 7)),
    parseInt(date.substring(8, 10)));
  var today = new Date();
  var diff = today.getFullYear() - startDate.getFullYear();
  if (today.getMonth() - startDate.getMonth() < 0
    || (today.getMonth() === startDate.getMonth() && today.getDate() - startDate.getDate() < 0)) {
    diff -= 1;
  }
  return diff;
}

// helper function to get the date in mm/dd/yyyy form
function getDate(date) {
  return date.substring(5, 7) + '/' +
    date.substring(8, 10) + '/' +
    date.substring(0, 4);
}

// helper function to get quantity and unit from an observation resource.
function getQuantityValueAndUnit(ob, digits = 2) {
  if (typeof ob != 'undefined' &&
    typeof ob.valueQuantity != 'undefined' &&
    typeof ob.valueQuantity.value != 'undefined' &&
    typeof ob.valueQuantity.unit != 'undefined') {
    return Number(parseFloat((ob.valueQuantity.value)).toFixed(digits)) + ' ' + ob.valueQuantity.unit;
  } else {
    return undefined;
  }
}

// helper function to get BMI of patient
function getBMI(weight, height) {
  if (weight === undefined || height === undefined) {
    return undefined;
  }
  var weightInKg = parseFloat(weight.valueQuantity.value);
  var heightInM = parseFloat(height.valueQuantity.value);
  // convert weight to kg
  if (weight.valueQuantity.unit.valueOf() === "lb".valueOf()) {
    weightInKg *= 0.453592;
  }
  //convert height to m
  if (height.valueQuantity.unit.valueOf() === "cm".valueOf()) {
    heightInM *= 0.01;
  } else if (height.valueQuantity.unit.valueOf() === "[in_i]".valueOf()) {
    heightInM *= 0.0254;
  }
  return (weightInKg / Math.pow(heightInM, 2)).toFixed(2);
}

// function to display the observation values for the user patient
function displayObservation() {
  updateCardDisplay('gluc', userPatient.gluc);
  updateCardDisplay('bmi', userPatient.bmi);
  updateCardDisplay('age', userPatient.age);
  updateCardDisplay('a1c', userPatient.a1c);
}

// function to display the overall risk level of the user
function displayDiagnosis() {
  var message = '';
  var color = '';
  if (userPatient.a1cDate === undefined) {
    if (diagnosisLevel < diagnosisRiskMed) {
      message = 'LOW RISK';
      color = lightGreen;
    } else if (diagnosisLevel < diagnosisRiskHigh) {
      message = 'MEDIUM RISK';
      color = lightOrange;
    } else {
      message = 'HIGH RISK';
      color = lightRed;
    }
  } else {
    if (a1cLevel === levelNormal) {
      message = 'NO DIABETES';
      color = green;
    } else if (a1cLevel === levelHigh) {
      message = 'PRE-DIABETES';
      color = orange;
    } else {
      message = 'DIABETES';
      color = red;
    }
  }
  diagnosisValue.innerHTML = message;
  diagnosisValue.style.backgroundColor = color;
}

// function to update a card's notes and color (from card_data.js) based on its value
function updateCardDisplay(cardID, value) {
  if (value === undefined) {
    document.getElementById(cardID + 'Value').innerHTML = 'No data available';
    return;
  }
  var data = getData(cardID, value);
  document.getElementById(cardID + 'Value').innerHTML = value;
  document.getElementById(cardID + 'Card').style.backgroundColor = data.color;
  data.message.forEach(function(note) {
    document.getElementById(cardID + 'Notes').innerHTML += '<li>' + note + '</li>';
  });
}

// function to display additional notes
function displayNotes() {
  for (const note of userPatient.notes) {
    noteList.innerHTML += "<li> " + note + "</li>";
  }
}

// ------ CODE START ------

// create patient object to store the user's data
var userPatient = defaultPatient();

// get patient object and then display its demographics info in the banner
client.request(`Patient/${client.patient.id}`).then(
  function(patient) {
    userPatient.age = getDifferenceInYears(patient.birthDate);
    displayPatient(patient);
    console.log(patient);
  }
);

// get observation resource values
var query = new URLSearchParams();

query.set("patient", client.patient.id);
query.set("_count", 100);
query.set("_sort", "-date");
query.set("code", [
  'http://loinc.org|2339-0',  // glucose
  'http://loinc.org|4548-4',  // A1C
  'http://loinc.org|29463-7', // weight
  'http://loinc.org|8302-2',  // height
].join(","));

// get the patient's observation resources and save them to the user patient object
client.request("Observation?" + query, {
  pageLimit: 0,
  flat: true
}).then(
  function(ob) {
    // group all of the observation resources by type into their own variables
    var byCodes = client.byCodes(ob, 'code');
    var gluc = byCodes('2339-0');
    var a1c = byCodes('4548-4');
    var weight = byCodes('29463-7');
    var height = byCodes('8302-2');

    // set patient value parameters to the data pulled from the observation resource
    userPatient.weight = getQuantityValueAndUnit(weight[0]);
    userPatient.height = getQuantityValueAndUnit(height[0]);
    userPatient.bmi = getBMI(weight[0], height[0]);
    userPatient.gluc = getQuantityValueAndUnit(gluc[0]);
    userPatient.a1c = getQuantityValueAndUnit(a1c[0]);

    // mark when the user last had an A1C test
    if (userPatient.a1c !== undefined) {
      userPatient.a1cDate = a1c[0].meta.lastUpdated;
    }
}).then(
  function() {
    // update the UI to display the user's data
    displayObservation();
    displayDiagnosis();

    // generate and display any additional notes
    generateNotes();
    displayNotes();
});
