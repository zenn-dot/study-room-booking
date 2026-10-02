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

  if (req.method === 'GET' && req.url === '/rooms'){
    const [rooms] = await db.execute(
        'SELECT * FROM rooms'
    )
    res.end(JSON.stringify(rooms))
    return
  }

  if (req.method === 'GET' && req.url === '/bookings'){
    const [bookings] = await db.execute(
        'SELECT * FROM bookings'
    )
    res.end(JSON.stringify(bookings))
    return
  }

  if (req.method === 'POST' && req.url === '/bookings'){
    let body = ''
    req.on('data', chunk => {
      body += chunk
    })
    req.on('end', async ()  => {
      const booking = JSON.parse(body)
      console.log(booking)
      await dbexecute(
        `INSERT INTO bookings
        (room_id, user_id, date, start_time, end_time)
        VALUES(?, ?, ?, ?, ?)`,
        [
          booking.room_id,
          booking.user_id,
          booking.date,
          booking.start_time,
          booking.end_time
        ]
      )
      res.end('Booking received')
    })
    return
  }

})

server.listen(3000,()=>{
    console.log('Server is runnig on port 3000')
})