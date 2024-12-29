const redis = require('redis');
const client = redis.createClient({
    url: 'redis://alice:foobared@awesome.redis.server:6379'
});

client.on('error', (err) => {
    console.error('Redis error:', err);
});

client.connect();
client.disconnect();
module.exports = client;
