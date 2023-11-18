const locations = [
    { name: "DUR", latitude: 36.018921, longitude: -78.920620 },
    { name: "MOR", latitude: 35.732057, longitude: -81.685756 }
];

const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };

function fetchSunriseSunset() {
    const morganton = document.getElementById("mor");

    const selectedLocation = morganton.checked ? "MOR" : "DUR";
    
    const apiUrl = `https://api.sunrise-sunset.org/json?lat=${locations.find(loc => loc.name === selectedLocation).latitude}&lng=${locations.find(loc => loc.name === selectedLocation).longitude}&formatted=0`;

    fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            const sunriseUTC = data.results.sunrise;
            const sunsetUTC = data.results.sunset;

            const sunriseLocal = new Date(sunriseUTC);
            const sunsetLocal = new Date(sunsetUTC);

            const sunriseInfo = document.getElementById("sunrise").children[1];
            const sunsetInfo = document.getElementById("sunset").children[1];
            sunriseInfo.innerHTML = sunriseLocal.toLocaleTimeString([], timeOptions);
            sunsetInfo.innerHTML = sunsetLocal.toLocaleTimeString([], timeOptions);

            sunriseInfo.parentElement.style.top = convertTimeToPercentage(sunriseLocal.toLocaleTimeString([], timeOptions));
            sunsetInfo.parentElement.style.top = convertTimeToPercentage(sunsetLocal.toLocaleTimeString([], timeOptions));

        })
        .catch(error => {
            console.error(`Error fetching sunrise and sunset data for ${selectedLocation}:`, error);
        });
}

// call sunrise/sunset function during page load
window.addEventListener('load', () => {
    const morganton = document.getElementById("mor");
    morganton.checked = getCheckboxStateFromCookie();
    fetchSunriseSunset();
});

// update when ticked
document.getElementById("mor").addEventListener("change", fetchSunriseSunset);
document.getElementById("sunriseSunset").addEventListener("change", fetchSunriseSunset);

function convertTimeToPercentage(timeString) {
  // Parse the input time string
  const timeRegex = /^(\d{1,2}):(\d{2}) (AM|PM)$/;
  const match = timeString.match(timeRegex);

  if (!match) {
    return "Invalid time format. Please use 'hh:mm AM/PM' format.";
  }

  let [, hours, minutes, period] = match;

  // Convert hours to 24-hour format
  hours = parseInt(hours, 10);
  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  // Calculate the time in minutes
  const totalMinutes = hours * 60 + parseInt(minutes, 10);

  // Calculate the percentage between 6 AM and 11 PM
  const startMinutes = 6 * 60;
  const endMinutes = 23 * 60;
  const percentage = Math.min(Math.max(((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100, 0), 100);

  return percentage.toFixed(2) + "%";
}