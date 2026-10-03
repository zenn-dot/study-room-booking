const API = "http://localhost:3000";


// -------------------------
// GET ROOMS
// -------------------------

async function loadRooms() {

    const container = document.getElementById("roomsContainer");

    if (!container) {
        return;
    }

    try {

        const response = await fetch(API + "/rooms");

        const rooms = await response.json();

        container.innerHTML = "";

        rooms.forEach(function(room) {

            const card = document.createElement("div");

            card.className = "room-card";

            card.innerHTML = `
                <h3>Room ${room.number}</h3>

                <p>
                    Capacity: ${room.capacity} people
                </p>

                <label>
                    Select time:
                </label>

                <select id="room-${room.id}">
                    <option value="09:00-10:00">
                        09:00–10:00
                    </option>

                    <option value="10:00-11:00">
                        10:00–11:00
                    </option>

                    <option value="13:00-14:00">
                        13:00–14:00
                    </option>

                    <option value="15:00-16:00">
                        15:00–16:00
                    </option>
                </select>

                <button onclick="bookRoom(${room.id})">
                    Book
                </button>
            `;

            container.appendChild(card);
        });

    } catch (error) {

        console.log("Error:", error);

        container.innerHTML =
            "<p>Could not load rooms.</p>";
    }
}


// -------------------------
// POST BOOKING
// -------------------------

async function bookRoom(roomId) {

    const select =
        document.getElementById("room-" + roomId);

    const time = select.value;

    const booking = {
        room_id: roomId,
        time: time
    };

    try {

        const response = await fetch(API + "/bookings", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(booking)
        });


        const data = await response.json();


        if (response.ok) {

            alert("Room booked successfully!");

        } else {

            alert(data.message);
        }

    } catch (error) {

        console.log("Error:", error);

        alert("Server error.");
    }
}


// -------------------------
// GET MY BOOKINGS
// -------------------------

async function loadBookings() {

    const container =
        document.getElementById("bookingsContainer");

    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(API + "/bookings");

        const bookings =
            await response.json();


        container.innerHTML = "";


        if (bookings.length === 0) {

            container.innerHTML =
                "<p>You have no bookings.</p>";

            return;
        }


        bookings.forEach(function(booking) {

            const item =
                document.createElement("div");

            item.className = "booking";


            item.innerHTML = `
                <div>

                    <h3>
                        Room ${booking.room_number}
                    </h3>

                    <p>
                        ${booking.time}
                    </p>

                </div>

                <button
                    class="cancel-button"
                    onclick="cancelBooking(${booking.id})">

                    Cancel

                </button>
            `;


            container.appendChild(item);
        });


    } catch (error) {

        console.log("Error:", error);

        container.innerHTML =
            "<p>Could not load bookings.</p>";
    }
}


// -------------------------
// DELETE BOOKING
// -------------------------

async function cancelBooking(id) {

    try {

        const response =
            await fetch(API + "/bookings/" + id, {

                method: "DELETE"

            });


        if (response.ok) {

            alert("Booking cancelled.");

            loadBookings();

        } else {

            alert("Could not cancel booking.");
        }


    } catch (error) {

        console.log("Error:", error);
    }
}


// -------------------------
// PAGE LOAD
// -------------------------

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadRooms();

        loadBookings();

    }
);