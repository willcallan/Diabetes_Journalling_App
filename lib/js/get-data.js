// --- CODE CREDIT: All project files were modified from Georgia Tech Cs6440 Lab 3.2, Fall2020. ---

// adapted from the cerner smart on fhir guide. updated to utilize client.js v2 library and FHIR R4

// region Functions

// Takes in the data from the input fields and creates and posts an observation
function submitData() {
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

    // Returns a list of FHIR note objects based on the user's notes
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
        alert('Measurement posted.');
        clearInputs();
        refreshChart();
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

// Gets the patient's glucose measurements from FHIR server and updates the chart display
function refreshChart() {
  // Default container to hold chart values
  function chartValues() {
    return {
      x: null,
      y: null
    }
  }

  // Helper function to get quantity of glucose measurement from observation resource
  function getQuantityValue(ob, digits = 2) {
    if (typeof ob != 'undefined' &&
      typeof ob.valueQuantity != 'undefined' &&
      typeof ob.valueQuantity.value != 'undefined' &&
      typeof ob.valueQuantity.unit != 'undefined') {
      let value = parseFloat(ob.valueQuantity.value);
      if (ob.valueQuantity.unit === 'mmol/L') {
        value *= 18.0182;
      }
      return parseFloat(value.toFixed(digits));
    } else {
      return undefined;
    }
  }

  // Returns today's date in the form YYYY-MM-DD
  function getToday() {
    let today = new Date();
    let month = '' + (today.getMonth() + 1);
    let day = '' + today.getDate();
    let year = today.getFullYear();

    if (month.length < 2)
      month = '0' + month;
    if (day.length < 2)
      day = '0' + day;

    return [year, month, day].join('-');
  }

  // UUpdates the chart display to reflect the passed in data
  function displayChart(data) {
    let chart = new CanvasJS.Chart('graph_container', {
      axisY: {
        suffix: ' mg/dL',
        stripLines: [{
          startValue: 100,
          endValue: Number.MAX_SAFE_INTEGER,
          color: '#ffe5e5'
        },
          {
            startValue: 100,
            endValue: 0,
            color: '#ffffff'
          }],
      },
      toolTip:{
        contentFormatter: function(e) {
          return e.entries[0].dataPoint.x.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
            + '<hr>'
            + e.entries[0].dataPoint.y + ' mg/dL';
        },
      },
      data: [
        {
          type: 'spline',
          dataPoints: data
        }
      ]
    });
    chart.render();
  }

  // get observation resource values
  let query = new URLSearchParams();

  query.set("patient", client.patient.id);
  query.set("_count", '50');
  query.set("date", getToday());
  query.set("code", [
    'http://loinc.org|2339-0',
    'http://loinc.org|88365-2',
    'http://loinc.org|87422-2',
    'http://loinc.org|6689-4'
  ].join(","));

// get the patient's glucose measurement values
  client.request("Observation?" + query, {
    pageLimit: 0,
    flat: true
  }).then(
    function(obs) {
      let values = [];

      for (let i = 0; i < obs.length; i++) {
        let val = chartValues();
        val.x = new Date(obs[i].effectiveDateTime);
        val.y = getQuantityValue(obs[i]);
        values.push(val);
      }

      displayChart(values);
    }
  );
}

// Function to display the patient's name in the index page
function displayPatient(pt) {
  // Helper function to process FHIR resource to get the patient name
  function getPatientName(pt) {
    if (pt.name) {
      let names = pt.name.map(function(name) {
        return name.given.join(' ') + ' ' + name.family;
      });
      return names.join(' / ')
    } else {
      return 'anonymous';
    }
  }

  document.getElementById('patient_name').innerHTML = getPatientName(pt);
}

// endregion

// region Page Code

// create patient object to store the user's data
var userPatient = defaultPatient();

// once fhir client is authorized then the following functions can be executed
FHIR.oauth2.ready().then(function(client) {

  // Get patient object and then display its demographics info in the banner
  client.request(`Patient/${client.patient.id}`).then(
    function(patient) {
      displayPatient(patient);
      //console.log(JSON.stringify(patient));
    }
  );

  // Display the patient's measurements for today
  refreshChart();

  // Event listener when the submit button is clicked to call the function that will create a new observation
  document.getElementById('button_submit').addEventListener('click', submitData);

  }).catch(console.error);

// endregion
