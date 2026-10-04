import http from 'http'
import mysql from 'mysql2/promise'


const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'study_room_booking'
})

const server = http.createServer(async (req, res)=>{
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers','Content-Type')
if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
}

  if (req.method === 'GET' && req.url === '/rooms'){
    const [rooms] = await db.execute(
        'SELECT id, name, capacity FROM rooms'
    )

    const result = rooms.map(function(room) {
        return {
            id: room.id,
            number: room.name.replace('Room ', ''),
            capacity: room.capacity
        }
    })

    res.end(JSON.stringify(result))
    return
}


  if (req.method === 'GET' && req.url === '/bookings'){
    const [bookings] = await db.execute(
        `SELECT
            bookings.id,
            rooms.name,
            bookings.start_time,
            bookings.end_time
        FROM bookings
        JOIN rooms ON bookings.room_id = rooms.id`
    )

    const result = bookings.map(function(booking) {
        return {
            id: booking.id,
            room_number: booking.name.replace('Room ', ''),
            time: booking.start_time.slice(0, 5) + '-' + booking.end_time.slice(0, 5)
        }
    })

    res.end(JSON.stringify(result))
    return
}


 if (req.method === 'GET' && req.url === '/users'){
    const [users] = await db.execute(
        'SELECT * FROM users'
    )
    res.end(JSON.stringify(users))
    return
}


  if (req.method === 'POST' && req.url === '/bookings'){
    let body = ''

    req.on('data', chunk => {
        body += chunk
    })

    req.on('end', async () => {
        const booking = JSON.parse(body)

        const [startTime, endTime] = booking.time.split('-')

        await db.execute(
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

        res.end(JSON.stringify({
            message: 'Booking received'
        }))
    })

    return
}

  if (req.method === 'DELETE' && req.url.startsWith('/bookings')){
  const id = req.url.split('/')[2]
  await db.execute(
    'DELETE FROM bookings WHERE id = ?',
    [id]
  )
  res.end('Booking deleted')
  return
}



})

server.listen(3000,()=>{
    console.log('Server is runnig on port 3000')
})