// Бөлмелер туралы мәліметтер мен белгішелер.
const roomStyles = [
    { id: 110, type: 'Quiet Study Hall', capacity: 30, image: 'room1.png', eq: 'win', line: 'Silence,<br>in full light.', note: 'Daylight on two sides. Low-noise zone.' },
    { id: 112, type: 'Seminar Room', capacity: 28, image: 'room2.png', eq: 'wb', line: 'Room to<br>think aloud.', note: 'Soft light and a wide board.' },
    { id: 116, type: 'Daylight Studio', capacity: 26, image: 'room3.png', eq: 'win', line: 'Work where<br>the sun is.', note: 'Floor-to-ceiling glass, city view.' },
    { id: 200, type: 'Group Study Room', capacity: 30, image: 'room4.png', eq: 'board', line: 'Built for<br>big ideas.', note: 'Navy wall, wall-mounted display.' },
    { id: 203, type: 'Collaboration Room', capacity: 28, image: 'room6.png', eq: 'display', line: 'Where teams<br>take shape.', note: 'Open layout around an 86" display.' },
    { id: 205, type: 'Focus Studio', capacity: 25, image: 'product.png', eq: 'win', line: 'Heads down.<br>Ideas up.', note: 'Bright, calm, desks in clean rows.' },
];
const ICONS = {
    menu: '<path d="M3 8h18M8 16h13"/>', close: '<path d="M5 5l14 14M19 5L5 19"/>',
    arrow: '<path d="M4 12h16M14 6l6 6-6 6"/>', up: '<path d="M12 20V4M6 10l6-6 6 6"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14c2.5.7 3.5 2.7 3.5 6"/>',
    board: '<rect x="2.5" y="4" width="19" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
    wifi: '<path d="M2.5 9a14 14 0 0119 0M5.5 12.5a9.5 9.5 0 0113 0M8.5 16a5 5 0 017 0"/><circle cx="12" cy="19.5" r=".6"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="1"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    bm: '<path d="M6 3.5h12v17l-6-4.5-6 4.5z"/>',
    win: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
    wb: '<rect x="2.5" y="4" width="19" height="13" rx="1"/><path d="M6 21l2-4M18 21l-2-4"/>',
};


const navigation = [
    ['Rooms', 'rooms.html'],
    ['Schedule', 'schedule.html'],
    ['My Bookings', 'bookings.html'],
    ['About', 'about.html']
];
const hours = [9, 10, 11, 12, 13, 14, 15, 16];
// Node.js серверінің мекенжайы.
const API_URL = 'http://localhost:3000';
const dates = [new Date()];
let rooms = [];
let bookings = [];
let savingBooking = false;

// Серверге сұрау жіберіп, жауапты тексеру.
async function apiRequest(path, method = 'GET', body = null) {
    const options = { method: method };
    if (body !== null) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify(body);
    }
    const response = await fetch(API_URL + path, options);
    if (!response.ok) {
        throw new Error('Server error: ' + response.status);
    }
    // DELETE мәтін қайтарады, басқа сұраулар JSON қайтарады.
    if (method === 'DELETE') {
        return response.text();
    }
    return response.json();
}

// Қате хабарын көрсету; бет мәзірі жұмысын жалғастырады.
function showError(message) {
    document.getElementById('api-message').textContent = message;
}

// Брондарды серверден жаңарту.
async function loadBookings() {
    bookings = await apiRequest('/bookings');
}

// Уақытты минутқа айналдыру.
function timeMinutes(time) {
    const parts = time.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
}

// Пайдаланушының ағымдағы таңдаулары.
let selectedRoom = 200;
let selectedDate = 0;
let selectedHour = null;
let completedBooking = null;
let cancelBookingId = null;

// Белгішенің HTML кодын жасау.
function icon(name) {
    return '<svg class="i"><use href="#' + name + '"/></svg>';
}

// Бір таңбалы санның алдына нөл қосу.
function pad(number) {
    return String(number).padStart(2, '0');
}

// Күнді оқуға ыңғайлы түрде көрсету.
function dateLabel(date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric'
    });
}

// Бір сағаттық уақыт аралығын көрсету.
function timeLabel(hour) {
    return pad(hour) + ':00–' + pad(hour + 1) + ':00';
}

// Нөмірі бойынша бөлмені табу.
function findRoom(id) {
    for (const room of rooms) {
        if (room.id === id) {
            return room;
        }
    }
}

// Сервердегі бронмен қиылысатын уақытты бос емес деп белгілеу.
function slotState(roomId, dateIndex, hour) {
    const room = findRoom(roomId);
    for (const booking of bookings) {
        if (String(booking.room_number) === room.number) {
            const times = booking.time.split('-');
            if (hour * 60 < timeMinutes(times[1]) && (hour + 1) * 60 > timeMinutes(times[0])) {
                return 'booked';
            }
        }
    }
    return 'free';
}

// Барлық бетке мәзір мен төменгі бөлікті қосу.
function createLayout() {
    let symbols = '';
    for (const name in ICONS) {
        symbols += '<symbol id="' + name + '" viewBox="0 0 24 24">' + ICONS[name] + '</symbol>';
    }

    let links = '';
    const currentPage = location.pathname.split('/').pop();
    for (const item of navigation) {
        let active = '';
        if (item[1] === currentPage) {
            active = ' aria-current="page"';
        }
        links += '<a href="' + item[1] + '"' + active + '>' + item[0] + '</a>';
    }

    document.body.insertAdjacentHTML('afterbegin', `
        <svg width="0" height="0" style="position:absolute"><defs>${symbols}</defs></svg>
        <nav><div class="wrap">
            <a class="logo" href="homepage.html">SPACE</a>
            <div class="links">${links}</div>
            <button id="open-menu" type="button" aria-controls="menu" aria-expanded="false">MENU ${icon('menu')}</button>
        </div></nav>
        <div class="menu" id="menu" hidden>
            <button id="close-menu" aria-label="Close menu">${icon('close')}</button>
            <a href="homepage.html">Home</a>${links}
        </div>
    `);

    document.body.insertAdjacentHTML('beforeend', `
        <footer><div class="wrap">
            <div class="ft"><h2>Need a<br>quiet hour?</h2>
                <button class="badge" id="back-to-top" aria-label="Back to top">
                    <svg viewBox="0 0 200 200"><defs>
                    <path id="badge-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"/></defs>
                    <text><textPath href="#badge-circle" textLength="486" lengthAdjust="spacing">BOOK A ROOM · STUDY WELL · FIND YOUR FOCUS · </textPath></text></svg>
                    ${icon('up')}</button></div>
            <div class="fc">
                <div><div class="eyebrow">Hours</div><p>Mon–Fri 08:00–20:00<br>Sat 10:00–16:00</p></div>
                <div><div class="eyebrow">Rooms</div><p><a href="rooms.html">110 · 112 · 116<br>200 · 203 · 205</a></p></div>
                <div><div class="eyebrow">Local time</div><p id="clock"></p></div>
                <div><div class="eyebrow">Availability</div><p><span class="dot green"></span> <span id="availability"></span></p></div>
            </div>
            <div class="fw"><span>S</span><span>P</span><span>A</span><span>C</span><span>E</span></div>
            <div class="fb">© 2026 SPACE</div>
        </div></footer>
    `);

    document.getElementById('open-menu').addEventListener('click', openMenu);
    document.getElementById('close-menu').addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });
    document.getElementById('back-to-top').addEventListener('click', function () {
        window.scrollTo(0, 0);
    });
    document.body.insertAdjacentHTML('afterbegin', '<p id="api-message" role="status"></p>');
    updateClock();
    setInterval(updateClock, 1000);
}

// Мәзірді ашып, бетті айналдыруды тоқтату.
function openMenu() {
    document.getElementById('menu').hidden = false;
    document.getElementById('open-menu').setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    document.getElementById('close-menu').focus();
}

// Мәзірді жауып, бетті айналдыруды қосу.
function closeMenu() {
    document.getElementById('menu').hidden = true;
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

// Бүгінгі бос уақыттарды санау.
function updateAvailability() {
    let freeSlots = 0;
    for (const room of rooms) {
        for (const hour of hours) {
            if (slotState(room.id, 0, hour) === 'free') {
                freeSlots++;
            }
        }
    }
    document.getElementById('availability').textContent = freeSlots + ' available slots';
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
    let dateButtons = '';
    for (let index = 0; index < dates.length; index++) {
        const day = dates[index].toLocaleDateString('en-US', { weekday: 'short' });
        dateButtons += `<button class="d" disabled aria-pressed="${index === selectedDate}">
            ${day}<b>${pad(dates[index].getDate())}</b></button>`;
    }
    let slotButtons = '';
    for (const hour of hours) {
        const state = slotState(selectedRoom, selectedDate, hour);
        let disabled = '';
        let label = 'AVAILABLE';
        if (state !== 'free') {
            disabled = 'disabled';
            label = state === 'mine' ? '<span class="dot green"></span>YOURS' : '<span class="dot"></span>BOOKED';
        }
        slotButtons += `<button class="s ${state}" data-hour="${hour}" ${disabled}
            aria-pressed="${hour === selectedHour}">${timeLabel(hour)}<small>${label}</small></button>`;
    }

    let panel = '<p>Select an available time to continue.</p>';
    if (completedBooking) {
        panel = `<div class="panel" role="status"><div class="ok">
            <svg class="checkmark" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28"/><path d="M20 33l8 8 17-18"/></svg>
            <div><div class="eyebrow">Booked successfully</div>
            <h3>Room ${completedBooking.room}</h3><p>${dateLabel(dates[completedBooking.dateIndex])} · ${timeLabel(completedBooking.h)}</p></div></div>
            <a class="btn dk" href="bookings.html">My bookings ${icon('arrow')}</a></div>`;
    } else if (selectedHour !== null) {
        panel = `<div class="panel"><div><div class="eyebrow">Your selection</div>
            <h3>Room ${room.number} · ${timeLabel(selectedHour)}</h3><p>${dateLabel(dates[selectedDate])}</p></div>
            <button class="btn fill" id="book-room">Book room ${icon('bm')}</button></div>`;
    }

    let equipment = 'Large Windows';
    if (room.eq === 'wb') equipment = 'Whiteboard';
    if (room.eq === 'board') equipment = 'Interactive Board';
    if (room.eq === 'display') equipment = 'Interactive Display';

    document.getElementById('det').innerHTML = `
        <div class="pic"><img src="${room.image}" alt="${room.type}">
            <div class="over"><span>${icon(room.eq)}${equipment}</span><span>${icon('wifi')}Wi-Fi</span><span>${icon('plug')}Power Outlets</span><span>${icon('people')}${room.capacity} seats</span></div></div>
        <div><div class="eyebrow">Room details</div><h2>Room ${room.number}</h2>
            <p class="sub">${room.type} · Capacity ${room.capacity}</p>
            <div class="lab">${icon('bm')} SELECT A ROOM</div><div class="scr">${roomButtons}</div>
            <div class="lab">${icon('cal')} TODAY</div><div class="scr">${dateButtons}</div>
            <div class="lab">${icon('clock')} SELECT A TIME</div><div class="slots">${slotButtons}</div>${panel}</div>`;

    for (const button of document.querySelectorAll('[data-room]')) {
        button.addEventListener('click', function () {
            selectedRoom = Number(button.dataset.room);
            selectedHour = null;
            completedBooking = null;
            showSchedule();
        });
    }
    for (const button of document.querySelectorAll('[data-hour]')) {
        button.addEventListener('click', function () {
            selectedHour = Number(button.dataset.hour);
            completedBooking = null;
            showSchedule();
        });
    }
    const bookButton = document.getElementById('book-room');
    if (bookButton) {
        bookButton.addEventListener('click', bookRoom);
    }
    updateAvailability();
    prepareAnimations();
}

// Бронды Node.js арқылы SQL базасына сақтау.
async function bookRoom() {
    if (savingBooking || selectedHour === null) return;
    savingBooking = true;
    const button = document.getElementById('book-room');
    button.disabled = true;
    button.textContent = 'Booking...';
    showError('');
    const hour = selectedHour;
    const room = findRoom(selectedRoom);
    let created = false;
    try {
        // Жіберер алдында сервердегі бос уақытты қайта тексеру.
        await loadBookings();
        if (slotState(room.id, 0, hour) !== 'free') {
            selectedHour = null;
            showSchedule();
            throw new Error('This time is already booked. Choose another time.');
        }
        await apiRequest('/bookings', 'POST', {
            room_id: room.id,
            time: pad(hour) + ':00-' + pad(hour + 1) + ':00'
        });
        created = true;
        completedBooking = { room: room.number, dateIndex: 0, h: hour };
        selectedHour = null;
        await loadBookings();
    } catch (error) {
        if (created) {
            showError('Booking saved, but the list could not refresh. Reload the page.');
        } else {
            showError(error.message === 'Failed to fetch' ? 'Cannot reach the server on port 3000.' : error.message);
        }
    } finally {
        savingBooking = false;
        showSchedule();
    }
}

// Бронды серверден жою және тізімді жаңарту.
async function cancelBooking(id) {
    const button = document.querySelector('[data-confirm="' + id + '"]');
    if (button) button.disabled = true;
    showError('');
    let deleted = false;
    try {
        await apiRequest('/bookings/' + id, 'DELETE');
        deleted = true;
        cancelBookingId = null;
        await loadBookings();
        showBookings();
    } catch (error) {
        showError(deleted ? 'Booking deleted, but the list could not refresh. Reload the page.' : 'Could not cancel booking. Check the server and try again.');
        if (button) button.disabled = false;
    }
}

// Брондарды көрсету және жою батырмаларын қосу.
function showBookings() {
    bookings.sort(function (first, second) {
        return first.time.localeCompare(second.time);
    });
    let html = '';
    for (const booking of bookings) {
        let roomType = 'Study room';
        for (const room of rooms) {
            if (room.number === String(booking.room_number)) roomType = room.type;
        }
        let buttons = `<button class="btn dk" data-cancel="${booking.id}">Cancel booking</button>`;
        if (cancelBookingId === booking.id) {
            buttons = `<span>Cancel this booking?</span>
                <button class="btn fill" data-confirm="${booking.id}">Yes, cancel</button>
                <button class="btn dk" id="keep-booking">Keep</button>`;
        }
        html += `<div class="bk"><h3>Room ${booking.room_number}</h3>
            <div><div class="tm">${booking.time}</div></div>
            <div>${roomType}</div><div class="cx">${buttons}</div></div>`;
    }
    if (bookings.length === 0) {
        html = '<div class="empty">No bookings yet. <a href="rooms.html">Choose a room</a> to reserve your first slot.</div>';
    }
    document.getElementById('bks').innerHTML = html;
    for (const button of document.querySelectorAll('[data-cancel]')) {
        button.addEventListener('click', function () {
            cancelBookingId = Number(button.dataset.cancel);
            showBookings();
        });
    }
    for (const button of document.querySelectorAll('[data-confirm]')) {
        button.addEventListener('click', function () {
            cancelBooking(Number(button.dataset.confirm));
        });
    }
    const keepButton = document.getElementById('keep-booking');
    if (keepButton) {
        keepButton.addEventListener('click', function () {
            cancelBookingId = null;
            showBookings();
        });
    }
    updateAvailability();
    prepareAnimations();
}

// Элементтерге анимация класын қосу.
function prepareAnimations() {
    const items = document.querySelectorAll('.head, .card, .ft, .fw');
    for (const item of items) {
        item.classList.add('reveal');
    }
    const letters = document.querySelectorAll('.fw span');
    for (let index = 0; index < letters.length; index++) {
        letters[index].style.transitionDelay = index * 90 + 'ms';
    }
}

// Меңзер мен айналдыру әсерлерін іске қосу.
function startEffects() {
    document.body.insertAdjacentHTML('afterbegin',
        '<div class="glass-cursor" id="glass-cursor"></div>');

    const statement = document.querySelector('.statement');
    if (statement) {
        const words = statement.textContent.split(' ');
        statement.textContent = '';
        for (const word of words) {
            const span = document.createElement('span');
            span.textContent = word + ' ';
            span.style.opacity = '0.16';
            statement.appendChild(span);
        }
    }

    prepareAnimations();
    window.addEventListener('scroll', updateScrollEffects);
    window.addEventListener('resize', updateScrollEffects);
    document.addEventListener('mouseover', updateScrollEffects);
    document.addEventListener('mouseout', updateScrollEffects);
    updateScrollEffects();

    const cursor = document.getElementById('glass-cursor');
    let mouseX = -100;
    let mouseY = -100;
    let cursorX = -100;
    let cursorY = -100;

    document.addEventListener('mousemove', function (event) {
        document.body.classList.add('custom-cursor');
        mouseX = event.clientX;
        mouseY = event.clientY;
        const target = event.target.closest('a, button:not(:disabled)');
        let label = '';
        if (target) {
            if (target.classList.contains('card')) label = 'VIEW';
            if (target.id === 'book-room' || target.hasAttribute('data-hour')) label = 'BOOK';
            if (target.hasAttribute('data-cancel') || target.hasAttribute('data-confirm')) label = 'CANCEL';
        }
        cursor.textContent = label;
        cursor.classList.toggle('hover', Boolean(target));
        cursor.classList.toggle('label', label !== '');
    });

    function moveCursor() {
        // Шеңберді меңзерге қарай біртіндеп жылжыту.
        cursorX += (mouseX - cursorX) * 0.18;
        cursorY += (mouseY - cursorY) * 0.18;
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        requestAnimationFrame(moveCursor);
    }
    moveCursor();
}

// Бетті айналдырғанда көрініс әсерлерін жаңарту.
function updateScrollEffects() {
    const screenHeight = window.innerHeight;
    const scrollPosition = window.scrollY;

    for (const item of document.querySelectorAll('.reveal')) {
        if (item.getBoundingClientRect().top < screenHeight * 0.88) {
            item.classList.add('visible');
        }
    }

    let lightNavigation = true;
    for (const section of document.querySelectorAll('header.hero, section, footer')) {
        const position = section.getBoundingClientRect();
        if (position.top <= 36 && position.bottom > 36) {
            lightNavigation = section.tagName === 'SECTION';
        }
    }
    document.querySelector('nav').classList.toggle('light', lightNavigation);

    const marquee = document.getElementById('mqt');
    if (marquee) {
        marquee.style.transform = 'translateX(' + (-scrollPosition * 0.45) + 'px)';
    }
    for (const number of document.querySelectorAll('.gh')) {
        const position = number.parentElement.getBoundingClientRect();
        const distance = position.top + position.height / 2 - screenHeight / 2;
        number.style.transform = 'translateY(' + (distance * -0.25) + 'px)';
    }
    for (const image of document.querySelectorAll('.card > img, .pic > img')) {
        const container = image.parentElement;
        const position = container.getBoundingClientRect();
        const offset = (position.top + position.height / 2 - screenHeight / 2) / screenHeight * -28;
        let zoom = 1.1;
        if (container.classList.contains('pic')) zoom = 1.08;
        if (container.matches('.card:hover')) zoom = 1.14;
        image.style.transform = 'translateY(' + offset + 'px) scale(' + zoom + ')';
    }
    const statement = document.querySelector('.statement');
    if (statement) {
        const top = statement.getBoundingClientRect().top;
        const progress = (screenHeight * 0.85 - top) / (screenHeight * 0.5);
        for (let index = 0; index < statement.children.length; index++) {
            let opacity = progress * statement.children.length - index;
            opacity = Math.max(0, Math.min(1, opacity));
            statement.children[index].style.opacity = 0.16 + opacity * 0.84;
        }
    }
}

// Беттерді серверден келген мәліметпен толтыру.
async function loadPage() {
    showError('Loading rooms and bookings...');
    try {
        const serverRooms = await apiRequest('/rooms');
        for (const item of serverRooms) {
            const number = String(item.number);
            let style = { type: 'Study Room', image: 'main.jpg', eq: 'wifi', line: 'Room ' + number, note: 'A space for focused study.' };
            for (const savedStyle of roomStyles) {
                if (String(savedStyle.id) === number) style = savedStyle;
            }
            rooms.push({
                id: Number(item.id), number: number, capacity: item.capacity,
                type: style.type, image: style.image, eq: style.eq, line: style.line, note: style.note
            });
        }
        await loadBookings();
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
                if (findRoom(roomId)) selectedRoom = roomId;
                showSchedule();
            }
        } else if (filename === 'bookings.html') {
            showBookings();
        }
        showError('');
        updateAvailability();
        prepareAnimations();
        updateScrollEffects();
    } catch (error) {
        showError('Cannot load rooms or bookings. Start the Node.js server on port 3000, then reload this page.');
        document.getElementById('availability').textContent = 'Unavailable';
    }
}

createLayout();
startEffects();
loadPage();
