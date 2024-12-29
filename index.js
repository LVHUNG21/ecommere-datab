const express = require('express');
const app = express();
const PORT = 8088;
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const warehouseRouter = require('./routers/warehouseRouter');

const authRouter = require('./routers/authRouter');
const productRouter = require('./routers/productRouter');
const cartRouter = require('./routers/cartRouter');
const orderRouter = require('./routers/orderRouter');
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
require('dotenv').config();

const connection = mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '123',
    database: 'ecommerce' 
});
global.connection=connection;
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL');
});


app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// app.use((req, res, next) => {
//     console.log(`${req.method} ${req.url}`);
//     console.log('Headers:', req.headers);
//     console.log('Body:', req.body);
//     next();
// });


app.use('/auth', authRouter(connection));
app.use('/warehouse', warehouseRouter(connection));
app.use('/products', productRouter(connection));
app.use('/cart', cartRouter(connection));
app.use('/order', orderRouter(connection));

app.post('/addCarrier', (req, res) => {
    const {  carrier_name, tracking_number, created_at } = req.body;

    if (!carrier_name || !tracking_number || !created_at) {
        return res.status(400).json({ error: 'Missing required information' });
    }

    const checkQuery = 'SELECT * FROM carrier WHERE carrier_name = ? OR tracking_number = ?';
    connection.query(checkQuery, [carrier_name, tracking_number], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error checking for duplicate data' });
        }

        if (results.length > 0) {
            return res.status(409).json({ error: 'Carrier ID or tracking number already exists' });
        }

        const insertQuery = 'INSERT INTO carrier ( carrier_name, tracking_number, created_at) VALUES (?, ?, ?)';
        connection.query(insertQuery, [ carrier_name, tracking_number, created_at], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error adding carrier' });
            }
            res.status(201).json({ message: 'Carrier added successfully', carrier: {  carrier_name, tracking_number, created_at } });
        });
    });
});

module.exports = connection;