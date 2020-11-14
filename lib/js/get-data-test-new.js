// --- CODE CREDIT: All project files were modified from Georgia Tech Cs6440 Lab 3.2, Fall2020 ---

// Adapted from the cerner smart on fhir guide. updated to utilize client.js v2 library and FHIR R4

// Create a fhir client based on the sandbox environment and test patient
const client = new FHIR.client({
  serverUrl: "https://r4.smarthealthit.org",
  tokenResponse: {
    patient: "326b4675-0bc8-4dbd-b406-a5564c282401"
  }
});

// region Functions

// Takes in the data from the input fields and creates and posts an observation
function submitData() {
  // Do nothing if the user did not fill out the measurement details
  let measurement = document.getElementById('input_glucose_measurement').value;
  let units = document.getElementById('input_measurement_unit').value;
  if (measurement === '' || units === '') {
    alert('Fill out the Glucose Measurement and Measurement Units fields.');
    return;
  }

  // Create an observation from the inputs
  let obs = getObservation();

  // Post this observation to the FHIR server
  client.create(obs)
    .then(
      function(res) {
        clearInputs();
        alert('Measurement posted.');
        console.log(JSON.stringify(res));
      }
    )
    .catch(
      function(e) {
        alert('An error occurred. this measurement was not posted!');
        console.log(e.message);
      }
    );
}

// Returns a FHIR observation based on the user's input
function getObservation() {
  // Returns the current time in UTC format
  function getCurrentTime() {

    let currentDate = new Date();

    // region Code credit:
    //   author: Allan
    //   from: https://stackoverflow.com/questions/9149556/how-to-get-utc-offset-in-javascript-analog-of-timezoneinfo-getutcoffset-in-c
    //   accessed: 11/14/2020

    function addLeadingZero(x) {
      return (x < 10) ? "0" + x : "" + x;
    }

    function getUTCOffset() {
      let sign = (currentDate.getTimezoneOffset() > 0) ? "-" : "+";
      let offset = Math.abs(currentDate.getTimezoneOffset());
      let hours = addLeadingZero(Math.floor(offset / 60));
      let minutes = addLeadingZero(offset % 60);
      return sign + hours + ":" + minutes;
    }

    // endregion

    return currentDate.getFullYear() + "-"
      + addLeadingZero(currentDate.getMonth()+1)  + "-"
      + addLeadingZero(currentDate.getDate()) + "T"
      + addLeadingZero(currentDate.getHours()) + ":"
      + addLeadingZero(currentDate.getMinutes()) + ":"
      + addLeadingZero(currentDate.getSeconds())
      + getUTCOffset();
  }

  // Returns a FHIR code object based on when the user last ate
  function getObsCode() {
    // No time specified, pre-meal, post-meal, 2 hours post-meal
    const texts = ['Glucose', 'Glucose pre-meal', 'Glucose post meal', 'Glucose 2 Hr post meal'];
    const codes = ['2339-0', '88365-2', '87422-2', '6689-4'];

    // See when the user last ate and choose the correct LOINC code accordingly
    let time = document.getElementById('input_last_meal_time');
    let index = 0;
    if (time.value !== '') {
      index = parseInt(time.value);
    }

    return {
      coding: [
        {
          system: 'http://loinc.org',
          code: codes[index],
          display: texts[index]
        }
      ],
      text: texts[index]
    };
  }

  // Returns a FHIR value object based on the user's glucose measurement
  function getObsValueQuantity() {
    let val = document.getElementById('input_glucose_measurement').value;
    let unit = document.getElementById('input_measurement_unit').value;
    if (unit === 'mmoll') {
      val *= 18.0182;
    }

    return {
      value: val,
      unit: 'mg/dL',
      system: 'http://unitsofmeasure.org',
      code: 'mg/dL'
    }
  }

  // TODO: Returns a list of FHIR note objects based on the user's notes
  function getObsNotes() {
    function annotation(text) {
      return {
        authorReference: {
          reference: `Patient/${client.patient.id}`
        },
        time: getCurrentTime(),
        text: text
      }
    }

    let notes = []

    // Make a note of the last meal's carbs
    let carbs = document.getElementById('input_last_meal_carbs').value;
    if (carbs !== '') {
      notes.push(annotation(`Carbs in my last meal: ${carbs}`));
    }

    // Make a note of the patient's symptoms
    let symptoms = [];
    let checkboxes = document.querySelectorAll('input[type=checkbox]:checked');
    if (checkboxes.length !== 0) {
      for (let i = 0; i < checkboxes.length; i++) {
        symptoms.push(checkboxes[i].value)
      }
      notes.push(annotation(`I am experiencing the following symptoms: ${symptoms.join(', ')}`));
    }

    // Make a note of the patient's medicine intake status
    let meds = document.getElementById('input_medication').value;
    if (meds !== '') {
      if (meds === 'true') {
        notes.push(annotation('I have taken my medicine today.'));
      } else {
        notes.push(annotation('I have not yet taken my medicine today.'));
      }
    }

    // Make a note of the patient's additional notes
    let additional = document.getElementById('input_additional_notes').value;
    if (additional !== '') {
      notes.push(annotation(additional));
    }

    return notes;
  }

  // Create the observation
  let obs = {
    resourceType: 'Observation',
    status: 'final',
    code: getObsCode(),
    subject: {
      reference: `Patient/${client.patient.id}`
    },
    effectiveDateTime: getCurrentTime(),
    valueQuantity: getObsValueQuantity(),
  };

  // If the patient left any notes, add it to the observation
  let notes = getObsNotes();
  if (notes.length !== 0) {
    obs.note = notes;
  }

  return obs;
}

// Resets all the inputs to default null values
function clearInputs() {
  document.getElementById('input_glucose_measurement').value = '';
  document.getElementById('input_measurement_unit').value = '';
  document.getElementById('input_last_meal_time').value = '';
  document.getElementById('input_last_meal_carbs').value = '';
  document.getElementById('input_medication').value = '';
  document.getElementById('input_additional_notes').value = '';

  let checkboxes = document.querySelectorAll('input[type=checkbox]');
  for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = false;
  }
}

// Function to display the patient's name in the index page
function displayPatient(pt) {
  // Helper function to process FHIR resource to get the patient name
  function getPatientName(pt) {
    if (pt.name) {
      let names = pt.name.map(function(name) {
        return name.given.join(" ") + " " + name.family;
      });
      return names.join(" / ")
    } else {
      return "anonymous";
    }
  }

  document.getElementById('patient_name').innerHTML = getPatientName(pt);
}

// endregion

// region Page Code

// Get patient object and then display its demographics info in the banner
client.request(`Patient/${client.patient.id}`).then(
  function(patient) {
    displayPatient(patient);
    //console.log(JSON.stringify(patient));
  }
);

// Event listener when the submit button is clicked to call the function that will create a new observation
document.getElementById('button_submit').addEventListener('click', submitData);

// endregion
