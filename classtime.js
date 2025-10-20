let pageTitle = "";
let scheduleMap = new Map();
let currentScheduleData = null;

let mod = false;
let showTimeline = true;

let specialSubTimer = false;

// Load schedule from JSON files
async function loadSchedule() {
    const currentDate = new Date();
    
    // Calculate the Sunday of the current week
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysUntilSunday = dayOfWeek; // Days to subtract to get to Sunday
    const sunday = new Date(currentDate);
    sunday.setDate(currentDate.getDate() - daysUntilSunday);
    
    const year = sunday.getFullYear();
    const month = String(sunday.getMonth() + 1).padStart(2, '0');
    const day = String(sunday.getDate()).padStart(2, '0');
    const weekIdentifier = `${year}-${month}-${day}`;
    
    try {
        // Try to load weekly schedule first
        const weeklyResponse = await fetch(`./schedules/${weekIdentifier}.json`);
        if (weeklyResponse.ok) {
            currentScheduleData = await weeklyResponse.json();
            mod = true;
            console.log(`Loaded modified schedule for week: ${weekIdentifier}`);
        } else {
            throw new Error('Weekly schedule not found');
        }
    } catch (error) {
        try {
            // Fall back to normal schedule
            const normalResponse = await fetch('./schedules/normal.json');
            if (normalResponse.ok) {
                currentScheduleData = await normalResponse.json();
                mod = false;
                console.log('Loaded normal schedule');
            } else {
                throw new Error('Normal schedule not found');
            }
        } catch (normalError) {
            console.error('Failed to load any schedule:', normalError);
            // Fallback to hardcoded schedule if JSON files fail
            currentScheduleData = null;
        }
    }
    
    // Update timeline display based on schedule metadata
    if (currentScheduleData && currentScheduleData.metadata) {
        if (currentScheduleData.metadata.showTimeline !== undefined) {
            showTimeline = currentScheduleData.metadata.showTimeline;
        }
        if (currentScheduleData.metadata.specialSubTimer !== undefined) {
            specialSubTimer = currentScheduleData.metadata.specialSubTimer;
        }
    }
}

// Convert JSON schedule to scheduleMap format
function processScheduleData() {
    if (!currentScheduleData) {
        updateTimeMapLegacy(new Date()); // Fallback to hardcoded
        return;
    }
    
    const currentTime = new Date();
    const year = currentTime.getFullYear();
    const month = currentTime.getMonth();
    const day = currentTime.getDate();
    
    // Clear existing schedule
    scheduleMap.clear();
    
    // Process each day
    for (const [dayName, events] of Object.entries(currentScheduleData)) {
        if (dayName === 'metadata') continue;
        
        const dayEvents = [];
        
        // Handle both array format (events) and object format (with bannerText)
        let eventsArray = events;
        if (Array.isArray(events)) {
            eventsArray = events;
        } else if (events.events) {
            // If it's an object with events array and other properties like bannerText
            eventsArray = events.events;
            // Store the banner text for later use
            scheduleMap.set(`${dayName}_bannerText`, events.bannerText);
        }
        
        for (const event of eventsArray) {
            const timeStr = event.time;
            let eventDay = day;
            let actualTimeStr = timeStr;
            
            // Handle next day notation (+1)
            if (timeStr.includes('+1')) {
                eventDay = day + 1;
                actualTimeStr = timeStr.replace('+1', '');
            }
            
            // Parse time (HH:MM format)
            const [hours, minutes] = actualTimeStr.split(':').map(Number);
            
            dayEvents.push({
                date: new Date(year, month, eventDay, hours, minutes),
                name: event.event
            });
        }
        
        scheduleMap.set(dayName, dayEvents);
    }
    
    // Handle modified schedule display
    if (mod && currentScheduleData.metadata) {
        const metadata = currentScheduleData.metadata;
        if (metadata.bannerText) {
            // Banner text will be updated in getNextEvent function
        }
    }
}

// Initialize schedule loading
loadSchedule().then(() => {
    processScheduleData();
});

if (!showTimeline) {
    document.body.classList.add("hide-timeline");
}
else {
    document.body.classList.remove("hide-timeline");
}

setInterval(() => updateSchedule(), 200); // calls update every 200 ms

function updateSchedule() {
    // getting the date
    let currentTime = new Date();
    // enter custom dates here in the format currentTime = new Date("2024-11-07T16:00:00Z");

    let currentDay = dayOfWeek(currentTime.getDay());
    let currentHour = currentTime.getHours();
    let currentMinute = currentTime.getMinutes()
    let currentSecond = currentTime.getSeconds();

    // force refresh at 12:00:00 AM in case of special updates
    if (currentHour === 0 && currentMinute === 0 && currentSecond === 0 && currentTime.getMilliseconds() <= 400) {
        location.reload();
    }

    // calculating time difference
    let nextEvent = getNextEvent(currentTime);
    let timeDifference = nextEvent.date - currentTime;
    timeDifference = Math.floor(timeDifference / 1000); // total seconds until next event
    let seconds = timeDifference % 60;
    timeDifference = Math.floor(timeDifference / 60);
    let minutes = timeDifference % 60;
    timeDifference = Math.floor(timeDifference / 60);
    let hours = timeDifference;

    let days;
    if (hours >= 24) {
        days = Math.floor(hours / 24);
        hours = hours % 24;
    }

    // formatting the actual countdown string
    let disableSeconds = document.getElementById('enable-short').checked;

    let timeString;
    if (days > 0) {
        timeString = `${days}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    else if (disableSeconds && (getNextEvent(currentTime)).date - currentTime >= 300000) {
        if (hours > 0) {
            timeString = `${hours.toString() + ":"}${minutes.toString().padStart(2, '0')}`;
        }
        else {
            timeString = `${"0:"}${minutes.toString().padStart(2, '0')}`;
        }
    }
    else {
        timeString = `${(hours === 0 ? "" : hours.toString() + ":")}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // fancy subtext below the main one for lab blocks if people don't have a lab but do have the main block (example A2 but NOT A2 Lab)
    let labMinutes = 0;
    let labHours = 0;

    let regBlock = 50;
    let labBlock = 90;

    // Get block lengths from schedule metadata if available
    if (currentScheduleData && currentScheduleData.metadata) {
        if (currentScheduleData.metadata.regBlock !== undefined) {
            regBlock = currentScheduleData.metadata.regBlock;
        }
        if (currentScheduleData.metadata.labBlock !== undefined) {
            labBlock = currentScheduleData.metadata.labBlock;
        }
    }
    
    let timeString2 = "";
    let eventStr = nextEvent.name.toString();

    let specialEvent = new Date("2024-11-08T01:00:00Z");
    // Get special event from schedule metadata if available
    if (currentScheduleData && currentScheduleData.metadata && currentScheduleData.metadata.specialEvent) {
        specialEvent = new Date(currentScheduleData.metadata.specialEvent.date);
    }
    let specTimeDifference = specialEvent - currentTime;
    if (specialSubTimer && specTimeDifference >= 0) {
        specTimeDifference = Math.floor(specTimeDifference / 1000); // total seconds until special event
        let specSeconds = specTimeDifference % 60;
        specTimeDifference = Math.floor(specTimeDifference / 60);
        let specMinutes = specTimeDifference % 60;
        specTimeDifference = Math.floor(specTimeDifference / 60);
        let specHours = specTimeDifference;

        let specTimeString = `${(specHours === 0 ? "" : specHours.toString() + ":")}${specMinutes.toString().padStart(2, '0')}:${specSeconds.toString().padStart(2, '0')}`;

        let specialEventText = "Special Event";
        if (currentScheduleData && currentScheduleData.metadata && currentScheduleData.metadata.specialEvent) {
            specialEventText = currentScheduleData.metadata.specialEvent.description || "Special Event";
        }

        document.getElementById("txt2").innerHTML = `${specTimeString}<br><span class="sub-text">Left before ${specialEventText}</span>`
    }
    else if ((hours * 60 + minutes) >= (labBlock - regBlock) && eventStr.substring(eventStr.length - 3) === "Lab") { // if lab block comes after main block
        labMinutes = minutes - (labBlock - regBlock);
        labHours = hours;
        if (labMinutes < 0 && labHours >= 1) {
            labMinutes += 60;
            labHours -= 1;
        }

        if (disableSeconds && (labHours * 60 + labMinutes >= 5)) {
            if (labHours > 0) {
                timeString2 = `${labHours.toString() + ":"}${labMinutes.toString().padStart(2, '0')}}`;
            }
            else {
                timeString2 = `${"0:"}${labMinutes.toString().padStart(2, '0')}`;
            }
        }

        else {
            timeString2 = `${(labHours === 0 ? "" : labHours.toString() + ":")}${labMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        document.getElementById("txt2").innerHTML = `${timeString2}<br><span class="sub-text">Left of ${eventStr.substring(3,5)} only</span>`;
    }
    else if (eventStr.includes("Lunch") && !mod) { // countdown during lunch for after lunch lab
        labMinutes = minutes + (labBlock - regBlock);
        
        if (labMinutes >= 60) {
            labMinutes -= 60;
            labHours += 1;
        }

        if (disableSeconds && (labHours * 60 + labMinutes >= 5)) {
            if (labHours > 0) {
                timeString2 = `${labHours.toString() + ":"}${labMinutes.toString().padStart(2, '0')}}`;
            }
            else {
                timeString2 = `${"0:"}${labMinutes.toString().padStart(2, '0')}`;
            }
        }
        
        else {
            timeString2 = `${(labHours === 0 ? "" : labHours.toString() + ":")}${labMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (currentDay === "Tuesday")
            document.getElementById("txt2").innerHTML = `${timeString2}<br><span class="sub-text">Left of Lunch for G2 only</span>`;

        else if (currentDay === "Wednesday")
            document.getElementById("txt2").innerHTML = `${timeString2}<br><span class="sub-text">Left of Lunch for E3 only</span>`;

        else if (currentDay === "Thursday")
            document.getElementById("txt2").innerHTML = `${timeString2}<br><span class="sub-text">Left of Lunch for F4 only</span>`;

        else
            document.getElementById("txt2").innerHTML = ``;
    }
    else if ((hours * 60 + minutes) >= regBlock && eventStr.substring(6, 9) === "Lab") { // if lab block comes before main block (only after lunch)
        labMinutes = minutes - regBlock;
        labHours = hours;
        
        if (labMinutes < 0 && labHours >= 1) {
            labMinutes += 60;
            labHours -= 1;
        }

        if (disableSeconds && (labHours * 60 + labMinutes >= 5)) {
            if (labHours > 0) {
                timeString2 = `${labHours.toString() + ":"}${labMinutes.toString().padStart(2, '0')}}`;
            }
            else {
                timeString2 = `${"0:"}${labMinutes.toString().padStart(2, '0')}`;
            }
        }
        
        else {
            timeString2 = `${(labHours === 0 ? "" : labHours.toString() + ":")}${labMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        document.getElementById("txt2").innerHTML = `${timeString2}<br><span class="sub-text">Left of Lunch for ${eventStr.substring(3,5)} only</span>`;
    }

    else if (eventStr.includes("before H") || eventStr.includes("of H") || eventStr.includes("Transition (H") || eventStr.includes("of I")) { // before check timer (completely separate)
        let hrsBeforeCheck = 0;
        let minBeforeCheck = 0;

        if (eventStr.includes("before H")) {
            hrsBeforeCheck = hours + 3;
            minBeforeCheck = minutes + 45;
        }
        else if (eventStr.includes("of H")) {
            hrsBeforeCheck = hours + 2;
            minBeforeCheck = minutes + 5;
        }
        else if (eventStr.includes("of Transition (H")) {
            hrsBeforeCheck = hours + 1;
            minBeforeCheck = minutes + 55;
        }
        else {
            hrsBeforeCheck = hours;
            minBeforeCheck = minutes + 15;
        }

        if (minBeforeCheck >= 60) {
            minBeforeCheck -= 60;
            hrsBeforeCheck += 1;
        }

        if (disableSeconds && (hrsBeforeCheck * 60 + minBeforeCheck >= 5)) {
            if (hrsBeforeCheck > 0) {
                timeString2 = `${hrsBeforeCheck.toString() + ":"}${minBeforeCheck.toString().padStart(2, '0')}`;
            }
            else {
                timeString2 = `${"0:"}${minBeforeCheck.toString().padStart(2, '0')}`;
            }
        }
        
        else {
            timeString2 = `${(hrsBeforeCheck === 0 ? "" : hrsBeforeCheck.toString() + ":")}${minBeforeCheck.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        document.getElementById("txt2").innerHTML = `${timeString2}<br><span class="sub-text">Left before Check</span>`;
    }
    else { // turn off the text
        document.getElementById("txt2").innerHTML = `<span class="sub-text"></span>`;
    }

    document.getElementById("txt").innerHTML = `${timeString}<br><span class="sub-text">Left ${nextEvent.name}</span>`; // countdown text that replaces "Loading..."
    
    if (pageTitle !== timeString) { // tab timer
        if (eventStr.includes("Transition")) {
            document.title = `Transition: ${timeString}`;
            pageTitle = `Transition: ${timeString}`;
        }
        else if (eventStr.includes("of Check")) {
            document.title = `Check: ${timeString}`;
            pageTitle = `Check: ${timeString}`;
        }
        else {
            document.title = timeString;
            pageTitle = timeString;
        }
    }
}

function getNextEvent(dateTime) { // finds the next event
    let currentTime = dateTime === undefined ? new Date() : dateTime;

    // Process schedule data if we have it, otherwise fall back to legacy
    if (currentScheduleData) {
        processScheduleData();
    } else {
        updateTimeMapLegacy(currentTime);
    }

    let day = dayOfWeek(currentTime.getDay());
    
    // Update banner based on schedule type
    if (mod && currentScheduleData && currentScheduleData.metadata) {
        let bannerText = day;
        
        // Check for day-specific banner text first
        const dayBannerText = scheduleMap.get(`${day}_bannerText`);
        if (dayBannerText) {
            bannerText = day + ` (${dayBannerText})`;
        } 
        // Fall back to global banner text if no day-specific text
        else if (currentScheduleData[day].bannerText) {
            bannerText = day + ` (${currentScheduleData[day].bannerText})`;
        } 
        // Fall back to description
        else if (currentScheduleData[day].bannerTextn) {
            bannerText = day + ` (${currentScheduleData[day].bannerText})`;
        }
        
        document.getElementById("banner").innerText = bannerText;
    } else if (!mod) {
        document.getElementById("banner").innerText = day;
    }

    let events = scheduleMap.get(day);
    return events.find(event => event.date > currentTime);
}

function dayOfWeek(number) {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return daysOfWeek[number];
}

function formatTime(dateTime) { // technical formatting stuff
    let hours = (dateTime.getHours()) % 12;
    if (hours === 0) {
        hours = 12;
    }
    return hours.toString().padStart(2, '0') + ":" + dateTime.getMinutes().toString().padStart(2, '0');
}

function isAtBottom(element) {
    return element.scrollTop - (element.scrollHeight - element.clientHeight) > -1;
}
