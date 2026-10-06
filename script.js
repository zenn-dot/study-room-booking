// Node.js серверінің мекенжайы.
let API_URL = 'http://localhost:3000';
if (location.protocol === 'http:') {
    API_URL = 'http://' + location.hostname + ':3000';
}
let scheduleDate = null;
let myBookings = [];
let rooms = [];
let selectedRoom = null;
let selectedTime = null;
let completedBooking = null;
let cancelBookingId = null;
let savingBooking = false;

// Серверге сұрау жіберіп, жауапты тексеру.
async function apiRequest(path, method = 'GET', body = null) {
    const options = { method: method, cache: 'no-store' };
    if (body !== null) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
    }
    const response = await fetch(API_URL + path, options);
    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error('Server error: ' + response.status);
    }
    if (!response.ok) {
        let message = 'Server error: ' + response.status;
        if (data && data.error) {
            message = data.error;
        }
        throw new Error(message);
    }
    return data;
}

// Қате хабарын көрсету; бет мәзірі жұмысын жалғастырады.
function showError(message) {
    document.getElementById('api-message').textContent = message;
}

// Брондарды серверден жаңарту.
async function loadScheduleData() {
    const data = await apiRequest('/schedule');
    rooms = data.rooms;
    myBookings = data.myBookings;
    scheduleDate = data.date;
    document.getElementById('availability').textContent = data.availableSlots + ' available slots';
    document.getElementById('booking-hours').textContent = data.bookingHours;
}

// Белгішенің HTML кодын жасау.
function icon(name) {
    return '<svg class="i"><use href="#icon-' + name + '"/></svg>';
}

// Бөлменің уақытын тізімнен табу.
function findTimeSlot(room, time) {
    if (room) {
        for (const slot of room.slots) {
            if (slot.id === time) {
                return slot;
            }
        }
    }
    return null;
}

// Нөмірі бойынша бөлмені табу.
function findRoom(id) {
    for (const room of rooms) {
        if (room.id === id) {
            return room;
        }
    }
    return null;
}

// Барлық бетке ортақ HTML қосу, содан кейін батырмаларды қосу.
async function createLayout() {
    const response = await fetch('layout.html');
    if (!response.ok) {
        throw new Error('Could not load layout.html');
    }
    document.body.insertAdjacentHTML('afterbegin', await response.text());
    document.body.appendChild(document.querySelector('footer'));

    const currentPage = location.pathname.split('/').pop();
    for (const link of document.querySelectorAll('nav .links a, #menu a')) {
        if (link.getAttribute('href') === currentPage) {
            link.setAttribute('aria-current', 'page');
        }
    }

    document.getElementById('open-menu').addEventListener('click', openMenu);
    document.getElementById('close-menu').addEventListener('click', closeMenu);
    document.getElementById('menu').addEventListener('cancel', function (event) {
        event.preventDefault();
        closeMenu();
    });
    document.getElementById('back-to-top').addEventListener('click', function () {
        window.scrollTo(0, 0);
    });
    updateClock();
    setInterval(updateClock, 1000);
}

// Мәзірді ашып, бетті айналдыруды тоқтату.
function openMenu() {
    const menu = document.getElementById('menu');
    const cursor = document.getElementById('glass-cursor');
    if (cursor) {
        menu.appendChild(cursor);
    }
    menu.showModal();
    document.getElementById('open-menu').setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    document.getElementById('close-menu').focus();
}

// Мәзірді жауып, бетті айналдыруды қосу.
function closeMenu() {
    document.getElementById('menu').close();
    const cursor = document.getElementById('glass-cursor');
    if (cursor) {
        document.body.appendChild(cursor);
    }
    document.getElementById('open-menu').setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.getElementById('open-menu').focus();
}

// Ағымдағы уақытты жаңарту.
function updateClock() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit'
    });
}

// Бөлме карточкаларын көрсету.
function showRooms(containerId, count) {
    let html = '';
    for (let index = 0; index < Math.min(count, rooms.length); index++) {
        const room = rooms[index];
        html += `<a class="card" href="schedule.html?room=${room.id}">
            <img src="${room.image}" alt="${room.type}" loading="lazy">
            <div class="t"><div><div class="n">ROOM ${room.number}</div>
                <h3>${room.line}</h3><p>${room.type} — ${room.note}</p></div>
                <div class="m"><span>${icon('people')}${room.capacity} SEATS</span>
                <span>VIEW ROOM ${icon('arrow')}</span></div></div></a>`;
    }
    document.getElementById(containerId).innerHTML = html;
}

// Бөлме, күн және уақыт таңдауларын көрсету.
function showSchedule() {
    const room = findRoom(selectedRoom);
    let roomButtons = '';
    for (const item of rooms) {
        roomButtons += `<button class="d" data-room="${item.id}" aria-pressed="${item.id === selectedRoom}">
            ROOM<b>${item.number}</b></button>`;
    }
    const dateButtons = `<button class="d" disabled aria-pressed="true">
        ${scheduleDate.day}<b>${scheduleDate.number}</b></button>`;
    let slotButtons = '';
    for (const slot of room.slots) {
        const state = slot.state;
        let disabled = '';
        let label = 'AVAILABLE';
        if (state !== 'free') {
            disabled = 'disabled';
            label = '<span class="dot"></span>BOOKED';
            if (state === 'mine') {
                label = '<span class="dot green"></span>YOURS';
            }
        }
        slotButtons += `<button class="s ${state}" data-time="${slot.id}" ${disabled}
            aria-pressed="${slot.id === selectedTime}">${slot.label}<small>${label}</small></button>`;
    }

    let panel = '<p>Select an available time to continue.</p>';
    if (completedBooking) {
        panel = `<div class="panel" role="status"><div class="ok">
            <svg class="checkmark" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28"/><path d="M20 33l8 8 17-18"/></svg>
            <div><div class="eyebrow">Booked successfully</div>
            <h3>Room ${completedBooking.room}</h3><p>${completedBooking.dateLabel} · ${completedBooking.timeLabel}</p></div></div>
            <a class="btn dk" href="bookings.html">My bookings ${icon('arrow')}</a></div>`;
    } else if (selectedTime !== null) {
        const selectedSlot = findTimeSlot(room, selectedTime);
        panel = `<div class="panel"><div><div class="eyebrow">Your selection</div>
            <h3>Room ${room.number} · ${selectedSlot.label}</h3><p>${scheduleDate.label}</p></div>
            <button class="btn fill" id="book-room">Book room ${icon('bm')}</button></div>`;
    }

    document.getElementById('det').innerHTML = `
        <div class="pic"><img src="${room.image}" alt="${room.type}">
            <div class="over"><span>${icon(room.eq)}${room.equipment}</span><span>${icon('wifi')}Wi-Fi</span><span>${icon('plug')}Power Outlets</span><span>${icon('people')}${room.capacity} seats</span></div></div>
        <div><div class="eyebrow">Room details</div><h2>Room ${room.number}</h2>
            <p class="sub">${room.type} · Capacity ${room.capacity}</p>
            <div class="lab">${icon('bm')} SELECT A ROOM</div><div class="scr">${roomButtons}</div>
            <div class="lab">${icon('cal')} TODAY</div><div class="scr">${dateButtons}</div>
            <div class="lab">${icon('clock')} SELECT A TIME</div><div class="slots">${slotButtons}</div>${panel}</div>`;

}

// Бронды Node.js арқылы SQL базасына сақтау.
async function bookRoom() {
    if (savingBooking || selectedTime === null) {
        return;
    }
    savingBooking = true;
    const button = document.getElementById('book-room');
    button.disabled = true;
    button.textContent = 'Booking...';
    showError('');
    const time = selectedTime;
    const dateLabel = scheduleDate.label;
    const room = findRoom(selectedRoom);
    let created = false;
    try {
        const result = await apiRequest('/bookings', 'POST', {
            room_id: room.id,
            time: time
        });
        created = true;
        completedBooking = {
            room: result.room,
            dateLabel: dateLabel,
            timeLabel: result.timeLabel
        };
        selectedTime = null;
        await loadScheduleData();
    } catch (error) {
        if (created) {
            showError('Booking saved, but the list could not refresh. Reload the page.');
        } else {
            // Басқа адам уақытты алып қойса, жаңа кестені көрсету.
            try {
                await loadScheduleData();
                const slot = findTimeSlot(findRoom(room.id), time);
                if (!slot || slot.state !== 'free') {
                    selectedTime = null;
                }
            } catch (refreshError) {
                // Жаңарту сәтсіз болса, негізгі брондау қатесін көрсету.
            }
            let message = error.message;
            if (message === 'Failed to fetch') {
                message = 'Cannot reach the server on port 3000.';
            }
            showError(message);
        }
    } finally {
        savingBooking = false;
        showSchedule();
    }
}

// Бронды серверден жою және тізімді жаңарту.
async function cancelBooking(id) {
    const button = document.querySelector('[data-confirm="' + id + '"]');
    if (button) {
        button.disabled = true;
    }
    showError('');
    let deleted = false;
    try {
        await apiRequest('/bookings/' + id, 'DELETE');
        deleted = true;
        cancelBookingId = null;
        await loadScheduleData();
        showBookings();
    } catch (error) {
        let message = 'Could not cancel booking. Check the server and try again.';
        if (deleted) {
            message = 'Booking deleted, but the list could not refresh. Reload the page.';
        }
        showError(message);
        if (button) {
            button.disabled = false;
        }
    }
}

// Брондарды көрсету және жою батырмаларын қосу.
function showBookings() {
    let html = '';
    for (const booking of myBookings) {
        let buttons = `<button class="btn dk" data-cancel="${booking.id}">Cancel booking</button>`;
        if (cancelBookingId === booking.id) {
            buttons = `<span>Cancel this booking?</span>
                <button class="btn fill" data-confirm="${booking.id}">Yes, cancel</button>
                <button class="btn dk" id="keep-booking">Keep</button>`;
        }
        html += `<div class="bk"><h3>Room ${booking.room_number}</h3>
            <div><div class="tm">${booking.time}</div></div>
            <div>${booking.room_type}</div><div class="cx">${buttons}</div></div>`;
    }
    if (myBookings.length === 0) {
        html = '<div class="empty">No bookings yet. <a href="rooms.html">Choose a room</a> to reserve your first slot.</div>';
    }
    document.getElementById('bks').innerHTML = html;
}

// Бір click оқиғасы барлық брондау батырмаларын басқарады.
// closest() белгіше басылғанда да оның сыртындағы button элементін табады.
function handleBookingClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) {
        return;
    }
    if (button.hasAttribute('data-room')) {
        selectedRoom = Number(button.dataset.room);
        selectedTime = null;
        completedBooking = null;
        showSchedule();
    } else if (button.hasAttribute('data-time')) {
        selectedTime = button.dataset.time;
        completedBooking = null;
        showSchedule();
    } else if (button.id === 'book-room') {
        bookRoom();
    } else if (button.hasAttribute('data-cancel')) {
        cancelBookingId = Number(button.dataset.cancel);
        showBookings();
    } else if (button.hasAttribute('data-confirm')) {
        cancelBooking(Number(button.dataset.confirm));
    } else if (button.id === 'keep-booking') {
        cancelBookingId = null;
        showBookings();
    }
}

// Беттерді серверден келген мәліметпен толтыру.
async function loadPage() {
    showError('Loading rooms and bookings...');
    try {
        await loadScheduleData();
        const filename = location.pathname.split('/').pop() || 'homepage.html';
        if (filename === 'homepage.html') {
            showRooms('featured', 4);
        } else if (filename === 'rooms.html') {
            showRooms('grid', rooms.length);
        } else if (filename === 'schedule.html') {
            if (rooms.length === 0) {
                document.getElementById('det').textContent = 'No rooms available.';
            } else {
                const parameters = new URLSearchParams(location.search);
                const roomId = Number(parameters.get('room'));
                selectedRoom = rooms[0].id;
                if (findRoom(roomId)) {
                    selectedRoom = roomId;
                }
                showSchedule();
            }
        } else if (filename === 'bookings.html') {
            showBookings();
        }
        showError('');
        prepareAnimations();
        updateScrollEffects();
    } catch (error) {
        let message = error.message;
        if (message === 'Failed to fetch') {
            message = 'Cannot reach ' + API_URL + '. Open http://localhost:3000 and try again.';
        }
        showError(message);
        document.getElementById('availability').textContent = 'Unavailable';
    }
}

// Алдымен HTML, содан кейін әсерлер мен сервер деректерін жүктеу.
async function startPage() {
    try {
        await createLayout();
        document.addEventListener('click', handleBookingClick);
        startEffects();
        await loadPage();
    } catch (error) {
        const message = document.createElement('p');
        message.id = 'api-message';
        message.textContent = 'Cannot load the page layout. Open http://localhost:3000.';
        document.body.appendChild(message);
    }
}

startPage();

