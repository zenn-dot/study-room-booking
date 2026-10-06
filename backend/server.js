import http from 'http'
import mysql from 'mysql2/promise'

const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'study_room_booking'
})

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'application/json')

    if (req.method === 'OPTIONS') {
        res.statusCode = 204
        res.end()
        return
    }

    try {

        if (req.method === 'GET' && req.url === '/rooms') {
            const [rooms] = await db.execute(
                'SELECT id, name, capacity FROM rooms'
            )
            const result = rooms.map(function (room) {
                return {
                    id: room.id,
                    number: room.name.replace('Room ', ''),
                    capacity: room.capacity
                }
            })

            res.end(JSON.stringify(result))
            return
        }

        if (req.method === 'GET' && req.url === '/bookings') {

            const [bookings] = await db.execute(
                `SELECT
                    bookings.id,
                    bookings.user_id,
                    rooms.name,
                    DATE_FORMAT(bookings.date, '%Y-%m-%d') AS date,
                    bookings.start_time,
                    bookings.end_time
                FROM bookings
                JOIN rooms ON bookings.room_id = rooms.id`
            )

            const result = bookings.map(function (booking) {
                return {
                    id: booking.id,
                    room_number: booking.name.replace('Room ', ''),
                    date: booking.date,
                    time: booking.start_time.slice(0, 5) + '-' + booking.end_time.slice(0, 5),
                    room_type: 'Study Room',
                    mine: booking.user_id === 1
                }
            })

            res.end(JSON.stringify(result))
            return
        }

        if (req.method === 'GET' && req.url === '/users') {
            const [users] = await db.execute(
                'SELECT * FROM users'
            )

            res.end(JSON.stringify(users))
            return
        }

        if (req.method === 'GET' && req.url === '/schedule') {
            const [dbRooms] = await db.execute(
                'SELECT id, name, capacity FROM rooms'
            )
            const [bookings] = await db.execute(
                `SELECT
                    bookings.id,
                    bookings.room_id,
                    bookings.user_id,
                    bookings.start_time,
                    bookings.end_time
                FROM bookings
                WHERE bookings.date = CURDATE()`
            )

            const timeSlots = [
                '09:00-10:00',
                '10:00-11:00',
                '11:00-12:00',
                '12:00-13:00',
                '14:00-15:00',
                '15:00-16:00'
            ]

            const rooms = dbRooms.map(function (room) {
            const roomBookings = bookings.filter(function (booking){
                    return booking.room_id === room.id
            })

            const slots = timeSlots.map(function (time){
            const [startTime, endTime] = time.split('-')
            const booking = roomBookings.find(function (booking) {
            const bookedStart = booking.start_time.slice(0, 5)
            const bookedEnd = booking.end_time.slice(0, 5)

                    return bookedStart === startTime &&
                               bookedEnd === endTime
            })

            let state = 'free'

            if (booking) {
                if (booking.user_id === 1) {
                    state = 'mine'
                } else {
                    state = 'booked'
                }
            }

            return {
                    id: time,
                    label: time,
                    state: state
                    }
                })

            return {
                    id: room.id,
                    number: room.name.replace('Room ', ''),
                    capacity: room.capacity,
                    image: '',
                    type: 'Study Room',
                    note: 'Quiet study space',
                    line: 'Study Room',
                    eq: 'people',
                    equipment: 'Study Space',
                    slots: slots
                }
            })

            const myBookings = bookings
                .filter(function (booking) {
                    return booking.user_id === 1
                })
                .map(function (booking) {
                    return {
                        id: booking.id,
                        room_number: dbRooms.find(
                            room => room.id === booking.room_id
                        ).name.replace('Room ', ''),
                        room_type: 'Study Room',
                        time: booking.start_time.slice(0, 5) +
                            '-' +
                            booking.end_time.slice(0, 5),
                        mine: true
                    }
                })

            let availableSlots = 0
            for (const room of rooms) {
                for (const slot of room.slots) {
                    if (slot.state === 'free') {
                        availableSlots++
                    }
                }
            }
            const today = new Date()
            const date = {
                day: today.toLocaleDateString('en-GB', {
                    weekday: 'short'
                }).toUpperCase(),
                number: today.getDate(),
                label: today.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })
            }
            res.end(JSON.stringify({
                rooms: rooms,
                myBookings: myBookings,
                date: date,
                availableSlots: availableSlots,
                bookingHours: '09:00 - 16:00'
            }))

            return
        }

        if (req.method === 'POST' && req.url === '/bookings') {
            let body = ''
            req.on('data', function (chunk) {
                body += chunk
            })
            req.on('end', async function () {

                try {
                    const booking = JSON.parse(body)
                    const [startTime, endTime] = booking.time.split('-')
                    const [existing] = await db.execute(
                        `SELECT id
                         FROM bookings
                         WHERE room_id = ?
                         AND date = CURDATE()
                         AND start_time < ?
                         AND end_time > ?`,
                        [
                            booking.room_id,
                            endTime,
                            startTime
                        ]
                    )

                    if (existing.length > 0) {
                        res.statusCode = 409
                        res.end(JSON.stringify({
                            error: 'This time is already booked'
                        }))

                        return
                    }

                    const [result] = await db.execute(
                        `INSERT INTO bookings
                        (room_id, user_id, date, start_time, end_time)
                        VALUES (?, ?, CURDATE(), ?, ?)`,
                        [
                            booking.room_id,
                            1,
                            startTime,
                            endTime
                        ]
                    )

                    const [rooms] = await db.execute(
                        'SELECT name FROM rooms WHERE id = ?',
                        [booking.room_id]
                    )

                    res.end(JSON.stringify({
                        message: 'Booking received',
                        id: result.insertId,
                        room: rooms[0].name.replace('Room ', ''),
                        timeLabel: booking.time
                    }))

                } catch (error) {
                    console.error(error)
                    res.statusCode = 500
                    res.end(JSON.stringify({
                        error: 'Booking failed'
                    }))
                }
            })

            return
        }
        if (req.method === 'DELETE' && req.url.startsWith('/bookings/')) {
            const id = req.url.split('/')[2]
            await db.execute(
                'DELETE FROM bookings WHERE id = ?',
                [id]
            )

            res.end(JSON.stringify({
                message: 'Booking deleted'
            }))
            return
        }

        res.statusCode = 404
        res.end(JSON.stringify({
            error: 'Route not found'
        }))

    } catch (error) {
        console.error(error)
        res.statusCode = 500
        res.end(JSON.stringify({
            error: 'Server error'
        }))
    }
})

server.listen(3000, function () {
    console.log('Server is running on port 3000')
})