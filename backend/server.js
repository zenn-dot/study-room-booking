import http from 'http'
import mysql from 'mysql'

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


})

server.listen(3000,()=>{
    console.log('Server is runnig on port 3000')
})