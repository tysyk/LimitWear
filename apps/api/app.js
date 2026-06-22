require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./src/config/database');
const { startScheduler } = require('./src/utils/scheduler');

const app = express();

connectDB();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',    require('./src/routes/auth'));
app.use('/api/drops',   require('./src/routes/drops'));
app.use('/api/orders',  require('./src/routes/orders'));
app.use('/api/designs', require('./src/routes/designs'));
app.use('/api/admin',   require('./src/routes/admin'));
app.use('/api/users',   require('./src/routes/users'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

startScheduler();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
