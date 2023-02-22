const keys = require('./keys');

//Express App setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

//Postgres Client Setup
const { pool } = require('pg');
const pgClient = new pool({
    host: keys.pgHost,
    port: keys.pgPort,
    database: keys.pgDatabase,
    user: keys.pgUser,
    password: keys.pgPassword
});

pgClient.on("connect", (client) => {
    client
      .query("CREATE TABLE IF NOT EXISTS values (number INT)")
      .catch((err) => console.error(err));
  });

  //Express Client setup
  const redis = require('redis');
  const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    
    retry_strategy: ()=> 1000
    });
    
    const redisPublisher = redisClient.duplicate();

    // Express route handlers
    app.get('/', (req, res) => { res.send('service is live');});
    
    app.get('/values/all', async (req, res) => {
        const values = await pgClient.query('SELECT * from values');
        res.send(values.rows);
    });

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async (req, res) => {
    const index = req.body.index;

    if(parseInt(index) > 40)
    {
        res.send('index too high');
    }

    redisClient.hset('values', index, 'Nothing yet');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({working: true});
});

app.listen(5000, err => {
    console.log('listening at port 5000');
});