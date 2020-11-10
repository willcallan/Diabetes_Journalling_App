// --- CODE CREDIT: All project files were modified from Georgia Tech Cs6440 Lab 3.2, Fall2020 ---

// Adapted from the cerner smart on fhir guide. updated to utilize client.js v2 library and FHIR R4

// Create a fhir client based on the sandbox environment and test patient
const client = new FHIR.client({
  serverUrl: "https://r4.smarthealthit.org",
  tokenResponse: {
    patient: "326b4675-0bc8-4dbd-b406-a5564c282401"
  }
});

// create an observation object to initialize the observation
function obs_data() {
  return {
    measurement: '',
    units: '',
    last_meal_time: '',
    last_meal_carbs: '',
    symptoms: [],
    medication: '',
    notes: '',
  };
}

// Function to display the patient's name in the index page
function displayPatient(pt) {
  document.getElementById('patient_name').innerHTML = getPatientName(pt);
}

// Helper function to process fhir resource to get the patient name
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

// Helper function to get quantity and unit from an observation resource
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

// TODO: function that takes in the data from the input fields and creates and posts an observation
function submitData() {
  let ob = obs_data();
  ob.measurement = document.getElementById('input_glucose_measurement').value;
  ob.units = document.getElementById('input_measurement_unit').value;

  // Do nothing if the user did not fill out the measurement details
  if (ob.measurement === '' || ob.units === '') {
    alert('Fill out the Glucose Measurement and Measurement Units fields.')
    return;
  }

  return;
}

// ------ CODE START ------

// Get patient object and then display its demographics info in the banner
client.request(`Patient/${client.patient.id}`).then(
  function(patient) {
    displayPatient(patient);
    console.log(patient);
  }
);

// Event listener when the submit button is clicked to call the function that will create a new observation
document.getElementById('button_submit').addEventListener('click', submitData);
